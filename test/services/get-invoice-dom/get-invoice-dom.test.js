import assert from 'assert'
import { GetInvoiceDomService } from '../../../src/services/get-invoice-dom/get-invoice-dom.class.js'

function jsonResponse(body) {
  return {
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json; charset=utf-8' },
    async text() { return JSON.stringify(body) }
  }
}

function makeApp({ sftpRows = [], logCalls = [] } = {}) {
  return {
    get: (key) => (key === 's1BaseUrl' ? 'https://s1.example/s1services' : undefined),
    service(name) {
      if (name === 'CCCSFTP') {
        return { list: async () => ({ data: sftpRows, total: sftpRows.length }) }
      }
      if (name === 'orders-log') {
        return { create: async (row) => { logCalls.push(row); return row } }
      }
      throw new Error('Unexpected service: ' + name)
    }
  }
}

describe('get-invoice-dom service', () => {
  it('routes Infinite retailers to the new AJS builder', async () => {
    const calls = []
    const app = makeApp({ sftpRows: [{ TRDR_RETAILER: 13248, PROVIDER_CODE: 'infinite', PROVIDER_NAME: 'Infinite Edinet' }] })
    const service = new GetInvoiceDomService({
      app,
      async fetch(url) {
        calls.push(url)
        return jsonResponse({ success: true, dom: '<Invoice/>', trimis: false, filename: 'X.xml' })
      }
    })

    const result = await service.find({ query: { clientID: 'c', appID: '1001', findoc: 2205195, trdr: 13248 } })

    assert.ok(calls[0].endsWith('/JS/InfiniteInvoice/buildInvoiceXml'))
    assert.strictEqual(result.dom, '<Invoice/>')
  })

  it('keeps DocProcess retailers on the legacy endpoint', async () => {
    const calls = []
    const app = makeApp({ sftpRows: [{ TRDR_RETAILER: 99999, PROVIDER_CODE: 'docprocess', PROVIDER_NAME: 'DocProcess' }] })
    const service = new GetInvoiceDomService({
      app,
      async fetch(url) {
        calls.push(url)
        return jsonResponse({ dom: '<DXInvoice/>', trimis: false, filename: 'Y.xml' })
      }
    })

    await service.find({ query: { clientID: 'c', appID: '1001', findoc: 1, trdr: 99999 } })

    assert.ok(calls[0].endsWith('/JS/runCmd20210915/runExternalCode'))
  })

  it('falls back to the legacy endpoint when trdr is missing', async () => {
    const calls = []
    const service = new GetInvoiceDomService({
      app: makeApp(),
      async fetch(url) {
        calls.push(url)
        return jsonResponse({ dom: '<DXInvoice/>' })
      }
    })

    await service.find({ query: { clientID: 'c', appID: '1001', findoc: 1 } })

    assert.ok(calls[0].endsWith('/JS/runCmd20210915/runExternalCode'))
  })

  it('logs a failure to orders-log when Infinite validation fails, without touching the legacy path', async () => {
    const logCalls = []
    const app = makeApp({
      sftpRows: [{ TRDR_RETAILER: 11654, PROVIDER_CODE: 'infinite', PROVIDER_NAME: 'Infinite Edinet' }],
      logCalls
    })
    const service = new GetInvoiceDomService({
      app,
      async fetch() {
        return jsonResponse({ success: false, dom: null, trimis: false, filename: null, message: 'Linia 1: <EAN> lipsa' })
      }
    })

    await service.find({ query: { clientID: 'c', appID: '1001', findoc: 2205510, trdr: 11654 } })

    assert.strictEqual(logCalls.length, 1)
    assert.strictEqual(logCalls[0].OPERATION, 'buildInvoiceXml')
    assert.strictEqual(logCalls[0].LEVEL, 'error')
    assert.ok(logCalls[0].MESSAGETEXT.includes('EAN'))
  })

  it('does not log to orders-log on a successful DocProcess or Infinite build', async () => {
    const logCalls = []
    const app = makeApp({
      sftpRows: [{ TRDR_RETAILER: 13248, PROVIDER_CODE: 'infinite', PROVIDER_NAME: 'Infinite Edinet' }],
      logCalls
    })
    const service = new GetInvoiceDomService({
      app,
      async fetch() {
        return jsonResponse({ success: true, dom: '<Invoice/>', trimis: false, filename: 'X.xml' })
      }
    })

    await service.find({ query: { clientID: 'c', appID: '1001', findoc: 1, trdr: 13248 } })

    assert.strictEqual(logCalls.length, 0)
  })
})
