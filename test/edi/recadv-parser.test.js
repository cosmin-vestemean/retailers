// Unit tests for infiniteProvider.parseRecadv against anonymized fixtures modeled on the
// real, measured RECADV format (see /memories/repo/edi-recadv-real-format.md).
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { infiniteProvider } from '../../src/edi/providers/infinite.provider.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, 'fixtures', 'recadv')
const readFixture = (name) => fs.readFile(path.join(FIXTURES, name), 'utf-8')

describe('infiniteProvider.parseRecadv', () => {
  it('parses a Dedeman file with a complete advice number and a single order', async () => {
    const xml = await readFixture('dedeman-full-advice.xml')
    const parsed = await infiniteProvider.parseRecadv(xml)

    assert.strictEqual(parsed.documentNumber, '5900000001')
    assert.strictEqual(parsed.buyerGln, '5940475841003')
    assert.strictEqual(parsed.trdr, 11654)
    assert.deepStrictEqual(parsed.orders, ['4500000001'])
    assert.strictEqual(parsed.adviceRaw, 'AEX-AE-900001')
    assert.deepStrictEqual(parsed.adviceSuffixes, ['900001'])
    assert.strictEqual(parsed.adviceTruncated, false)
    assert.strictEqual(parsed.items.length, 2)
    assert.deepStrictEqual(parsed.items[0], {
      buyerItemId: 'TEST0001',
      gtin: '5949060000001',
      accepted: 10,
      description: 'TEST PRODUCT A',
      isPallet: false
    })
    assert.strictEqual(parsed.numberOfItems, 2)
    assert.strictEqual(parsed.numberOfDocuments, 1)
  })

  it('parses an Auchan file with no DeliveryDocumentNumber, resolving only via order', async () => {
    const xml = await readFixture('auchan-order-only.xml')
    const parsed = await infiniteProvider.parseRecadv(xml)

    assert.strictEqual(parsed.buyerGln, '5940475172008')
    assert.strictEqual(parsed.trdr, 13248)
    assert.deepStrictEqual(parsed.orders, ['01900002'])
    assert.strictEqual(parsed.adviceRaw, '')
    assert.deepStrictEqual(parsed.adviceSuffixes, [])
    assert.strictEqual(parsed.adviceTruncated, false)
    assert.strictEqual(parsed.items[0].accepted, 100)
  })

  it('parses a truncated advice, comma-separated orders and skips pallet lines', async () => {
    const xml = await readFixture('dedeman-truncated-multi-order-pallet.xml')
    const parsed = await infiniteProvider.parseRecadv(xml)

    assert.deepStrictEqual(parsed.orders, ['4500000003', '4500000004'])
    assert.strictEqual(parsed.adviceRaw, 'AEX-AE-900003/AE')
    assert.deepStrictEqual(parsed.adviceSuffixes, ['900003'])
    assert.strictEqual(parsed.adviceTruncated, true)

    assert.strictEqual(parsed.items.length, 3)
    const productLines = parsed.items.filter((item) => !item.isPallet)
    const palletLines = parsed.items.filter((item) => item.isPallet)
    assert.strictEqual(productLines.length, 1)
    assert.strictEqual(palletLines.length, 2)
    assert.strictEqual(palletLines[0].description, 'PALET RETURNABIL EURO 120x80')
    assert.strictEqual(palletLines[1].description, 'PALET RETURNABIL NON-EURO 120x80')
    assert.strictEqual(parsed.numberOfItems, 3)
  })

  it('throws on a document missing the RecadvHeader root', async () => {
    await assert.rejects(
      () => infiniteProvider.parseRecadv('<Document><Foo/></Document>'),
      /missing <Document><RecadvHeader> root/
    )
  })
})
