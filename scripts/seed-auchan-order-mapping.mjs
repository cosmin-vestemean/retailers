// One-off seeding: create Auchan (TRDR 13248) ORDER document + XML mappings
// in the database behind the configured S1 endpoint.
//
// Run against PetFactoryTEST dev endpoint:
//   $env:S1_BASE_URL='https://dev-petfactory.oncloud.gr/s1services'; node scripts/seed-auchan-order-mapping.mjs
//
// Idempotent: skips header creation if the Auchan ORDER doc mapping already
// exists, and skips XML rows whose XMLNODE is already present for that doc.

const BASE = process.env.S1_BASE_URL
if (!BASE) {
  console.error('Missing S1_BASE_URL env var')
  process.exit(1)
}

const AUCHAN_TRDR = 13248
const TRDR_CLIENT = 1

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  const json = await res.json()
  return json
}

async function main() {
  // 1. Find or create the Auchan ORDER document header.
  const existing = await post('/JS/JSRetailers/getDocumentMappings', {
    TRDR_RETAILER: AUCHAN_TRDR,
    SOSOURCE: 1351,
    FPRMS: 701,
    SERIES: 7012
  })
  if (!existing.success) throw new Error(`getDocumentMappings failed: ${existing.error}`)

  let docId
  if (existing.data && existing.data.length > 0) {
    docId = parseInt(existing.data[0].CCCDOCUMENTES1MAPPINGS, 10)
    console.log(`Auchan ORDER doc mapping already exists: CCCDOCUMENTES1MAPPINGS=${docId}`)
  } else {
    const created = await post('/JS/JSRetailers/createDocumentMapping', {
      TRDR_RETAILER: AUCHAN_TRDR,
      TRDR_CLIENT,
      SOSOURCE: 1351,
      FPRMS: 701,
      SERIES: 7012,
      INITIALDIRIN: '/orders',
      INITIALDIROUT: ''
    })
    if (!created.success) throw new Error(`createDocumentMapping failed: ${created.error}`)
    docId = parseInt(created.id, 10)
    console.log(`Created Auchan ORDER doc mapping: CCCDOCUMENTES1MAPPINGS=${docId}`)
  }

  // 2. The 7 ORDER XML mappings (cloned from Dedeman, trdr=13248 in SQL templates).
  const branchSql = `select trdbranch from trdbranch where trdr=${AUCHAN_TRDR} AND cccs1dxgln='{value}'`
  const itemSql = `select mtrl from CCCS1DXTRDRMTRL where trdr=${AUCHAN_TRDR} and code='{value}'`

  const rows = [
    { XMLORDER: 10, XMLNODE: 'Order/OrderHeader/RequestedDeliveryDate', S1TABLE1: 'MTRDOC', S1FIELD1: 'DELIVDATE', SQL: '' },
    { XMLORDER: 20, XMLNODE: 'Order/OrderHeader/BuyerOrderNumber', S1TABLE1: 'SALDOC', S1FIELD1: 'NUM04', SQL: '' },
    { XMLORDER: 30, XMLNODE: 'Order/OrderHeader/OrderIssueDate', S1TABLE1: 'SALDOC', S1FIELD1: 'DATE01', SQL: '' },
    { XMLORDER: 40, XMLNODE: 'Order/OrderParty/ShipToParty/GLN', S1TABLE1: 'SALDOC', S1FIELD1: 'TRDBRANCH', SQL: branchSql },
    { XMLORDER: 50, XMLNODE: 'Order/OrderDetail/Item/UnitNetPrice', S1TABLE1: 'ITELINES', S1FIELD1: 'PRICE', SQL: '' },
    { XMLORDER: 60, XMLNODE: 'Order/OrderDetail/Item/QuantityOrdered', S1TABLE1: 'ITELINES', S1FIELD1: 'QTY1', SQL: '' },
    { XMLORDER: 70, XMLNODE: 'Order/OrderDetail/Item/BuyerItemID', S1TABLE1: 'ITELINES', S1FIELD1: 'MTRL', SQL: itemSql }
  ]

  // Existing XML rows for this doc, to avoid duplicates.
  const existingXml = await post('/JS/JSRetailers/getXmlMappings', { CCCDOCUMENTES1MAPPINGS: docId })
  if (!existingXml.success) throw new Error(`getXmlMappings failed: ${existingXml.error}`)
  const present = new Set((existingXml.data || []).map(r => (r.XMLNODE || '').toString().trim()))

  for (const row of rows) {
    if (present.has(row.XMLNODE)) {
      console.log(`  skip (exists): ${row.XMLNODE}`)
      continue
    }
    const res = await post('/JS/JSRetailers/createXmlMapping', {
      XMLNODE: row.XMLNODE,
      MANDATORY: 1,
      S1TABLE1: row.S1TABLE1,
      S1FIELD1: row.S1FIELD1,
      S1TABLE2: '',
      S1FIELD2: '',
      SQL: row.SQL,
      OBSERVATII: '',
      XMLORDER: row.XMLORDER,
      CCCDOCUMENTES1MAPPINGS: docId
    })
    if (!res.success) throw new Error(`createXmlMapping failed for ${row.XMLNODE}: ${res.error}`)
    console.log(`  created XML row id=${res.id}: ${row.XMLNODE}`)
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
