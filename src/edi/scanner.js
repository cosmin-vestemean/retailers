import fs from 'node:fs/promises'
import path from 'node:path'
import { buildTransport } from './transports/factory.js'
import { getProvider } from './providers/factory.js'
import { buildOrderPayload, formatMappingErrorMessage } from './order-builder.js'
import { sendOrderToS1 } from './order-sender.js'

// Module-level concurrency lock — `setInterval` re-entry is the legacy bug.
let _running = false

// Defaults — tune via env if needed.
const DOWNLOAD_AGE_DAYS = parseInt(process.env.EDI_DOWNLOAD_AGE_DAYS) || 7
const PROCESS_AGE_DAYS = parseInt(process.env.EDI_PROCESS_AGE_DAYS) || 30
const PROCESS_BATCH = parseInt(process.env.EDI_PROCESS_BATCH) || 25

// Legacy SALDOC mapping keys for the order pipeline.
const ORDER_SOSOURCE = 1351
const ORDER_FPRMS = 701
const ORDER_SERIES = 7012

/**
 * One full pass: download new files from every active EDI provider/SFTP row,
 * dedupe + insert into CCCSFTPXML, then process pending NEW rows into SALDOC.
 * Safe to call from setInterval — concurrent calls are skipped.
 */
export async function scanAll(app) {
  if (_running) {
    app.get('logger')?.info?.('[edi-scanner] previous run still in progress, skipping')
    return { skipped: true }
  }
  _running = true
  const stats = { providers: 0, downloaded: 0, inserted: 0, duplicates: 0, backedUp: 0, deletedFromDo: 0, retryBackedUp: 0, processed: 0, held: 0, failed: 0, errors: [] }
  try {
    const configs = await app.service('CCCSFTP').list({ onlyActive: true })

    for (const row of configs.data) {
      stats.providers += 1
      let transport
      try {
        const providerImpl = getProvider({ CODE: row.PROVIDER_CODE, NAME: row.PROVIDER_NAME })
        transport = buildTransport(row, row.PROVIDER_CONNTYPE)
        const dlStats = await downloadAndStore(app, row, providerImpl, transport, configs.data)
        stats.downloaded += dlStats.downloaded
        stats.inserted += dlStats.inserted
        stats.duplicates += dlStats.duplicates
        stats.backedUp += dlStats.backedUp
        stats.deletedFromDo += dlStats.deletedFromDo
        stats.retryBackedUp += dlStats.retryBackedUp
        stats.failed += dlStats.failed
        stats.errors.push(...dlStats.errors)
      } catch (e) {
        stats.errors.push({ retailer: row.TRDR_RETAILER, scope: 'download', message: e.message })
        console.error(`[edi-scanner] download error for retailer ${row.TRDR_RETAILER}:`, e)
      } finally {
        try { await transport?.close() } catch { /* ignore */ }
      }
    }

    // Process orders after all downloads — same retailer list, so a single pass works.
    const procStats = await processPendingOrders(app, configs.data)
    stats.processed += procStats.processed
    stats.held += procStats.held
    stats.failed += procStats.failed
    stats.errors.push(...procStats.errors)

    await logScanSummary(app, stats)
    return stats
  } finally {
    _running = false
  }
}

async function logScanSummary(app, stats) {
  if (!app.services?.['orders-log']) return
  try {
    await app.service('orders-log').create({
      TRDR_CLIENT: 1,
      TRDR_RETAILER: -1,
      ORDERID: '',
      CCCSFTPXML: -1,
      OPERATION: 'system',
      LEVEL: 'info',
      MESSAGETEXT: 'Scanare EDI finalizată: '
        + `RETAILERI=${stats.providers} `
        + `XML_DESCARCATE=${stats.downloaded} `
        + `XML_INSERATE=${stats.inserted} `
        + `DUPLICATE=${stats.duplicates} `
        + `DO_BACKUP=${stats.backedUp} `
        + `DO_STERSE=${stats.deletedFromDo} `
        + `DO_RETRY=${stats.retryBackedUp} `
        + `COMENZI_CREATE=${stats.processed} `
        + `MANUAL=${stats.held} `
        + `ERORI=${stats.failed}`
    })
  } catch (e) {
    console.error('[edi-scanner] scan summary log failed:', e.message)
  }
}

async function downloadAndStore(app, sftpRow, provider, transport, sftpRows = []) {
  const stats = { downloaded: 0, inserted: 0, duplicates: 0, backedUp: 0, deletedFromDo: 0, retryBackedUp: 0, failed: 0, errors: [] }
  // Per provider: scan each supported docType.
  for (const docType of ['orders', 'retann', 'aperak']) {
    const prefixes = provider.filenamePrefixes(docType, sftpRow)
    if (!prefixes || prefixes.length === 0) continue

    const subdir = provider.remoteSubdir(docType)
    const remoteDir = joinRemote(sftpRow.INITIALDIRIN, subdir)
    const localDir = path.join(
      'data',
      provider.code,
      String(sftpRow.TRDR_RETAILER),
      docType
    )
    await fs.mkdir(localDir, { recursive: true })

    let entries
    try {
      entries = await transport.list(remoteDir)
    } catch (e) {
      // Some providers don't expose all subdirs; treat as empty.
      console.warn(`[edi-scanner] list failed for ${remoteDir} (retailer ${sftpRow.TRDR_RETAILER}): ${e.message}`)
      continue
    }

    const cutoff = new Date(Date.now() - DOWNLOAD_AGE_DAYS * 86400_000)
    const matching = entries.filter(
      (e) => prefixes.some((p) => e.name.startsWith(p)) && isXmlLikeFile(e.name) && (!e.modifyTime || e.modifyTime >= cutoff)
    )

    for (const file of matching) {
      const remotePath = joinRemote(remoteDir, file.name)
      const localPath = path.join(localDir, file.name)

      if (docType !== 'aperak') {
        // Dedupe by filename before downloading — skip files already stored.
        const existing = await app.service('CCCSFTPXML').find({ query: { XMLFILENAME: file.name, $limit: 1 } })
        if (existing.total > 0 || (existing.data && existing.data.length > 0)) {
          stats.duplicates += 1
          continue
        }
      }

      let xml = ''
      let doBackup = null
      try {
        await transport.download(remotePath, localPath)
        stats.downloaded += 1
      } catch (e) {
        console.error(`[edi-scanner] download failed for ${remotePath}: ${e.message}`)
        continue
      }

      try {
        xml = await fs.readFile(localPath, 'utf-8')
        doBackup = await backupXml(app, {
          xml,
          fileName: file.name,
          sftpRow,
          provider,
          docType,
          stage: 'incoming',
          sourcePath: remotePath
        })
        if (doBackup?.key) stats.backedUp += 1
        if (docType === 'aperak') {
          const inserted = await insertAperakRow(app, { xml, file, sftpRow, provider })
          if (!inserted) {
            stats.duplicates += 1
            if (doBackup?.key && await deleteDoSuccess(app, doBackup.key)) stats.deletedFromDo += 1
            continue
          }
        } else {
          const insertRow = await resolveInsertSftpRow(app, { xml, sftpRow, provider, docType, sftpRows })
          await insertXmlRow(app, { xml, file, sftpRow: insertRow, provider, docType })
        }
        stats.inserted += 1
        if (doBackup?.key && await deleteDoSuccess(app, doBackup.key)) stats.deletedFromDo += 1
      } catch (e) {
        console.error(`[edi-scanner] parse/insert failed for ${file.name}: ${e.message}`)
        stats.failed += 1
        const errorRetailer = e.routingError ? 0 : sftpRow.TRDR_RETAILER
        stats.errors.push({ retailer: errorRetailer, scope: 'db-insert', file: file.name, message: e.message })
        if (e.routingError) {
          await insertRoutingErrorRow(app, { xml, file, sftpRow, provider, docType, error: e })
          stats.inserted += 1
          if (doBackup?.key && await deleteDoSuccess(app, doBackup.key)) stats.deletedFromDo += 1
          continue
        }
        const retry = await saveRetryXml(app, {
          xml,
          fileName: file.name,
          sftpRow,
          provider,
          docType,
          stage: 'db-insert',
          error: e.message,
          sourcePath: remotePath,
          incomingKey: doBackup?.key
        })
        if (retry?.key) stats.retryBackedUp += 1
      }
    }
  }
  return stats
}

export async function insertAperakRow(app, { xml, file, sftpRow, provider }) {
  const aperak = await provider.parseAperak(xml)
  if (await hasExistingAperak(app, aperak)) return false
  const data = {
    TRDR_CLIENT: sftpRow.TRDR_CLIENT || 1,
    TRDR_RETAILER: sftpRow.TRDR_RETAILER,
    APERAKFILENAME: file.name,
    MESSAGEDATE: aperak.messageDate,
    MESSAGETIME: aperak.messageTime,
    MESSAGEORIGIN: aperak.messageOrigin,
    DOCUMENTREFERENCE: aperak.documentReference,
    DOCUMENTUID: aperak.documentUid,
    SUPPLIERRECEIVERCODE: aperak.supplierReceiverCode,
    DOCUMENTRESPONSE: aperak.documentResponse,
    DOCUMENTDETAIL: aperak.documentDetail
  }

  const document = await findAperakDocument(app, aperak.documentReference)
  if (document) {
    data.FINDOC = parseInt(document.FINDOC, 10)
    data.TRDR_RETAILER = parseInt(document.retailer, 10) || data.TRDR_RETAILER
    if (document.xmlFilename) data.XMLFILENAME = document.xmlFilename
    if (document.xmlSentDate) data.XMLSENTDATE = document.xmlSentDate
  } else {
    data.XMLFILENAME = file.name
  }

  await app.service('CCCAPERAK').create(data)
  return true
}

async function hasExistingAperak(app, aperak) {
  if (!aperak.documentUid) return false
  const existing = await app.service('CCCAPERAK').find({ query: { DOCUMENTUID: aperak.documentUid, $limit: 20 } })
  return (existing.data || []).some((row) =>
    String(row.DOCUMENTRESPONSE || '') === String(aperak.documentResponse || '')
    && String(row.DOCUMENTDETAIL || '') === String(aperak.documentDetail || '')
  )
}

async function findAperakDocument(app, documentReference) {
  const reference = String(documentReference || '').replace(/'/g, "''")
  if (!reference) return null
  const response = await app.service('getDataset1').find({
    query: {
      sqlQuery: "SELECT TOP 1 FORMAT(a.trndate, 'dd.MM.yyyy') TRNDATE, A.FINDOC, A.FINCODE, a.SERIESNUM DocumentReference, CONCAT(B.BGBULSTAT, B.AFM) MessageOrigin, A.TRDR retailer, c.CCCXmlFile xmlFilename, c.CCCXMLSendDate xmlSentDate FROM FINDOC A INNER JOIN TRDR B ON A.TRDR = B.TRDR LEFT JOIN mtrdoc c ON c.findoc = a.findoc WHERE A.SOSOURCE = 1351 AND A.FPRMS = 712 AND A.FINCODE LIKE '%" + reference + "%' AND A.ISCANCEL = 0 ORDER BY A.TRNDATE DESC"
    }
  })
  if (!response.success || !Array.isArray(response.data) || response.data.length === 0) return null
  return response.data[0]
}

async function insertRoutingErrorRow(app, { xml, file, sftpRow, provider, docType, error }) {
  await insertXmlRow(app, {
    xml,
    file,
    sftpRow: { ...sftpRow, TRDR_RETAILER: 0 },
    provider,
    docType,
    status: 'ERROR',
    error: error.message,
    jsonData: JSON.stringify({ routing: error.routingContext || {} })
  })
}

async function insertXmlRow(app, { xml, file, sftpRow, provider, docType, status = 'NEW', error = '', jsonData = '' }) {
  const ediDocType = docType.toUpperCase() // ORDERS | RETANN | APERAK
  await app.service('CCCSFTPXML').create({
    TRDR_CLIENT: sftpRow.TRDR_CLIENT || 1,
    TRDR_RETAILER: sftpRow.TRDR_RETAILER,
    XMLDATA: xml,
    JSONDATA: jsonData,
    XMLDATE: formatSqlDate(file.modifyTime || new Date()),
    XMLSTATUS: status,
    XMLERROR: error.slice(0, 4000),
    XMLFILENAME: file.name,
    EDIDOCTYPE: ediDocType
  })
}

export async function resolveInsertSftpRow(app, { xml, sftpRow, provider, docType, sftpRows }) {
  if (provider.code !== 'docprocess' || docType !== 'orders') return sftpRow
  let parsed
  try {
    parsed = await provider.parseOrder(xml)
  } catch (error) {
    throw routingError(`DocProcess routing error: XML parse failed (${error.message})`, { reason: 'xml_parse_failed' })
  }
  const baseContext = parsed.routingContext || {}
  const gln = String(parsed.shipToGln || parsed.buyerGln || '').trim()
  if (!/^\d{8,14}$/.test(gln)) {
    throw routingError(`DocProcess routing error: missing or invalid GLN (${gln || 'empty'})`, { ...baseContext, reason: 'missing_or_invalid_gln' })
  }

  const candidates = (sftpRows || [])
    .filter((row) => String(row.PROVIDER_CODE || '').toLowerCase() === provider.code)
    .map((row) => parseInt(row.TRDR_RETAILER, 10))
    .filter((trdr) => trdr > 0)
  if (candidates.length === 0) {
    throw routingError(`DocProcess routing error: no active DocProcess retailers for GLN ${gln}`, { ...baseContext, reason: 'no_active_docprocess_retailers', routingGln: gln })
  }

  try {
    const sql = 'SELECT TOP 1 CAST(TRDR AS VARCHAR(20)) FROM TRDBRANCH '
      + `WHERE CCCS1DXGLN='${gln}' AND TRDR IN (${[...new Set(candidates)].join(',')}) `
      + 'ORDER BY TRDR'
    const result = await app.service('getDataset').find({ query: { sqlQuery: sql } })
    const resolved = parseInt(result?.data, 10)
    if (!resolved) {
      throw routingError(`DocProcess routing error: no active retailer match for GLN ${gln}`, { ...baseContext, reason: 'no_active_retailer_match', routingGln: gln })
    }
    if (resolved === parseInt(sftpRow.TRDR_RETAILER, 10)) return sftpRow
    return (sftpRows || []).find((row) => parseInt(row.TRDR_RETAILER, 10) === resolved) || { ...sftpRow, TRDR_RETAILER: resolved }
  } catch (error) {
    if (error.routingError) throw error
    throw routingError(`DocProcess routing error: GLN lookup failed for ${gln} (${error.message})`, { ...baseContext, reason: 'gln_lookup_failed', routingGln: gln })
  }
}

function routingError(message, routingContext = {}) {
  const error = new Error(message)
  error.routingError = true
  error.routingContext = routingContext
  return error
}

async function backupXml(app, { xml, fileName, sftpRow, provider, docType, stage, sourcePath }) {
  const doStorage = getDoStorage(app)
  if (!doStorage || !xml) return null
  try {
    return doStorage.backupXml({
      xml,
      filename: fileName,
      provider: provider.code,
      retailer: sftpRow.TRDR_RETAILER,
      trdrClient: sftpRow.TRDR_CLIENT || 1,
      docType,
      stage,
      sourcePath
    })
  } catch (error) {
    console.error(`[edi-scanner] DO backup failed for ${fileName}: ${error.message}`)
    return null
  }
}

async function saveRetryXml(app, { xml, fileName, sftpRow, provider, docType, stage, error, sourcePath, incomingKey }) {
  const doStorage = getDoStorage(app)
  if (!doStorage || !xml) return null
  try {
    if (incomingKey) {
      return doStorage.moveToRetry(incomingKey, {
        filename: fileName,
        provider: provider.code,
        retailer: sftpRow.TRDR_RETAILER,
        trdrClient: sftpRow.TRDR_CLIENT || 1,
        docType,
        stage,
        error,
        sourcePath
      })
    }
    return doStorage.saveRetryXml({
      xml,
      filename: fileName,
      provider: provider.code,
      retailer: sftpRow.TRDR_RETAILER,
      trdrClient: sftpRow.TRDR_CLIENT || 1,
      docType,
      stage,
      error,
      sourcePath
    })
  } catch (backupError) {
    console.error(`[edi-scanner] DO retry save failed for ${fileName}: ${backupError.message}`)
    return null
  }
}

async function deleteDoSuccess(app, key) {
  const doStorage = getDoStorage(app)
  if (!doStorage || !key) return false
  try {
    const result = await doStorage.deleteSuccess(key)
    return !!result.deleted
  } catch (error) {
    console.error(`[edi-scanner] DO success delete failed for ${key}: ${error.message}`)
    return false
  }
}

function getDoStorage(app) {
  try {
    return app.service('do-storage')
  } catch {
    return null
  }
}

async function processPendingOrders(app, sftpRows) {
  const stats = { processed: 0, held: 0, failed: 0, errors: [] }
  const retailers = sftpRows.map((r) => r.TRDR_RETAILER).filter((n) => n > 0)
  if (retailers.length === 0) return stats

  const pending = await app.service('CCCSFTPXML').pending({
    retailers,
    doctype: 'ORDERS',
    daysOld: PROCESS_AGE_DAYS,
    limit: PROCESS_BATCH
  })

  for (const row of pending.data) {
    let claimed
    try {
      claimed = await app.service('CCCSFTPXML').claim(row.CCCSFTPXML)
    } catch (e) {
      // Transient S1/network failure on claim — skip this row, keep scanning the rest
      stats.failed += 1
      stats.errors.push({ cccsftpxml: row.CCCSFTPXML, message: `claim failed: ${e.message}` })
      continue
    }
    if (!claimed) continue // another worker beat us, or status moved already

    try {
      const { jsonOrder, errors, s1BaseUrl } = await buildOrderPayload({
        xml: row.XMLDATA,
        sosource: ORDER_SOSOURCE,
        fprms: ORDER_FPRMS,
        series: ORDER_SERIES,
        retailer: row.TRDR_RETAILER,
        orderId: row.XMLFILENAME,
        cccsftpxml: row.CCCSFTPXML,
        app
      })

      if (errors.length > 0) {
        const msg = `Mapping errors (${errors.length}): ${errors.slice(0, 3).map((e) => formatMappingErrorMessage(e)).join(' | ')}`
        await app.service('CCCSFTPXML').patch(row.CCCSFTPXML, {
          XMLSTATUS: 'ERROR',
          XMLERROR: msg.slice(0, 4000)
        })
        stats.failed += 1
        stats.errors.push({ cccsftpxml: row.CCCSFTPXML, message: msg })
        continue
      }

      const sendRes = await sendOrderToS1({
        app,
        jsonOrder,
        s1BaseUrl,
        retailer: row.TRDR_RETAILER,
        orderId: row.XMLFILENAME,
        cccsftpxmlId: row.CCCSFTPXML
      })
      if (sendRes.held) stats.held += 1
      else if (sendRes.success) stats.processed += 1
      else {
        stats.failed += 1
        stats.errors.push({ cccsftpxml: row.CCCSFTPXML, message: (sendRes.errors || []).join('; ') })
      }
    } catch (e) {
      stats.failed += 1
      stats.errors.push({ cccsftpxml: row.CCCSFTPXML, message: e.message })
      try {
        await app.service('CCCSFTPXML').patch(row.CCCSFTPXML, {
          XMLSTATUS: 'ERROR',
          XMLERROR: (e.message || '').slice(0, 4000)
        })
      } catch { /* ignore */ }
    }
  }
  return stats
}

function joinRemote(a, b) {
  if (!b) return a || '/'
  if (!a) return b
  const left = a.endsWith('/') ? a.slice(0, -1) : a
  const right = b.startsWith('/') ? b : '/' + b
  return left + right
}

function isXmlLikeFile(fileName) {
  return /\.(xml|confirm)$/i.test(String(fileName || ''))
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
