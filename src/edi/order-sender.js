/**
 * Send a built SALDOC payload to S1 via the existing `setDocument` service.
 * Handles retry/timeout and status transitions on CCCSFTPXML:
 *   PROCESSING → SENT (on success, FINDOC set)
 *   PROCESSING → ERROR (on permanent failure, XMLERROR set)
 */
export async function sendOrderToS1({
  app,
  jsonOrder,
  s1BaseUrl,
  retailer,
  orderId,
  cccsftpxmlId,
  retries = 2,
  retryDelayMs = 1500
}) {
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
