/**
 * Send a built SALDOC payload to S1 via the existing `setDocument` service.
 * Handles retry/timeout and status transitions on CCCSFTPXML:
 *   PROCESSING → SENT (on success, FINDOC set)
 *   PROCESSING → ERROR (on permanent failure, XMLERROR set)
 */
import fetch from 'node-fetch'

import { buildS1Url } from '../s1-base-url.js'

export async function sendOrderToS1({
  app,
  jsonOrder,
  s1BaseUrl,
  retailer,
  orderId,
  cccsftpxmlId,
  duplicateLookup,
  retries = 2,
  retryDelayMs = 1500
}) {
  const duplicate = await findExistingOrderByNum04({ app, jsonOrder, s1BaseUrl, retailer, duplicateLookup })
  if (duplicate?.lookupError) {
    const message = `Duplicate NUM04 guard lookup failed: ${duplicate.lookupError}`
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
    const message = `Duplicate NUM04 guard: existing FINDOC=${duplicate.findoc} FINCODE=${duplicate.fincode || ''} NUM04=${duplicate.num04}`
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

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await app.service('setDocument').create(
        jsonOrder,
        s1BaseUrl ? { query: { url: s1BaseUrl } } : undefined
      )
      if (res?.success === true && res.id) {
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
          message: `Document created: FINDOC=${res.id}`
        })
        return { success: true, id: parseInt(res.id) }
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
    const result = await response.json()
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
