import fs from 'node:fs/promises'
import path from 'node:path'
import { buildTransport } from './transports/factory.js'
import { getProvider } from './providers/factory.js'
import { buildOrderPayload } from './order-builder.js'
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
  const stats = { providers: 0, downloaded: 0, inserted: 0, duplicates: 0, backedUp: 0, deletedFromDo: 0, retryBackedUp: 0, processed: 0, failed: 0, errors: [] }
  try {
    const configs = await app.service('CCCSFTP').list({ onlyActive: true })

    for (const row of configs.data) {
      stats.providers += 1
      let transport
      try {
        const providerImpl = getProvider({ CODE: row.PROVIDER_CODE, NAME: row.PROVIDER_NAME })
        transport = buildTransport(row, row.PROVIDER_CONNTYPE)
        const dlStats = await downloadAndStore(app, row, providerImpl, transport)
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
    stats.failed += procStats.failed
    stats.errors.push(...procStats.errors)

    return stats
  } finally {
    _running = false
  }
}

async function downloadAndStore(app, sftpRow, provider, transport) {
  const stats = { downloaded: 0, inserted: 0, duplicates: 0, backedUp: 0, deletedFromDo: 0, retryBackedUp: 0, failed: 0, errors: [] }
  // Per provider: scan each supported docType.
  for (const docType of ['orders', 'retann', 'aperak']) {
    const prefixes = provider.filenamePrefixes(docType)
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
      (e) => prefixes.some((p) => e.name.startsWith(p)) && (!e.modifyTime || e.modifyTime >= cutoff)
    )

    for (const file of matching) {
      const remotePath = joinRemote(remoteDir, file.name)
      const localPath = path.join(localDir, file.name)

      // Dedupe by filename before downloading — skip files already in CCCSFTPXML.
      const existing = await app.service('CCCSFTPXML').find({ query: { XMLFILENAME: file.name, $limit: 1 } })
      if (existing.total > 0 || (existing.data && existing.data.length > 0)) {
        stats.duplicates += 1
        continue
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
        await insertXmlRow(app, { xml, file, sftpRow, provider, docType })
        stats.inserted += 1
        if (doBackup?.key && await deleteDoSuccess(app, doBackup.key)) stats.deletedFromDo += 1
      } catch (e) {
        console.error(`[edi-scanner] parse/insert failed for ${file.name}: ${e.message}`)
        stats.failed += 1
        stats.errors.push({ retailer: sftpRow.TRDR_RETAILER, scope: 'db-insert', file: file.name, message: e.message })
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

async function insertXmlRow(app, { xml, file, sftpRow, provider, docType }) {
  const ediDocType = docType.toUpperCase() // ORDERS | RETANN | APERAK
  await app.service('CCCSFTPXML').create({
    TRDR_CLIENT: sftpRow.TRDR_CLIENT || 1,
    TRDR_RETAILER: sftpRow.TRDR_RETAILER,
    XMLDATA: xml,
    JSONDATA: '',
    XMLDATE: formatSqlDate(file.modifyTime || new Date()),
    XMLSTATUS: 'NEW',
    XMLERROR: '',
    XMLFILENAME: file.name,
    EDIDOCTYPE: ediDocType
  })
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
  const stats = { processed: 0, failed: 0, errors: [] }
  const retailers = sftpRows.map((r) => r.TRDR_RETAILER).filter((n) => n > 0)
  if (retailers.length === 0) return stats

  const pending = await app.service('CCCSFTPXML').pending({
    retailers,
    doctype: 'ORDERS',
    daysOld: PROCESS_AGE_DAYS,
    limit: PROCESS_BATCH
  })

  for (const row of pending.data) {
    const claimed = await app.service('CCCSFTPXML').claim(row.CCCSFTPXML)
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
        const msg = `Mapping errors (${errors.length}): ${errors.slice(0, 3).map((e) => e.message).join(' | ')}`
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
      if (sendRes.success) stats.processed += 1
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
