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
})