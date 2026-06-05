// Unit/integration test for buildOrderPayload with mocked AJS fetch.
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { feathers } from '@feathersjs/feathers'

import { buildOrderPayload } from '../../src/edi/order-builder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(__dirname, 'fixtures', 'docprocess', 'out', 'ORDERS_TEST_DX01_900000001.xml')

function makeApp({ ajsLog }) {
  const app = feathers()
  app.use('CCCRETAILERSCLIENTS', {
    async find() {
      return { data: [{ WSURL: 'http://example.invalid', WSUSER: 'u', WSPASS: 'p' }] }
    }
  }, { methods: ['find'] })
  app.use('connectToS1', {
    async find() { return { token: 'TEST-TOKEN' } }
  }, { methods: ['find'] })
  app.use('CCCDOCUMENTES1MAPPINGS', {
    async find() { return { data: [{ CCCDOCUMENTES1MAPPINGS: 42 }] } }
  }, { methods: ['find'] })
  app.use('CCCXMLS1MAPPINGS', {
    async find() {
      return {
        data: [
          { S1TABLE1: 'SALDOC', S1FIELD1: 'TRDR', XMLNODE: 'BuyerCustomerParty/EndpointID', SQL: 'SELECT TRDR FROM TRDR WHERE AFM=:value' },
          { S1TABLE1: 'SALDOC', S1FIELD1: 'SERIES', XMLNODE: 'OrderTypeCode', SQL: null },
          { S1TABLE1: 'ITELINES', S1FIELD1: 'MTRL', XMLNODE: 'OrderLine/Item/StandardItemIdentification', SQL: 'SELECT MTRL FROM MTRL WHERE CODE1=:value' },
          { S1TABLE1: 'ITELINES', S1FIELD1: 'QTY1', XMLNODE: 'OrderLine/Quantity/Amount', SQL: null }
        ]
      }
    }
  }, { methods: ['find'] })
  app.use('orders-log', {
    async create(data) { ajsLog.push(data); return data }
  }, { methods: ['create'] })
  return app
}

describe('order-builder: AJS fetch mock', function () {
  this.timeout(15000)

  it('substitutes SQL fields via runMappingSql and builds SALDOC payload', async () => {
    const xml = await fs.readFile(FIXTURE, 'utf-8')
    const ajsLog = []
    const calls = []

    // Mock fetch: route runMappingSql by SQL string.
    const fetchMock = async (url, init) => {
      const body = JSON.parse(init.body)
      calls.push({ url, body })
      let answer
      if (body.sql.includes('FROM TRDR')) answer = 'TRDR_42'
      else if (body.sql.includes('FROM MTRL')) answer = `MTRL_${body.value}`
      else answer = 'UNKNOWN'
      return { json: async () => ({ success: true, data: answer }) }
    }

    const app = makeApp({ ajsLog })
    const { jsonOrder, errors, s1BaseUrl } = await buildOrderPayload({
      xml,
      sosource: 1351,
      fprms: 7531,
      series: 220,
      retailer: 99888,
      orderId: 'TEST-DX-ORDER-0001',
      cccsftpxml: 1,
      app,
      fetchImpl: fetchMock
    })

    assert.deepStrictEqual(errors, [], `unexpected errors: ${JSON.stringify(errors)}`)
    assert.strictEqual(s1BaseUrl, 'http://example.invalid')
    assert.strictEqual(jsonOrder.OBJECT, 'SALDOC')
    assert.strictEqual(jsonOrder.FORM, 'EFIntegrareRetailers')
    assert.strictEqual(jsonOrder.clientID, 'TEST-TOKEN')
    assert.strictEqual(jsonOrder.DATA.SALDOC[0].TRDR, 99888)
    assert.strictEqual(jsonOrder.DATA.SALDOC[0].SERIES, 220)
    assert.strictEqual(jsonOrder.DATA.ITELINES[0].MTRL, 'MTRL_5949060900001')
    assert.strictEqual(jsonOrder.DATA.ITELINES[0].QTY1, '6000')
    assert.strictEqual(jsonOrder.DATA.ITELINES.length, 1)
    assert.strictEqual(ajsLog.length, 0)
    assert.strictEqual(calls.length, 2, 'exactly two runMappingSql calls (TRDR + MTRL)')
    assert.ok(calls.every((call) => call.url === 'http://example.invalid/JS/JSRetailers/runMappingSql'))
  })

  it('logs mapping error when runMappingSql returns no data', async () => {
    const xml = await fs.readFile(FIXTURE, 'utf-8')
    const ajsLog = []
    const fetchMock = async (url, init) => {
      const body = JSON.parse(init.body)
      if (body.sql.includes('FROM TRDR')) return { json: async () => ({ success: true, data: '' }) }
      return { json: async () => ({ success: true, data: `M_${body.value}` }) }
    }
    const app = makeApp({ ajsLog })
    const { errors } = await buildOrderPayload({
      xml, sosource: 1351, fprms: 7531, series: 220, retailer: 99888,
      orderId: 'X', cccsftpxml: 7, app, fetchImpl: fetchMock
    })
    assert.strictEqual(errors.length, 1)
    assert.match(errors[0].message, /No row from mapping SQL/)
    assert.strictEqual(ajsLog.length, 1)
    assert.strictEqual(ajsLog[0].LEVEL, 'error')
    assert.strictEqual(ajsLog[0].CCCSFTPXML, 7)
  })
})
