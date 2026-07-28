// Read-only reconciliation of ALL captured RECADV files against their Soft1 dispatch advice (7111).
// Measures the real clean-vs-difference rate on actual RECADV payloads (phase 0 of the EDI plan).
// Nothing is written to Soft1.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Soft1Client } from '../mcp-soft1/soft1-client.js'

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'documentatie', 'infinite_samples', 'recadv')
const RETAILERS = {
  '5940475841003': { name: 'Dedeman', trdr: 11654 },
  '5940475172008': { name: 'Auchan', trdr: 13248 }
}
const PALLET = /palet/i

const text = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}\\s*>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : ''
}
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\s*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])

function extractRows(raw) {
  const parsed = JSON.parse(raw)
  for (const key of ['rows', 'data', 'result', 'SODATA']) {
    const value = parsed?.[key]
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const nested = JSON.parse(value)
        if (Array.isArray(nested)) return nested
        if (Array.isArray(nested?.rows)) return nested.rows
      } catch { /* not nested */ }
    }
  }
  return Array.isArray(parsed) ? parsed : []
}

const s1 = new Soft1Client()
async function queryChunked(build, values, chunkSize = 200) {
  const out = []
  for (let i = 0; i < values.length; i += chunkSize) {
    out.push(...extractRows(await s1.executeSqlRaw(build(values.slice(i, i + chunkSize)))))
  }
  return out
}

// --- parse ---
const docs = []
for (const file of (await readdir(DIR)).filter((f) => f.endsWith('.xml')).sort()) {
  const xml = await readFile(path.join(DIR, file), 'utf8')
  const header = blocks(xml, 'RecadvHeader')[0] || ''
  const gln = text(blocks(xml, 'BuyerParty')[0] || '', 'GLN')
  const adviceRaw = text(header, 'DeliveryDocumentNumber')
  docs.push({
    file,
    gln,
    retailer: RETAILERS[gln],
    documentNumber: text(header, 'DocumentNumber'),
    orders: text(header, 'BuyerOrderNumber').split(/[,;]/).map((o) => o.trim()).filter(Boolean),
    adviceRaw,
    // "AEX-AE-053744", "53986" and "AEX-AE-053657/AE" all reduce to their 6-digit tail.
    adviceSuffixes: [...adviceRaw.matchAll(/(\d{2,6})/g)].map((m) => m[1].padStart(6, '0')),
    adviceTruncated: adviceRaw.includes('/') && !/\d{2,6}$/.test(adviceRaw),
    items: blocks(xml, 'Item').map((it) => ({
      buyerItemId: text(it, 'BuyerItemID'),
      gtin: text(it, 'GTIN'),
      accepted: Number(text(it, 'QuantityAccepted') || 0),
      description: text(it, 'ProductDescription')
    }))
  })
}

// --- bulk lookup of the source advices, by advice code and by order number ---
const allSuffixes = [...new Set(docs.flatMap((d) => d.adviceSuffixes))]
const allOrders = [...new Set(docs.flatMap((d) => d.orders.map((o) => String(Number(o)))))]

const bySuffix = allSuffixes.length ? await queryChunked((chunk) => `
  SELECT f.FINDOC, f.FINCODE, f.TRDR, f.NUM04
  FROM FINDOC f
  WHERE f.COMPANY = 50 AND f.SERIES = 7111 AND f.ISCANCEL = 0
    AND RIGHT(f.FINCODE, 6) IN (${chunk.map((s) => `'${s}'`).join(',')})`, allSuffixes) : []

const byOrder = await queryChunked((chunk) => `
  SELECT f.FINDOC, f.FINCODE, f.TRDR, f.NUM04
  FROM FINDOC f
  WHERE f.COMPANY = 50 AND f.SERIES = 7111 AND f.ISCANCEL = 0
    AND f.NUM04 IN (${chunk.join(',')})`, allOrders)

const adviceRows = [...bySuffix, ...byOrder]
const advicesBySuffix = new Map()
for (const r of bySuffix) {
  const key = `${r.TRDR}|${String(r.FINCODE).slice(-6)}`
  if (!advicesBySuffix.has(key)) advicesBySuffix.set(key, [])
  advicesBySuffix.get(key).push(r)
}
const advicesByOrder = new Map()
for (const r of byOrder) {
  const key = `${r.TRDR}|${String(Number(r.NUM04))}`
  if (!advicesByOrder.has(key)) advicesByOrder.set(key, [])
  advicesByOrder.get(key).push(r)
}

// The advice code is authoritative when the retailer sends a complete one. A truncated header
// ("AEX-AE-053657/AE") only names the first advice, so it must be unioned with the order lookup.
const resolvedBy = { advice: 0, 'advice+order': 0, order: 0, none: 0 }
for (const doc of docs) {
  const trdr = doc.retailer?.trdr
  const viaAdvice = doc.adviceSuffixes.flatMap((s) => advicesBySuffix.get(`${trdr}|${s}`) || [])
  const viaOrder = doc.orders.flatMap((o) => advicesByOrder.get(`${trdr}|${String(Number(o))}`) || [])

  let advices = viaAdvice
  let how = 'advice'
  if (doc.adviceTruncated || !viaAdvice.length) {
    const seen = new Set()
    advices = [...viaAdvice, ...viaOrder].filter((a) => !seen.has(a.FINDOC) && seen.add(a.FINDOC))
    how = viaAdvice.length ? 'advice+order' : 'order'
  }
  if (!advices.length) how = 'none'

  doc.advices = advices
  doc.resolvedBy = how
  resolvedBy[how] += 1
}

// --- bulk lookup of the advice lines ---
const findocs = [...new Set(adviceRows.map((r) => String(r.FINDOC)))]
const lineRows = findocs.length ? await queryChunked((chunk) => `
  SELECT l.FINDOC, x.CODE AS RETAILERCODE, m.CODE1 AS EAN, l.QTY1
  FROM MTRLINES l
  JOIN FINDOC f ON f.FINDOC = l.FINDOC
  JOIN MTRL m ON m.MTRL = l.MTRL
  LEFT JOIN CCCS1DXTRDRMTRL x ON x.MTRL = l.MTRL AND x.TRDR = f.TRDR
  WHERE l.FINDOC IN (${chunk.join(',')})`, findocs) : []

const linesByFindoc = new Map()
for (const r of lineRows) {
  if (!linesByFindoc.has(String(r.FINDOC))) linesByFindoc.set(String(r.FINDOC), [])
  linesByFindoc.get(String(r.FINDOC)).push(r)
}

// --- group the RECADV files by the advice they confirm (split receptions) ---
const groups = new Map()
const unmatchedDocs = []
let palletLines = 0

for (const doc of docs) {
  const retailer = doc.retailer?.name || `UNKNOWN(${doc.gln})`
  const advices = doc.advices
  if (!advices.length) {
    unmatchedDocs.push({ file: doc.file, retailer, orders: doc.orders.join(','), advice: doc.adviceRaw })
    continue
  }

  const key = `${retailer}|${[...new Set(advices.map((a) => a.FINDOC))].sort().join('+')}`
  if (!groups.has(key)) groups.set(key, { retailer, advices, files: [], accepted: new Map(), items: [] })
  const group = groups.get(key)
  group.files.push(doc.file)
  for (const item of doc.items) {
    if (PALLET.test(item.description)) { palletLines += 1; continue }
    group.items.push(item)
    group.accepted.set(item.buyerItemId, (group.accepted.get(item.buyerItemId) || 0) + item.accepted)
  }
}

// --- reconcile each reception ---
const summary = {}
const unresolvedLines = []
const differences = []
let eanMismatches = 0

for (const group of groups.values()) {
  const r = group.retailer
  summary[r] = summary[r] || { files: 0, receptions: 0, productLines: 0, resolvedLines: 0, cleanReceptions: 0, diffLines: 0 }
  const agg = summary[r]
  agg.files += group.files.length
  agg.receptions += 1

  const shipped = new Map()
  const eanByCode = new Map()
  for (const a of group.advices) {
    for (const l of linesByFindoc.get(String(a.FINDOC)) || []) {
      if (!l.RETAILERCODE) continue
      shipped.set(String(l.RETAILERCODE), (shipped.get(String(l.RETAILERCODE)) || 0) + Number(l.QTY1))
      eanByCode.set(String(l.RETAILERCODE), String(l.EAN))
    }
  }

  for (const item of group.items) {
    agg.productLines += 1
    if (!shipped.has(item.buyerItemId)) {
      unresolvedLines.push({ files: group.files.join(','), retailer: r, buyerItemId: item.buyerItemId, accepted: item.accepted, description: item.description })
      continue
    }
    agg.resolvedLines += 1
    if (item.gtin && eanByCode.get(item.buyerItemId) && item.gtin !== eanByCode.get(item.buyerItemId)) eanMismatches += 1
  }

  let diffs = 0
  for (const [code, qty] of group.accepted) {
    if (!shipped.has(code)) continue
    const delta = shipped.get(code) - qty
    if (delta !== 0) {
      diffs += 1
      differences.push({
        files: group.files.join(','),
        retailer: r,
        advice: group.advices.map((a) => a.FINCODE).join('+'),
        code,
        shipped: shipped.get(code),
        accepted: qty,
        delta
      })
    }
  }
  agg.diffLines += diffs
  if (diffs === 0) agg.cleanReceptions += 1
}

console.log(`=== reconciliation over ${docs.length} real RECADV files (${groups.size} receptions) ===`)
console.table(Object.entries(summary).map(([retailer, v]) => ({
  retailer,
  'recadv files': v.files,
  receptions: v.receptions,
  'product lines': v.productLines,
  'lines resolved': `${v.resolvedLines}/${v.productLines}`,
  'clean receptions': `${v.cleanReceptions}/${v.receptions} (${Math.round(100 * v.cleanReceptions / v.receptions)}%)`,
  'diff lines': v.diffLines,
  'clean lines %': v.resolvedLines ? `${(100 * (1 - v.diffLines / v.resolvedLines)).toFixed(1)}%` : '-'
})))

const split = [...groups.values()].filter((g) => g.files.length > 1)
console.log(`\nresolution: ${Object.entries(resolvedBy).map(([k, v]) => `${k}=${v}`).join(', ')}`)
console.log(`truncated advice headers: ${docs.filter((d) => d.adviceTruncated).length}`)
console.log(`receptions confirmed by more than one RECADV file: ${split.length}`)
for (const g of split) console.log(`  ${g.advices.map((a) => a.FINCODE).join('+')} <- ${g.files.join(', ')}`)
console.log(`pallet lines skipped: ${palletLines}`)
console.log(`GTIN vs MTRL.CODE1 mismatches (warning only): ${eanMismatches}`)
console.log(`\ndocuments whose advice could not be resolved: ${unmatchedDocs.length}`)
if (unmatchedDocs.length) console.table(unmatchedDocs.slice(0, 25))
console.log(`\nlines not present on the resolved advice: ${unresolvedLines.length}`)
if (unresolvedLines.length) console.table(unresolvedLines.slice(0, 25))
console.log(`\nquantity differences: ${differences.length}`)
if (differences.length) console.table(differences.slice(0, 40))
