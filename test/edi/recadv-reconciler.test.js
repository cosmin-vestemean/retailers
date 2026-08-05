// Offline tests for the RECADV reconciliation engine: real fixtures through the real parser,
// Soft1 access replaced by a mock `lookup`. No network, no database.
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { infiniteProvider } from '../../src/edi/providers/infinite.provider.js'
import {
  RECEPTION_STATUS,
  assertNumericValues,
  normalizeOrderNumber,
  reconcileRecadv
} from '../../src/edi/recadv-reconciler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, 'fixtures', 'recadv')

const parseFixture = async (name) => {
  const xml = await fs.readFile(path.join(FIXTURES, name), 'utf-8')
  return { file: name, ...(await infiniteProvider.parseRecadv(xml)) }
}

function makeLookup({ advices = [], lines = [] } = {}) {
  const calls = { findAdvices: [], findAdviceLines: [] }
  return {
    calls,
    async findAdvices(args) {
      calls.findAdvices.push(args)
      return advices.filter(
        (a) =>
          a.TRDR === args.trdr &&
          (args.suffixes.includes(String(a.FINCODE).slice(-6)) ||
            args.orders.includes(normalizeOrderNumber(a.NUM04)))
      )
    },
    async findAdviceLines({ findocs }) {
      calls.findAdviceLines.push(findocs)
      return lines.filter((l) => findocs.includes(String(l.FINDOC)))
    }
  }
}

const DEDEMAN = 11654
const AUCHAN = 13248

describe('recadv reconciler', () => {
  it('reports a reception as clean when every accepted quantity matches the advice', async () => {
    const documents = [await parseFixture('dedeman-full-advice.xml')]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500001, FINCODE: 'AEX-AE-900001', TRDR: DEDEMAN, NUM04: 4500000001 }],
      lines: [
        { FINDOC: 500001, RETAILERCODE: 'TEST0001', EAN: '5949060000001', QTY1: 10 },
        { FINDOC: 500001, RETAILERCODE: 'TEST0002', EAN: '5949060000002', QTY1: 5 }
      ]
    })

    const { receptions, summary } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions.length, 1)
    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.CLEAN)
    assert.strictEqual(receptions[0].resolvedBy, 'advice')
    assert.deepStrictEqual(receptions[0].advices, [
      { FINDOC: 500001, FINCODE: 'AEX-AE-900001', NUM04: 4500000001 }
    ])
    assert.strictEqual(receptions[0].differenceLines.length, 0)
    assert.strictEqual(summary.clean, 1)
  })

  it('reports a shortage as a per-line difference', async () => {
    const documents = [await parseFixture('dedeman-full-advice.xml')]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500001, FINCODE: 'AEX-AE-900001', TRDR: DEDEMAN, NUM04: 4500000001 }],
      lines: [
        { FINDOC: 500001, RETAILERCODE: 'TEST0001', EAN: '5949060000001', QTY1: 10 },
        { FINDOC: 500001, RETAILERCODE: 'TEST0002', EAN: '5949060000002', QTY1: 8 }
      ]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.DIFFERENCE)
    assert.deepStrictEqual(receptions[0].differenceLines, [
      { buyerItemId: 'TEST0002', description: 'TEST PRODUCT B', shipped: 8, accepted: 5, delta: 3 }
    ])
  })

  // The AEX-AE-053669 case from the production corpus: two files, 16 + 4, against 20 shipped.
  it('aggregates several files confirming one advice before computing a delta', async () => {
    const documents = [
      await parseFixture('dedeman-split-part1.xml'),
      await parseFixture('dedeman-split-part2.xml')
    ]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500005, FINCODE: 'AEX-AE-900005', TRDR: DEDEMAN, NUM04: 4500000005 }],
      lines: [{ FINDOC: 500005, RETAILERCODE: 'TEST0005', EAN: '5949060000005', QTY1: 20 }]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions.length, 1, 'both files describe one physical reception')
    assert.deepStrictEqual(receptions[0].files, ['dedeman-split-part1.xml', 'dedeman-split-part2.xml'])
    assert.strictEqual(receptions[0].lines[0].accepted, 20)
    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.CLEAN)
  })

  it('blocks a reception where accepted exceeds shipped instead of reporting a difference', async () => {
    const documents = [
      await parseFixture('dedeman-split-part1.xml'),
      await parseFixture('dedeman-split-part2.xml')
    ]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500005, FINCODE: 'AEX-AE-900005', TRDR: DEDEMAN, NUM04: 4500000005 }],
      lines: [{ FINDOC: 500005, RETAILERCODE: 'TEST0005', EAN: '5949060000005', QTY1: 6 }]
    })

    const { receptions, summary } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.BLOCKED)
    assert.strictEqual(receptions[0].blockedLines[0].delta, -14)
    assert.strictEqual(summary.blocked, 1)
  })

  it('resolves an Auchan file by order number alone', async () => {
    const documents = [await parseFixture('auchan-order-only.xml')]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500010, FINCODE: 'AEX-AE-900010', TRDR: AUCHAN, NUM04: 1900002 }],
      lines: [{ FINDOC: 500010, RETAILERCODE: 'TEST0010', EAN: '5949060000010', QTY1: 100 }]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].resolvedBy, 'order')
    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.CLEAN)
    // Auchan's leading zero is lost on NUM04, so the lookup must be asked for the stripped form.
    assert.deepStrictEqual(lookup.calls.findAdvices[0].orders, ['1900002'])
  })

  it('unions advice and order lookups for a truncated advice, and skips pallet lines', async () => {
    const documents = [await parseFixture('dedeman-truncated-multi-order-pallet.xml')]
    const lookup = makeLookup({
      advices: [
        { FINDOC: 500003, FINCODE: 'AEX-AE-900003', TRDR: DEDEMAN, NUM04: 4500000003 },
        { FINDOC: 500004, FINCODE: 'AEX-AE-900004', TRDR: DEDEMAN, NUM04: 4500000004 }
      ],
      lines: [
        { FINDOC: 500003, RETAILERCODE: 'TEST0003', EAN: '5949060000003', QTY1: 10 },
        { FINDOC: 500004, RETAILERCODE: 'TEST0003', EAN: '5949060000003', QTY1: 6 }
      ]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].resolvedBy, 'advice+order')
    assert.strictEqual(receptions[0].advices.length, 2)
    assert.strictEqual(receptions[0].palletLines, 2)
    assert.strictEqual(receptions[0].lines.length, 1)
    assert.strictEqual(receptions[0].lines[0].shipped, 16, 'quantities from both advices are summed')
    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.CLEAN)
  })

  it('marks a reception unresolved when no advice matches, without failing the batch', async () => {
    const documents = [await parseFixture('dedeman-full-advice.xml')]
    const lookup = makeLookup()

    const { receptions, summary } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.UNRESOLVED)
    assert.strictEqual(receptions[0].advices.length, 0)
    assert.strictEqual(summary.unresolved, 1)
    assert.strictEqual(lookup.calls.findAdviceLines.length, 0, 'no line query without an advice')
  })

  it('marks an accepted product that is not on the advice as unresolved', async () => {
    const documents = [await parseFixture('dedeman-full-advice.xml')]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500001, FINCODE: 'AEX-AE-900001', TRDR: DEDEMAN, NUM04: 4500000001 }],
      lines: [{ FINDOC: 500001, RETAILERCODE: 'TEST0001', EAN: '5949060000001', QTY1: 10 }]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.UNRESOLVED)
    assert.deepStrictEqual(
      receptions[0].unresolvedLines.map((l) => l.buyerItemId),
      ['TEST0002']
    )
  })

  it('reports a GTIN that disagrees with MTRL.CODE1 as a warning only', async () => {
    const documents = [await parseFixture('dedeman-full-advice.xml')]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500001, FINCODE: 'AEX-AE-900001', TRDR: DEDEMAN, NUM04: 4500000001 }],
      lines: [
        { FINDOC: 500001, RETAILERCODE: 'TEST0001', EAN: '5949069999999', QTY1: 10 },
        { FINDOC: 500001, RETAILERCODE: 'TEST0002', EAN: '5949060000002', QTY1: 5 }
      ]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.CLEAN)
    assert.deepStrictEqual(receptions[0].gtinMismatches, [
      { buyerItemId: 'TEST0001', gtin: '5949060000001', ean: '5949069999999' }
    ])
  })

  it('reports advice lines missing from the receipt without scoring them', async () => {
    const documents = [await parseFixture('dedeman-split-part1.xml')]
    const lookup = makeLookup({
      advices: [{ FINDOC: 500005, FINCODE: 'AEX-AE-900005', TRDR: DEDEMAN, NUM04: 4500000005 }],
      lines: [
        { FINDOC: 500005, RETAILERCODE: 'TEST0005', EAN: '5949060000005', QTY1: 16 },
        { FINDOC: 500005, RETAILERCODE: 'TEST0099', EAN: '5949060000099', QTY1: 3 }
      ]
    })

    const { receptions } = await reconcileRecadv({ documents, lookup })

    assert.strictEqual(receptions[0].status, RECEPTION_STATUS.CLEAN)
    assert.deepStrictEqual(receptions[0].missingOnReceipt, [{ retailerCode: 'TEST0099', shipped: 3 }])
  })

  it('never passes a non-numeric order number to the lookup', async () => {
    const doc = await parseFixture('dedeman-full-advice.xml')
    doc.orders = ["4500000001' OR 1=1--", '4500000001']
    const lookup = makeLookup()

    await reconcileRecadv({ documents: [doc], lookup })

    assert.deepStrictEqual(lookup.calls.findAdvices[0].orders, ['4500000001'])
  })

  it('refuses to query with a value that is not numeric', () => {
    assert.throws(() => assertNumericValues(['12', "1;DROP"], 'FINDOC'), /refusing to query FINDOC/)
    assert.deepStrictEqual(assertNumericValues(['12', '340'], 'FINDOC'), ['12', '340'])
  })

  it('strips leading zeros textually rather than through a float', () => {
    assert.strictEqual(normalizeOrderNumber('01900002'), '1900002')
    assert.strictEqual(normalizeOrderNumber('0'), '0')
    assert.strictEqual(normalizeOrderNumber('AEX-1'), null)
    assert.strictEqual(normalizeOrderNumber(''), null)
  })
})
