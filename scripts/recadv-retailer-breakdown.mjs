// Ad-hoc: which retailers are present in the captured RECADV set, and how the header refs behave.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'documentatie', 'infinite_samples', 'recadv')

const text = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}\\s*>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : ''
}
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\s*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])

const byGln = new Map()
const noAdvice = []
const truncatedLengths = new Set()
const sellerIds = new Map()

for (const f of (await readdir(DIR)).filter((x) => x.endsWith('.xml')).sort()) {
  const xml = await readFile(path.join(DIR, f), 'utf8')
  const buyer = blocks(xml, 'BuyerParty')[0] || ''
  const gln = text(buyer, 'GLN')
  const header = blocks(xml, 'RecadvHeader')[0] || ''
  const advice = text(header, 'DeliveryDocumentNumber')

  if (!byGln.has(gln)) byGln.set(gln, { name: text(buyer, 'Name'), files: 0, withAdvice: 0, items: 0 })
  const agg = byGln.get(gln)
  agg.files += 1
  agg.items += blocks(xml, 'Item').length
  if (advice) agg.withAdvice += 1
  else noAdvice.push({ file: f, gln, name: text(buyer, 'Name'), order: text(header, 'BuyerOrderNumber') })
  if (advice.includes('/')) truncatedLengths.add(advice.length)

  const sid = text(blocks(xml, 'SellerParty')[0] || '', 'SellerId')
  sellerIds.set(`${gln}|${sid}`, (sellerIds.get(`${gln}|${sid}`) || 0) + 1)
}

console.log('=== retailers in the captured set ===')
console.table([...byGln].map(([gln, v]) => ({ gln, ...v })))
console.log(`\nfiles with no DeliveryDocumentNumber: ${noAdvice.length}`)
console.table(noAdvice.slice(0, 10))
console.log(`\nlengths of slash-joined advice strings: ${[...truncatedLengths].join(', ')}`)
console.log('\nbuyerGln|SellerId combinations:')
console.table([...sellerIds].map(([k, v]) => ({ combo: k, files: v })))
