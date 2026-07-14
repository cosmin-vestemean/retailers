/**
 * Send a built SALDOC payload to S1 via the existing `setDocument` service.
 * Handles retry/timeout and status transitions on CCCSFTPXML:
 *   PROCESSING → SENT (on success, FINDOC set)
 *   PROCESSING → ERROR (on permanent failure, XMLERROR set)
 */
import fetch from 'node-fetch'

import { buildS1Url } from '../s1-base-url.js'
import { parseS1Json } from '../s1-response.js'

export async function sendOrderToS1({
  app,
  jsonOrder,
  s1BaseUrl,
  retailer,
  orderId,
  cccsftpxmlId,
  duplicateLookup,
  createdDocumentLookup,
  manual = false,
  retries = 2,
  retryDelayMs = 1500
}) {
  const duplicate = await findExistingOrderByNum04({ app, jsonOrder, s1BaseUrl, retailer, duplicateLookup })
  if (duplicate?.lookupError) {
    const message = `Verificare duplicat eșuată pentru nr. comandă ${duplicate.num04} — ${duplicate.lookupError}`
    await markError(app, cccsftpxmlId, message)
    await safeLog(app, {
      retailer,
      orderId,
      cccsftpxml: cccsftpxmlId,
      operation: 'duplicateGuard',
      level: 'error',
      message
    })
    return { success: false, errors: [message] }
  }
  if (duplicate) {
    const message = `Comandă deja existentă: nr. ${duplicate.num04} → FINDOC=${duplicate.findoc}${duplicate.fincode ? ' FINCODE=' + duplicate.fincode : ''}`
    await app.service('CCCSFTPXML').patch(cccsftpxmlId, {
      FINDOC: duplicate.findoc,
      XMLSTATUS: 'SENT',
      XMLERROR: message.slice(0, 4000)
    })
    await safeLog(app, {
      retailer,
      orderId,
      cccsftpxml: cccsftpxmlId,
      operation: 'duplicateGuard',
      level: 'warn',
      message
    })
    return { success: true, id: duplicate.findoc, duplicate: true, fincode: duplicate.fincode }
  }

  const pastDelivery = manual ? null : findPastDeliveryDate(jsonOrder)
  if (pastDelivery) {
    const message = `Dată livrare depășită: DELIVDATE=${pastDelivery.deliveryDate} (astăzi ${pastDelivery.today}) — păstrat pentru trimitere manuală`
    await app.service('CCCSFTPXML').patch(cccsftpxmlId, {
      XMLSTATUS: 'MANUAL',
      XMLERROR: message.slice(0, 4000)
    })
    await safeLog(app, {
      retailer,
      orderId,
      cccsftpxml: cccsftpxmlId,
      operation: 'pastDeliveryGuard',
      level: 'warn',
      message
    })
    return { success: true, held: true, reason: 'pastDeliveryDate', deliveryDate: pastDelivery.deliveryDate }
  }

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await app.service('setDocument').create(
        jsonOrder,
        s1BaseUrl ? { query: { url: s1BaseUrl } } : undefined
      )
      if (res?.success === true && res.id) {
        const createdDocument = await findCreatedDocumentByFindoc({ findoc: res.id, s1BaseUrl, lookup: createdDocumentLookup })
        const message = `Comandă creată: ${createdDocument?.fincode ? 'FINCODE=' + createdDocument.fincode + ' ' : ''}FINDOC=${res.id}${orderId ? ' | Nr. comandă: ' + orderId : ''}`
        await app.service('CCCSFTPXML').patch(cccsftpxmlId, {
          FINDOC: parseInt(res.id),
          XMLSTATUS: 'SENT',
          XMLERROR: ''
        })
        await safeLog(app, {
          retailer,
          orderId,
          cccsftpxml: cccsftpxmlId,
          operation: 'createDocument',
          level: 'success',
          message
        })
        return createdDocument?.fincode
          ? { success: true, id: parseInt(res.id), fincode: createdDocument.fincode }
          : { success: true, id: parseInt(res.id) }
      }
      // S1 returned a structured failure — not retryable
      const errMsg = formatS1Errors(res?.errors) || 'setDocument failed (no id)'
      await markError(app, cccsftpxmlId, errMsg)
      await safeLog(app, {
        retailer,
        orderId,
        cccsftpxml: cccsftpxmlId,
        operation: 'createDocument',
        level: 'error',
        message: errMsg
      })
      return { success: false, errors: res?.errors || [errMsg] }
    } catch (e) {
      lastErr = e
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
    }
  }
  const errMsg = lastErr?.message || 'setDocument transport failure'
  await markError(app, cccsftpxmlId, errMsg)
  await safeLog(app, {
    retailer,
    orderId,
    cccsftpxml: cccsftpxmlId,
    operation: 'createDocument',
    level: 'error',
    message: errMsg
  })
  return { success: false, errors: [errMsg] }
}

async function findCreatedDocumentByFindoc({ findoc, s1BaseUrl, lookup }) {
  const id = parseInt(findoc, 10)
  if (!id) return null
  if (lookup) return lookup({ findoc: id })

  try {
    const sql = 'SELECT TOP 1 FINCODE FROM FINDOC WHERE FINDOC={value}'
    const response = await fetch(buildS1Url('/JS/JSRetailers/runMappingSql', s1BaseUrl), {
      method: 'POST',
      body: JSON.stringify({ sql, value: String(id) })
    })
    const result = await parseS1Json(response, 'runMappingSql')
    if (!result.success || !result.data) return null
    return { findoc: id, fincode: String(result.data) }
  } catch {
    return null
  }
}

async function findExistingOrderByNum04({ app, jsonOrder, s1BaseUrl, retailer, duplicateLookup }) {
  const saldoc = jsonOrder?.DATA?.SALDOC?.[0]
  const num04 = normalizeNum04(saldoc?.NUM04)
  const trdr = parseInt(saldoc?.TRDR || retailer, 10)
  if (!num04 || !trdr) return null

  if (duplicateLookup) return duplicateLookup({ trdr, num04 })

  try {
    const sql = "SELECT TOP 1 CAST(A.FINDOC AS VARCHAR(20)) + '|' + A.FINCODE " +
      'FROM FINDOC A ' +
      'WHERE A.COMPANY=50 AND A.SOSOURCE=1351 AND A.FPRMS=701 AND A.ISCANCEL=0 ' +
      `AND A.TRDR=${trdr} AND A.NUM04={value} ` +
      'ORDER BY A.FINDOC ASC'
    const response = await fetch(buildS1Url('/JS/JSRetailers/runMappingSql', s1BaseUrl), {
      method: 'POST',
      body: JSON.stringify({ sql, value: num04 })
    })
    const result = await parseS1Json(response, 'runMappingSql')
    if (!result.success) throw new Error(result.error || 'runMappingSql failed')
    if (!result.data) return null

    const [findocText, fincode = ''] = String(result.data).split('|')
    const findoc = parseInt(findocText, 10)
    if (!findoc) return null
    return { findoc, fincode, num04 }
  } catch (error) {
    return { lookupError: error.message, num04, trdr }
  }
}

function normalizeNum04(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return ''
  if (parseInt(text, 10) === 0) return ''
  return text
}

function findPastDeliveryDate(jsonOrder) {
  const deliveryDate = normalizeDateOnly(jsonOrder?.DATA?.MTRDOC?.[0]?.DELIVDATE)
  if (!deliveryDate) return null
  const today = businessTodayDateOnly()
  if (deliveryDate < today) return { deliveryDate, today }
  return null
}

function normalizeDateOnly(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return formatDateOnly(iso[1], iso[2], iso[3])

  const dotted = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (dotted) return formatDateOnly(dotted[3], dotted[2], dotted[1])

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function businessTodayDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

function formatDateOnly(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatS1Errors(errors) {
  if (!errors) return ''
  if (typeof errors === 'string') return errors
  if (Array.isArray(errors)) return errors.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ')
  return JSON.stringify(errors)
}

async function markError(app, id, message) {
  try {
    await app.service('CCCSFTPXML').patch(id, { XMLSTATUS: 'ERROR', XMLERROR: (message || '').slice(0, 4000) })
  } catch (e) {
    console.error('[order-sender] failed to mark ERROR:', e.message)
  }
}

async function safeLog(app, { retailer, orderId, cccsftpxml, operation, level, message }) {
  try {
    await app.service('orders-log').create({
      TRDR_CLIENT: 1,
      TRDR_RETAILER: retailer,
      ORDERID: orderId,
      CCCSFTPXML: cccsftpxml,
      OPERATION: operation,
      LEVEL: level,
      MESSAGETEXT: message
    })
  } catch (e) {
    console.error('[order-sender] orders-log insert failed:', e.message)
  }
}
