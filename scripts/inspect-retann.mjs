// Read-only structural summary of the captured RETANN payloads.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'documentatie',
  'infinite_samples',
  'retann'
)

const clean = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
const all = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => clean(m[1]))
const one = (xml, tag) => all(xml, tag)[0] ?? null

const rows = []
for (const file of await readdir(DIR)) {
  const xml = await readFile(path.join(DIR, file), 'utf8')
  const parties = [...xml.matchAll(/<(BuyerParty|ShipToParty|SellerParty)>([\s\S]*?)<\/\1>/g)]
  const party = Object.fromEntries(parties.map(([, name, body]) => [name, { gln: one(body, 'GLN'), name: one(body, 'Name') }]))
  const items = [...xml.matchAll(/<Item>([\s\S]*?)<\/Item>/g)].map(([, body]) => ({
    buyerItemId: one(body, 'BuyerItemID'),
    sellerItemId: one(body, 'SellerItemID'),
    gtin: one(body, 'GTIN'),
    qty: Number(one(body, 'QuantityReturned')),
    desc: one(body, 'ProductDescription')
  }))
  rows.push({
    file,
    docNumber: one(xml, 'DocumentNumber'),
    issueDate: one(xml, 'DocumentIssueDate'),
    buyer: party.BuyerParty?.gln,
    shipToGln: party.ShipToParty?.gln,
    shipTo: party.ShipToParty?.name,
    items: items.length,
    declared: one(xml, 'NumberOfItems'),
    totalQty: items.reduce((s, i) => s + i.qty, 0),
    positiveQty: items.filter((i) => i.qty > 0).length,
    pallets: items.filter((i) => /palet/i.test(i.desc || '')).length,
    lines: items
  })
}

console.table(rows.map(({ lines, ...r }) => r))

console.log('\n=== every product line ===')
console.table(
  rows.flatMap((r) => r.lines.map((l) => ({ file: r.file, ...l })))
)

const tagsPerFile = await Promise.all(
  (await readdir(DIR)).map(async (f) => new Set((await readFile(path.join(DIR, f), 'utf8')).match(/<([A-Za-z]+)>/g)))
)
const union = new Set(tagsPerFile.flatMap((s) => [...s]))
const intersection = [...union].filter((t) => tagsPerFile.every((s) => s.has(t)))
console.log(`\ndistinct tags: union=${union.size} present-in-all=${intersection.length}`)
console.log('tags NOT in every file:', [...union].filter((t) => !intersection.includes(t)).join(', ') || 'none')

for (const missing of ['RetannRefDoc', 'OrderAtBuyerParty', 'DesadvParty', 'DocID', 'UnitNetPrice', 'MonetaryNetValue', 'QuantityOrdered', 'RetannNumber', 'ILN', 'OriginalItemNumber']) {
  const hits = tagsPerFile.filter((s) => s.has(`<${missing}>`)).length
  console.log(`  <${missing}> present in ${hits}/${tagsPerFile.length} files`)
}
