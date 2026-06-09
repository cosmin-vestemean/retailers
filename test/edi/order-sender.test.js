import assert from 'node:assert'
import { feathers } from '@feathersjs/feathers'

import { sendOrderToS1 } from '../../src/edi/order-sender.js'

describe('order-sender', function () {
  it('passes the resolved S1 url to setDocument and marks the row as SENT', async () => {
    const app = feathers()
    const setDocumentCalls = []
    const patches = []
    const logs = []

    app.use('setDocument', {
      async create(data, params) {
        setDocumentCalls.push({ data, params })
        return { success: true, id: '12345' }
      }
    }, { methods: ['create'] })

    app.use('CCCSFTPXML', {
      async patch(id, data) {
        patches.push({ id, data })
        return { id, ...data }
      }
    }, { methods: ['patch'] })

    app.use('orders-log', {
      async create(data) {
        logs.push(data)
        return data
      }
    }, { methods: ['create'] })

    const res = await sendOrderToS1({
      app,
      jsonOrder: { service: 'setData', clientID: 'TOKEN', OBJECT: 'SALDOC' },
      s1BaseUrl: 'https://dev-petfactory.oncloud.gr/s1services',
      retailer: 99888,
      orderId: 'ORDERS_TEST_DX01_900000001.xml',
      cccsftpxmlId: 77,
      retries: 0
    })

    assert.deepStrictEqual(res, { success: true, id: 12345 })
    assert.strictEqual(setDocumentCalls.length, 1)
    assert.strictEqual(setDocumentCalls[0].params.query.url, 'https://dev-petfactory.oncloud.gr/s1services')
    assert.deepStrictEqual(patches, [{
      id: 77,
      data: { FINDOC: 12345, XMLSTATUS: 'SENT', XMLERROR: '' }
    }])
    assert.strictEqual(logs.length, 1)
    assert.strictEqual(logs[0].LEVEL, 'success')
  })

  it('links an existing order by NUM04 and skips setDocument', async () => {
    const app = feathers()
    const setDocumentCalls = []
    const patches = []
    const logs = []

    app.use('setDocument', {
      async create(data, params) {
        setDocumentCalls.push({ data, params })
        return { success: true, id: '99999' }
      }
    }, { methods: ['create'] })

    app.use('CCCSFTPXML', {
      async patch(id, data) {
        patches.push({ id, data })
        return { id, ...data }
      }
    }, { methods: ['patch'] })

    app.use('orders-log', {
      async create(data) {
        logs.push(data)
        return data
      }
    }, { methods: ['create'] })

    const res = await sendOrderToS1({
      app,
      jsonOrder: {
        service: 'setData',
        clientID: 'TOKEN',
        OBJECT: 'SALDOC',
        DATA: { SALDOC: [{ TRDR: 11322, NUM04: '1833989' }] }
      },
      s1BaseUrl: 'https://dev-petfactory.oncloud.gr/s1services',
      retailer: 11322,
      orderId: 'ORDERS_DX01_144_20260513_01001345_VAT_RO17275880.xml',
      cccsftpxmlId: 7053,
      retries: 0,
      duplicateLookup: async ({ trdr, num04 }) => ({ trdr, num04, findoc: 2123739, fincode: 'CKEY-00059455' })
    })

    assert.deepStrictEqual(res, { success: true, id: 2123739, duplicate: true, fincode: 'CKEY-00059455' })
    assert.strictEqual(setDocumentCalls.length, 0)
    assert.strictEqual(patches.length, 1)
    assert.deepStrictEqual(patches[0], {
      id: 7053,
      data: {
        FINDOC: 2123739,
        XMLSTATUS: 'SENT',
        XMLERROR: 'Duplicate NUM04 guard: existing FINDOC=2123739 FINCODE=CKEY-00059455 NUM04=1833989'
      }
    })
    assert.strictEqual(logs.length, 1)
    assert.strictEqual(logs[0].OPERATION, 'duplicateGuard')
    assert.strictEqual(logs[0].LEVEL, 'warn')
  })

  it('fails closed when the NUM04 duplicate lookup fails', async () => {
    const app = feathers()
    const setDocumentCalls = []
    const patches = []
    const logs = []

    app.use('setDocument', {
      async create(data, params) {
        setDocumentCalls.push({ data, params })
        return { success: true, id: '99999' }
      }
    }, { methods: ['create'] })

    app.use('CCCSFTPXML', {
      async patch(id, data) {
        patches.push({ id, data })
        return { id, ...data }
      }
    }, { methods: ['patch'] })

    app.use('orders-log', {
      async create(data) {
        logs.push(data)
        return data
      }
    }, { methods: ['create'] })

    const res = await sendOrderToS1({
      app,
      jsonOrder: {
        service: 'setData',
        clientID: 'TOKEN',
        OBJECT: 'SALDOC',
        DATA: { SALDOC: [{ TRDR: 11322, NUM04: '1833989' }] }
      },
      s1BaseUrl: 'https://dev-petfactory.oncloud.gr/s1services',
      retailer: 11322,
      orderId: 'ORDERS_DX01_144_20260513_01001345_VAT_RO17275880.xml',
      cccsftpxmlId: 7053,
      retries: 0,
      duplicateLookup: async () => ({ lookupError: 'S1 unavailable', num04: '1833989', trdr: 11322 })
    })

    assert.deepStrictEqual(res, { success: false, errors: ['Duplicate NUM04 guard lookup failed: S1 unavailable'] })
    assert.strictEqual(setDocumentCalls.length, 0)
    assert.deepStrictEqual(patches, [{
      id: 7053,
      data: { XMLSTATUS: 'ERROR', XMLERROR: 'Duplicate NUM04 guard lookup failed: S1 unavailable' }
    }])
    assert.strictEqual(logs.length, 1)
    assert.strictEqual(logs[0].OPERATION, 'duplicateGuard')
    assert.strictEqual(logs[0].LEVEL, 'error')
  })
})