let _retryRunning = false

export async function retryDoFailures(app, { prefix = 'retry/', limit = 25 } = {}) {
  if (_retryRunning) return { skipped: true, processed: 0, succeeded: 0, failed: 0, errors: [] }
  _retryRunning = true
  const stats = { processed: 0, succeeded: 0, failed: 0, skipped: 0, errors: [] }
  try {
    const doStorage = app.service('do-storage')
    const list = await doStorage.list({ prefix, limit })
    for (const item of list.data || []) {
      const result = await retryDoObject(app, item.key)
      stats.processed += result.processed ? 1 : 0
      stats.succeeded += result.success ? 1 : 0
      stats.failed += result.success === false ? 1 : 0
      stats.skipped += result.skipped ? 1 : 0
      if (result.error) stats.errors.push({ key: item.key, message: result.error })
    }
    return stats
  } finally {
    _retryRunning = false
  }
}

export async function retryDoObject(app, key) {
  const doStorage = app.service('do-storage')
  const object = await doStorage.get({ key })
  const meta = object.metadata || {}
  const doctype = (meta.doctype || 'ORDERS').toUpperCase()

  if (doctype === 'APERAK') {
    return retryAperakObject(app, { key, xml: object.body, metadata: meta })
  }

  if (doctype !== 'ORDERS') {
    return { key, skipped: true, processed: false, error: `Unsupported retry doctype ${doctype}` }
  }
  const filename = meta.filename || filenameFromKey(key)
  const retailer = parseInt(meta.retailer) || 0
  if (!retailer) {
    return { key, skipped: true, processed: false, error: `Cannot retry ${filename}: missing resolved retailer` }
  }

  await ensureSftpXmlRow(app, {
    xml: object.body,
    metadata: meta,
    key
  })
  await doStorage.deleteSuccess(key)
  return { key, processed: true, success: true, deleted: true }
}

async function retryAperakObject(app, { key, xml, metadata }) {
  const { getProvider } = await import('./providers/factory.js')
  const { insertAperakRow } = await import('./scanner.js')
  const doStorage = app.service('do-storage')
  const filename = metadata.filename || filenameFromKey(key)
  try {
    const provider = getProvider({ CODE: metadata.provider })
    const sftpRow = {
      TRDR_RETAILER: parseInt(metadata.retailer) || 0,
      TRDR_CLIENT: parseInt(metadata.trdrclient) || 1
    }
    // insertAperakRow returns false when the APERAK already exists; both cases
    // mean the object no longer needs to live in DO retry.
    await insertAperakRow(app, { xml, file: { name: filename }, sftpRow, provider })
    await doStorage.deleteSuccess(key)
    return { key, processed: true, success: true, deleted: true }
  } catch (e) {
    return { key, processed: true, success: false, error: e.message }
  }
}

async function ensureSftpXmlRow(app, { xml, metadata, key }) {
  const filename = metadata.filename || filenameFromKey(key)
  const retailer = parseInt(metadata.retailer) || 0
  const trdrClient = parseInt(metadata.trdrclient) || 1
  const doctype = (metadata.doctype || 'ORDERS').toUpperCase()
  const service = app.service('CCCSFTPXML')

  const existing = await service.find({ query: { XMLFILENAME: filename, TRDR_RETAILER: retailer, $limit: 1 } })
  if ((existing.total || 0) > 0 || (existing.data && existing.data.length > 0)) {
    const current = existing.data[0]
    await service.patch(current.CCCSFTPXML, {
      XMLSTATUS: 'NEW',
      XMLERROR: ''
    }, { query: { XMLFILENAME: filename, TRDR_RETAILER: retailer } })
    return { ...current, XMLSTATUS: 'NEW', XMLERROR: '' }
  }

  return service.create({
    TRDR_CLIENT: trdrClient,
    TRDR_RETAILER: retailer,
    XMLDATA: xml,
    JSONDATA: '',
    XMLDATE: formatSqlDate(new Date()),
    XMLSTATUS: 'NEW',
    XMLERROR: '',
    XMLFILENAME: filename,
    EDIDOCTYPE: doctype
  })
}

function filenameFromKey(key) {
  return String(key || '').split('/').pop() || 'xml-file.xml'
}

function formatSqlDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    '-' + pad(d.getMonth() + 1) +
    '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) +
    ':' + pad(d.getMinutes()) +
    ':' + pad(d.getSeconds())
  )
}