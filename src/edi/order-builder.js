import { parseString } from 'xml2js'
import defaultFetch from 'node-fetch'
import { buildS1Url, resolveS1BaseUrl } from '../s1-base-url.js'
import { parseS1Json } from '../s1-response.js'

const parseXml = (xml) =>
  new Promise((resolve, reject) =>
    parseString(xml, { explicitArray: false }, (err, result) => (err ? reject(err) : resolve(result)))
  )

/**
 * Walk an XML JSON tree, following a slash-separated path. Returns all leaf
 * values matched along the way (handles repeated nodes like OrderLine).
 */
export function getValFromXML(xmlJson, xmlNode) {
  const path = xmlNode.split('/')
  const result = []
  const walk = (node, depth) => {
    if (node === undefined || node === null) return
    if (depth === path.length) {
      if (typeof node === 'string') result.push(node)
      else if (typeof node === 'object' && node._) result.push(node._)
      return
    }
    const key = path[depth]
    const next = node[key]
    if (Array.isArray(next)) next.forEach((n) => walk(n, depth + 1))
    else walk(next, depth + 1)
  }
  // Skip the root element; xml2js wraps the document in its root tag.
  const roots = Object.values(xmlJson || {})
  roots.forEach((r) => walk(r, 0))
  return result
}

/**
 * Build the SALDOC setData payload from XML using CCCXMLS1MAPPINGS.
 * Replaces the legacy `createOrderJSON` with:
 *   - parameterized {value} substitution via AJS `runMappingSql`
 *   - explicit error list + structured logging via orders-log
 *   - configurable OBJECT/FORM (no hardcoded EFIntegrareRetailers)
 *
 * @param {object} args
 * @param {string} args.xml             raw XML payload
 * @param {number} args.sosource        legacy SOSOURCE filter for mapping lookup
 * @param {number} args.fprms           legacy FPRMS filter
 * @param {number} args.series          SERIES filter (e.g. 7531 for RETANN)
 * @param {number} args.retailer        TRDR_RETAILER
 * @param {string} args.orderId         buyer order id (for logging)
 * @param {number} args.cccsftpxml      CCCSFTPXML id (for logging)
 * @param {object} args.app             Feathers app (for service access)
 * @param {string} [args.objectName]    defaults to 'SALDOC'
 * @param {string} [args.formName]      defaults to 'EFIntegrareRetailers'
 * @returns {Promise<{jsonOrder:object, errors:Array}>}
 */
export async function buildOrderPayload({
  xml,
  sosource,
  fprms,
  series,
  retailer,
  orderId,
  cccsftpxml,
  app,
  objectName = 'SALDOC',
  formName = 'EFIntegrareRetailers',
  fetchImpl
}) {
  const fetch = fetchImpl || defaultFetch
  const resClient = await app.service('CCCRETAILERSCLIENTS').find({
    query: { TRDR_CLIENT: 1 }
  })
  const wsCfg = resClient.data[0]
  const s1BaseUrl = resolveS1BaseUrl({ url: wsCfg?.WSURL, app })

  const resConnect = await app.service('connectToS1').find({
    query: { url: s1BaseUrl, username: wsCfg.WSUSER, password: wsCfg.WSPASS }
  })
  const token = resConnect.token

  const resDocMappings = await app.service('CCCDOCUMENTES1MAPPINGS').find({
    query: { SOSOURCE: sosource, FPRMS: fprms, SERIES: series, TRDR_RETAILER: retailer }
  })
  if (!resDocMappings.data?.length) {
    throw new Error(
      `CCCDOCUMENTES1MAPPINGS not found for SOSOURCE=${sosource} FPRMS=${fprms} SERIES=${series} TRDR_RETAILER=${retailer}`
    )
  }
  const docMappingId = resDocMappings.data[0].CCCDOCUMENTES1MAPPINGS

  const resXmlMappings = await app.service('CCCXMLS1MAPPINGS').find({
    query: { CCCDOCUMENTES1MAPPINGS: docMappingId }
  })
  const xmlMappings = resXmlMappings.data || []

  const jsonOrder = {
    service: 'setData',
    clientID: token,
    appId: 1001,
    OBJECT: objectName,
    FORM: formName
  }

  // Group fields by their target S1 table (SALDOC, ITELINES, etc.)
  const tables = [...new Set(xmlMappings.map((m) => m.S1TABLE1))]
  const DATA = Object.fromEntries(tables.map((t) => [t, []]))

  const xmlJson = await parseXml(xml)

  for (const m of xmlMappings) {
    const xmlVals = getValFromXML(xmlJson, m.XMLNODE)
    for (const xmlVal of xmlVals) {
      const obj = {}
      obj[m.S1FIELD1] = m.SQL ? { SQL: m.SQL, value: xmlVal } : xmlVal
      DATA[m.S1TABLE1].push(obj)
    }
  }
  jsonOrder.DATA = DATA

  // Resolve SQL templates with parameterized binding.
  const errors = []
  for (const tableName of tables) {
    for (const item of DATA[tableName]) {
      for (const field of Object.keys(item)) {
        const v = item[field]
        if (!(v && typeof v === 'object' && v.SQL)) continue
        try {
          const r = await fetch(buildS1Url('/JS/JSRetailers/runMappingSql', s1BaseUrl), {
            method: 'POST',
            body: JSON.stringify({ sql: v.SQL, value: v.value })
          })
          const out = await parseS1Json(r, 'runMappingSql')
          if (!out.success) {
            errors.push({ table: tableName, field, value: v.value, sql: v.SQL, message: out.error })
            await logMappingError(app, { retailer, orderId, cccsftpxml, message: out.error, field, value: v.value, sql: v.SQL })
            continue
          }
          if (out.data === '' || out.data === null || out.data === undefined) {
            const msg = `No row from mapping SQL for field ${field} value ${v.value}`
            errors.push({ table: tableName, field, value: v.value, sql: v.SQL, message: msg })
            await logMappingError(app, { retailer, orderId, cccsftpxml, message: msg, field, value: v.value, sql: v.SQL })
          } else {
            item[field] = out.data
          }
        } catch (e) {
          errors.push({ table: tableName, field, value: v.value, sql: v.SQL, message: e.message })
          await logMappingError(app, { retailer, orderId, cccsftpxml, message: e.message, field, value: v.value, sql: v.SQL })
        }
      }
    }
  }

  DATA.ITELINES = groupLineFields(DATA.ITELINES || [])
  if (!DATA.SALDOC || DATA.SALDOC.length === 0) DATA.SALDOC = [{}]
  DATA.SALDOC[0].SERIES = series
  DATA.SALDOC[0].TRDR = parseInt(retailer, 10)

  return { jsonOrder, errors, s1BaseUrl }
}

function groupLineFields(rows) {
  const fieldNames = []
  for (const row of rows) {
    for (const field of Object.keys(row)) {
      if (!fieldNames.includes(field)) fieldNames.push(field)
    }
  }
  if (fieldNames.length === 0) return rows

  const valuesByField = Object.fromEntries(fieldNames.map((field) => [field, []]))
  for (const row of rows) {
    for (const field of Object.keys(row)) {
      valuesByField[field].push(row[field])
    }
  }

  const lineCount = Math.max(...fieldNames.map((field) => valuesByField[field].length))
  const grouped = []
  for (let index = 0; index < lineCount; index += 1) {
    const line = {}
    for (const field of fieldNames) {
      if (index < valuesByField[field].length) line[field] = valuesByField[field][index]
    }
    grouped.push(line)
  }
  return grouped
}

async function logMappingError(app, { retailer, orderId, cccsftpxml, message, field, value, sql }) {
  try {
    await app.service('orders-log').create({
      TRDR_CLIENT: 1,
      TRDR_RETAILER: retailer,
      ORDERID: orderId,
      CCCSFTPXML: cccsftpxml,
      OPERATION: 'mappingError',
      LEVEL: 'error',
      MESSAGETEXT: `[${field}] valoarea "${value}" nerezolvată — ${message} | SQL: ${sql}`
    })
  } catch (e) {
    console.error('[order-builder] orders-log insert failed:', e.message)
  }
}
