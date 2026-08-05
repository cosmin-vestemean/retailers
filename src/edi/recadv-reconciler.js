/**
 * RECADV reconciliation engine (phase F2).
 *
 * Compares what the retailer says it received (RECADV, parsed by `infiniteProvider.parseRecadv`)
 * against what we shipped on the corresponding Soft1 dispatch advice (series 7111).
 * Ported from the read-only prototype `scripts/reconcile-recadv-vs-soft1.mjs`, which was
 * validated on the full 101-file production corpus.
 *
 * Nothing here writes to Soft1 and nothing is persisted: reconciliation is computed on demand,
 * so the answer never goes stale when an advice is invoiced later.
 *
 * The SQL access is injected as a `lookup` object so this module stays offline-testable.
 * F4/F5 supply the real implementation, backed by AJS `S1/JS/AJS/RECADV.js` with bound
 * parameters — this module never builds SQL itself.
 *
 *   lookup.findAdvices({ trdr, suffixes, orders }) -> [{ FINDOC, FINCODE, TRDR, NUM04 }]
 *   lookup.findAdviceLines({ findocs })            -> [{ FINDOC, RETAILERCODE, EAN, QTY1 }]
 */

// Defence in depth: every value handed to `lookup` is re-validated here, even though the parser
// already produces digits only. The prototype was safe by accident; that is not a guarantee.
const SUFFIX_RE = /^\d{1,6}$/
const ID_RE = /^\d{1,15}$/

export const RECEPTION_STATUS = {
  CLEAN: 'clean',
  DIFFERENCE: 'difference',
  UNRESOLVED: 'unresolved',
  BLOCKED: 'blocked'
}

/** Fail-closed order of precedence: a reception is never reported cleaner than its worst line. */
const STATUS_SEVERITY = {
  [RECEPTION_STATUS.CLEAN]: 0,
  [RECEPTION_STATUS.DIFFERENCE]: 1,
  [RECEPTION_STATUS.UNRESOLVED]: 2,
  [RECEPTION_STATUS.BLOCKED]: 3
}

export function assertNumericValues(values, label, pattern = ID_RE) {
  for (const value of values) {
    if (!pattern.test(String(value))) {
      throw new Error(`RECADV reconciler: refusing to query ${label} with non-numeric value "${value}"`)
    }
  }
  return values
}

/**
 * `FINDOC.NUM04` is a float, so a retailer order arrives with its leading zeros already lost
 * on the Soft1 side (Auchan sends `01900002`). Strip them textually rather than via `Number`.
 * @returns {string|null} null when the order number is not usable as a numeric key
 */
export function normalizeOrderNumber(order) {
  const digits = String(order ?? '').trim()
  if (!ID_RE.test(digits)) return null
  return digits.replace(/^0+(?=\d)/, '')
}

function pushInto(map, key, value) {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(value)
}

/**
 * Three-tier resolution. The advice code is authoritative when the retailer sends a complete one.
 * A header truncated at 16 characters ("AEX-AE-053657/AE") only names the first of several
 * consolidated advices, so it must be unioned with the order lookup — advice-only resolution
 * there loses lines and produces physically impossible deltas. Auchan never sends an advice
 * number at all, so it resolves by order alone.
 */
export function resolveAdvices(doc, { bySuffix, byOrder }) {
  if (!doc.trdr) return { advices: [], resolvedBy: 'none' }

  const viaAdvice = (doc.adviceSuffixes || []).flatMap((s) => bySuffix.get(`${doc.trdr}|${s}`) || [])
  const viaOrder = (doc.orders || [])
    .map(normalizeOrderNumber)
    .filter(Boolean)
    .flatMap((o) => byOrder.get(`${doc.trdr}|${o}`) || [])

  let advices = viaAdvice
  let resolvedBy = 'advice'
  if (doc.adviceTruncated || !viaAdvice.length) {
    const seen = new Set()
    advices = [...viaAdvice, ...viaOrder].filter((a) => !seen.has(a.FINDOC) && seen.add(a.FINDOC))
    resolvedBy = viaAdvice.length ? 'advice+order' : 'order'
  }
  if (!advices.length) resolvedBy = 'none'
  return { advices, resolvedBy }
}

/**
 * Groups parsed documents by the reception (set of advices) they confirm, summing accepted
 * quantities per retailer product code. Mandatory: several RECADV files can confirm one physical
 * reception (AEX-AE-053669 reports 16 in one file and 4 in another against 20 shipped), and
 * processing them independently would emit two shortage candidates for one event.
 */
export function groupReceptions(resolved) {
  const groups = new Map()
  for (const entry of resolved) {
    const findocs = [...new Set(entry.advices.map((a) => String(a.FINDOC)))].sort()
    const key = `${entry.doc.trdr ?? 'unknown'}|${findocs.join('+') || entry.doc.documentNumber}`

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        trdr: entry.doc.trdr,
        buyerGln: entry.doc.buyerGln,
        resolvedBy: entry.resolvedBy,
        advices: entry.advices,
        files: [],
        documentNumbers: [],
        accepted: new Map(),
        palletLines: 0
      })
    }

    const group = groups.get(key)
    group.files.push(entry.doc.file || entry.doc.documentNumber)
    group.documentNumbers.push(entry.doc.documentNumber)

    for (const item of entry.doc.items || []) {
      // Returnable pallets arrive as ordinary items but have no MTRL and no retailer mapping;
      // without this skip they would fail-close whole documents. They are never invoiced.
      if (item.isPallet) {
        group.palletLines += 1
        continue
      }
      const prev = group.accepted.get(item.buyerItemId)
      group.accepted.set(item.buyerItemId, {
        buyerItemId: item.buyerItemId,
        description: prev?.description || item.description,
        gtin: prev?.gtin || item.gtin,
        accepted: (prev?.accepted || 0) + item.accepted
      })
    }
  }
  return [...groups.values()]
}

function reconcileGroup(group, linesByFindoc) {
  const shipped = new Map()
  for (const advice of group.advices) {
    for (const line of linesByFindoc.get(String(advice.FINDOC)) || []) {
      if (!line.RETAILERCODE) continue
      const code = String(line.RETAILERCODE)
      const prev = shipped.get(code)
      shipped.set(code, { qty: (prev?.qty || 0) + Number(line.QTY1), ean: prev?.ean || String(line.EAN ?? '') })
    }
  }

  const lines = []
  const unresolvedLines = []
  const gtinMismatches = []
  let status = group.advices.length ? RECEPTION_STATUS.CLEAN : RECEPTION_STATUS.UNRESOLVED

  const worsen = (candidate) => {
    if (STATUS_SEVERITY[candidate] > STATUS_SEVERITY[status]) status = candidate
  }

  for (const item of group.accepted.values()) {
    const source = shipped.get(item.buyerItemId)
    if (!source) {
      unresolvedLines.push(item)
      worsen(RECEPTION_STATUS.UNRESOLVED)
      continue
    }
    // GTIN disagrees with MTRL.CODE1 on real data; it is a warning, never a resolution key.
    if (item.gtin && source.ean && item.gtin !== source.ean) {
      gtinMismatches.push({ buyerItemId: item.buyerItemId, gtin: item.gtin, ean: source.ean })
    }

    const delta = source.qty - item.accepted
    lines.push({
      buyerItemId: item.buyerItemId,
      description: item.description,
      shipped: source.qty,
      accepted: item.accepted,
      delta
    })

    if (delta < 0) worsen(RECEPTION_STATUS.BLOCKED)
    else if (delta > 0) worsen(RECEPTION_STATUS.DIFFERENCE)
  }

  // Shipped lines the receipt does not mention at all. Reported but deliberately not scored:
  // a later phase decides whether that is a full shortage or a reception still in progress.
  const missingOnReceipt = [...shipped.entries()]
    .filter(([code]) => !group.accepted.has(code))
    .map(([code, source]) => ({ retailerCode: code, shipped: source.qty }))

  return {
    key: group.key,
    trdr: group.trdr,
    buyerGln: group.buyerGln,
    status,
    resolvedBy: group.resolvedBy,
    files: group.files,
    documentNumbers: group.documentNumbers,
    advices: group.advices.map((a) => ({ FINDOC: a.FINDOC, FINCODE: a.FINCODE, NUM04: a.NUM04 })),
    lines,
    blockedLines: lines.filter((l) => l.delta < 0),
    differenceLines: lines.filter((l) => l.delta > 0),
    unresolvedLines,
    missingOnReceipt,
    gtinMismatches,
    palletLines: group.palletLines
  }
}

/**
 * @param {object} args
 * @param {Array<object>} args.documents parsed RECADV payloads, optionally carrying `file`
 * @param {object} args.lookup          injected Soft1 access (see module header)
 * @returns {Promise<{receptions: Array<object>, summary: object}>}
 */
export async function reconcileRecadv({ documents, lookup }) {
  const byTrdr = new Map()
  for (const doc of documents) {
    if (!doc.trdr) continue
    if (!byTrdr.has(doc.trdr)) byTrdr.set(doc.trdr, { suffixes: new Set(), orders: new Set() })
    const acc = byTrdr.get(doc.trdr)
    for (const suffix of doc.adviceSuffixes || []) acc.suffixes.add(suffix)
    for (const order of doc.orders || []) {
      const normalized = normalizeOrderNumber(order)
      if (normalized) acc.orders.add(normalized)
    }
  }

  const bySuffix = new Map()
  const byOrder = new Map()
  for (const [trdr, acc] of byTrdr) {
    const suffixes = assertNumericValues([...acc.suffixes], 'advice suffix', SUFFIX_RE)
    const orders = assertNumericValues([...acc.orders], 'order number')
    assertNumericValues([trdr], 'TRDR')
    if (!suffixes.length && !orders.length) continue

    for (const row of await lookup.findAdvices({ trdr, suffixes, orders })) {
      pushInto(bySuffix, `${row.TRDR}|${String(row.FINCODE).slice(-6)}`, row)
      const order = normalizeOrderNumber(row.NUM04)
      if (order) pushInto(byOrder, `${row.TRDR}|${order}`, row)
    }
  }

  const resolved = documents.map((doc) => ({ doc, ...resolveAdvices(doc, { bySuffix, byOrder }) }))
  const groups = groupReceptions(resolved)

  const findocs = assertNumericValues(
    [...new Set(groups.flatMap((g) => g.advices.map((a) => String(a.FINDOC))))],
    'FINDOC'
  )
  const linesByFindoc = new Map()
  if (findocs.length) {
    for (const line of await lookup.findAdviceLines({ findocs })) {
      pushInto(linesByFindoc, String(line.FINDOC), line)
    }
  }

  const receptions = groups.map((group) => reconcileGroup(group, linesByFindoc))
  const summary = {
    documents: documents.length,
    receptions: receptions.length,
    clean: receptions.filter((r) => r.status === RECEPTION_STATUS.CLEAN).length,
    difference: receptions.filter((r) => r.status === RECEPTION_STATUS.DIFFERENCE).length,
    unresolved: receptions.filter((r) => r.status === RECEPTION_STATUS.UNRESOLVED).length,
    blocked: receptions.filter((r) => r.status === RECEPTION_STATUS.BLOCKED).length
  }
  return { receptions, summary }
}
