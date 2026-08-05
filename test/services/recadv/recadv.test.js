import assert from 'assert'
import { RecadvService } from '../../../src/services/recadv/recadv.class.js'

function jsonResponse(body) {
  return {
    status: 200,
    statusText: 'OK',
    async text() { return JSON.stringify(body) }
  }
}

describe('recadv service', () => {
  it('merges reconciliation status onto the paginated advice list', async () => {
    const cleanDoc = {
      documentNumber: 'DOC-CLEAN',
      trdr: 11654,
      buyerGln: '5940475841003',
      adviceSuffixes: ['000100'],
      adviceTruncated: false,
      orders: [],
      items: [
        { buyerItemId: 'ABC', description: 'Product A', gtin: '111', accepted: 10, isPallet: false }
      ]
    }

    const calls = []
    const app = { get: (key) => (key === 's1BaseUrl' ? 'https://s1.example/s1services' : undefined) }

    const service = new RecadvService({
      app,
      async fetch(url, options) {
        calls.push(url)
        const body = JSON.parse(options.body)

        if (url.endsWith('/getReceptionsData')) {
          return jsonResponse({
            success: true,
            page: 1,
            pageSize: 25,
            total: 2,
            data: [
              { FINDOC: 100, FINCODE: 'AEX-AE-000100', TRDBRANCH: 1, NUM04: 555, TRNDATE: '2026-08-01 10:00:00', INVOICED: 0 },
              { FINDOC: 200, FINCODE: 'AEX-AE-000200', TRDBRANCH: 2, NUM04: 556, TRNDATE: '2026-08-02 10:00:00', INVOICED: 1 }
            ]
          })
        }
        if (url.endsWith('/getRecadvDocuments')) {
          return jsonResponse({
            success: true,
            data: [{ CCCSFTPXML: 1, XMLFILENAME: 'RECADV_1.xml', JSONDATA: JSON.stringify(cleanDoc) }]
          })
        }
        if (url.endsWith('/getAdvicesByCode')) {
          assert.strictEqual(body.trdr, 11654)
          return jsonResponse({ success: true, data: [{ FINDOC: 100, FINCODE: 'AEX-AE-000100', TRDR: 11654, NUM04: 555 }] })
        }
        if (url.endsWith('/getAdvicesByOrder')) {
          return jsonResponse({ success: true, data: [] })
        }
        if (url.endsWith('/getAdviceLines')) {
          return jsonResponse({ success: true, data: [{ FINDOC: 100, RETAILERCODE: 'ABC', EAN: '111', QTY1: 10 }] })
        }
        throw new Error(`Unexpected AJS call: ${url}`)
      }
    })

    const result = await service.find({ query: { trdr: 11654, page: 1, pageSize: 25, daysOlder: 30 } })

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.total, 2)
    assert.strictEqual(result.data.length, 2)

    const clean = result.data.find((r) => r.FINDOC === 100)
    assert.strictEqual(clean.reconciliation.status, 'clean')
    assert.strictEqual(clean.reconciliation.lines[0].delta, 0)

    const notReceived = result.data.find((r) => r.FINDOC === 200)
    assert.strictEqual(notReceived.reconciliation.status, 'not_received')

    assert.ok(calls.some((u) => u.endsWith('/JS/RECADV/getReceptionsData')))
  })

  it('rejects a missing/invalid trdr without calling AJS', async () => {
    const service = new RecadvService({
      app: { get: () => 'https://s1.example/s1services' },
      async fetch() { throw new Error('fetch should not be called') }
    })

    const result = await service.find({ query: {} })
    assert.strictEqual(result.success, false)
    assert.match(result.error, /trdr/i)
  })
})
