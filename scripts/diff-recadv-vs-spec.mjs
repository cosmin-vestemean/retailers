// Aggregate structural diff of ALL captured RECADV files against the v4.0 spec expectations.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'documentatie', 'infinite_samples', 'recadv')

const HEADER_FIELDS = ['DocumentNumber', 'DocumentIssueDate', 'GoodsReceiptDate', 'BuyerOrderNumber', 'BuyerOrderDate', 'DeliveryDocumentNumber', 'DeliveryDocumentDate']
const ITEM_FIELDS = ['BuyerItemNum', 'GTIN', 'BuyerItemID', 'SellerItemID', 'QuantityOrdered', 'QuantityAccepted', 'QuantityReturned', 'UnitNetPrice', 'ReasonForReturnCode', 'ReasonForReturnDescription', 'UnitOfMeassure', 'ProductDescription', 'BuyerOrderNumber']

const text = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}\\s*>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null
}
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\s*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])
const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1)

const files = (await readdir(DIR)).filter((f) => f.endsWith('.xml')).sort()

const roots = new Map()
const encodings = new Map()
const buyerGlns = new Map()
const unitOfMeasure = new Map()
const extraItemTags = new Set()
const headerStats = Object.fromEntries(HEADER_FIELDS.map((f) => [f, { tag: 0, filled: 0 }]))
const itemStats = Object.fromEntries(ITEM_FIELDS.map((f) => [f, { tag: 0, filled: 0 }]))
const multiOrder = []
const multiAdvice = []
const countMismatch = []
const docCountNotOne = []
let totalItems = 0

for (const file of files) {
  const xml = await readFile(path.join(DIR, file), 'utf8')
  bump(encodings, xml.match(/encoding="([^"]+)"/)?.[1] || '?')
  bump(roots, xml.match(/<\?xml[\s\S]*?\?>\s*<([A-Za-z][A-Za-z0-9_]*)/)?.[1] || '?')
  bump(buyerGlns, text(blocks(xml, 'BuyerParty')[0] || '', 'GLN') || '<none>')

  const header = blocks(xml, 'RecadvHeader')[0] || ''
  for (const f of HEADER_FIELDS) {
    const v = text(header, f)
    if (v !== null) headerStats[f].tag += 1
    if (v) headerStats[f].filled += 1
  }

  const order = text(header, 'BuyerOrderNumber') || ''
  const advice = text(header, 'DeliveryDocumentNumber') || ''
  if (/[,;/]/.test(order)) multiOrder.push({ file, order })
  if (/[,;/]/.test(advice)) multiAdvice.push({ file, advice })

  const items = blocks(xml, 'Item')
  totalItems += items.length
  for (const it of items) {
    for (const f of ITEM_FIELDS) {
      const v = text(it, f)
      if (v !== null) itemStats[f].tag += 1
      if (v) itemStats[f].filled += 1
    }
    for (const m of it.matchAll(/<([A-Za-z][A-Za-z0-9_]*)\s*>/g)) {
      if (!ITEM_FIELDS.includes(m[1])) extraItemTags.add(m[1])
    }
    bump(unitOfMeasure, text(it, 'UnitOfMeassure') || '<empty>')
  }

  const declared = Number(text(blocks(xml, 'RecadvSummary')[0] || '', 'NumberOfItems'))
  if (declared !== items.length) countMismatch.push({ file, declared, actual: items.length })
  const docs = Number(text(blocks(xml, 'DocumentSummary')[0] || '', 'NumberOfDocuments'))
  if (docs !== 1) docCountNotOne.push({ file, docs })
}

const fmt = (map) => [...map].map(([k, v]) => `${k}=${v}`).join(', ')

console.log(`files=${files.length} totalItems=${totalItems}`)
console.log(`roots: ${fmt(roots)}`)
console.log(`encodings: ${fmt(encodings)}`)
console.log(`BuyerParty GLNs: ${fmt(buyerGlns)}`)
console.log(`UnitOfMeassure: ${fmt(unitOfMeasure)}`)
console.log(`item tags outside the spec: ${[...extraItemTags].join(', ') || 'none'}`)

console.log(`\n=== header fields over ${files.length} files ===`)
console.table(HEADER_FIELDS.map((f) => ({
  field: f,
  'tag present': `${headerStats[f].tag}/${files.length}`,
  'non-empty': `${headerStats[f].filled}/${files.length}`
})))

console.log(`\n=== line fields over ${totalItems} items ===`)
console.table(ITEM_FIELDS.map((f) => ({
  field: f,
  'tag present': `${itemStats[f].tag}/${totalItems}`,
  'non-empty': `${itemStats[f].filled}/${totalItems}`
})))

console.log(`\nNumberOfItems mismatches: ${countMismatch.length}`)
if (countMismatch.length) console.table(countMismatch)
console.log(`NumberOfDocuments != 1: ${docCountNotOne.length}`)
if (docCountNotOne.length) console.table(docCountNotOne)
console.log(`multi-value BuyerOrderNumber: ${multiOrder.length}`)
if (multiOrder.length) console.table(multiOrder.slice(0, 20))
console.log(`multi-value DeliveryDocumentNumber: ${multiAdvice.length}`)
if (multiAdvice.length) console.table(multiAdvice.slice(0, 20))
