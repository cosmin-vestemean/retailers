// Unit/integration test for buildOrderPayload with mocked AJS fetch.
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { feathers } from '@feathersjs/feathers'

import { buildOrderPayload, formatMappingErrorMessage } from '../../src/edi/order-builder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(__dirname, 'fixtures', 'docprocess', 'out', 'ORDERS_TEST_DX01_900000001.xml')
const AUCHAN_FIXTURE = path.join(__dirname, 'fixtures', 'mapping-errors', 'AUCHAN_mapping_error_332216.xml')

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
    async find({ query }) {
      const id = query?.TRDR_RETAILER === 13248 ? 13248 : 42
      return { data: [{ CCCDOCUMENTES1MAPPINGS: id }] }
    }
  }, { methods: ['find'] })
  app.use('CCCXMLS1MAPPINGS', {
    async find({ query }) {
      if (query?.CCCDOCUMENTES1MAPPINGS === 13248) {
        return {
          data: [
            { S1TABLE1: 'SALDOC', S1FIELD1: 'TRDBRANCH', XMLNODE: 'Order/OrderParty/ShipToParty/GLN', SQL: "select trdbranch from trdbranch where trdr=13248 AND cccs1dxgln='{value}'" },
            { S1TABLE1: 'ITELINES', S1FIELD1: 'MTRL', XMLNODE: 'Order/OrderDetail/Item/BuyerItemID', SQL: "select mtrl from CCCS1DXTRDRMTRL where trdr=13248 and code='{value}'" },
            { S1TABLE1: 'ITELINES', S1FIELD1: 'QTY1', XMLNODE: 'Order/OrderDetail/Item/QuantityOrdered', SQL: null }
          ]
        }
      }
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

function jsonResponse(body, status = 200, statusText = 'OK') {
  return {
    status,
    statusText,
    text: async () => JSON.stringify(body)
  }
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
      return jsonResponse({ success: true, data: answer })
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
      if (body.sql.includes('FROM TRDR')) return jsonResponse({ success: true, data: '' })
      return jsonResponse({ success: true, data: `M_${body.value}` })
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

  for (const response of [
    { label: 'empty response', response: { status: 502, statusText: 'Bad Gateway', text: async () => '' }, expected: /runMappingSql returned empty response \(HTTP 502 Bad Gateway\)/ },
    { label: 'non-JSON response', response: { status: 503, statusText: 'Service Unavailable', text: async () => '<html>upstream unavailable</html>' }, expected: /runMappingSql returned non-JSON response \(HTTP 503 Service Unavailable\): <html>upstream unavailable<\/html>/ }
  ]) {
    it(`logs a descriptive mapping error for ${response.label}`, async () => {
      const xml = await fs.readFile(FIXTURE, 'utf-8')
      const ajsLog = []
      const app = makeApp({ ajsLog })
      const { errors } = await buildOrderPayload({
        xml, sosource: 1351, fprms: 7531, series: 220, retailer: 99888,
        orderId: 'X', cccsftpxml: 7, app, fetchImpl: async () => response.response
      })

      assert.strictEqual(errors.length, 2)
      assert.match(errors[0].message, response.expected)
      assert.strictEqual(ajsLog.length, 2)
      assert.match(ajsLog[0].MESSAGETEXT, response.expected)
    })
  }
})

describe('order-builder: structured MTRL_NOTFOUND / TRDBRANCH_NOTFOUND mapping errors', function () {
  this.timeout(15000)

  it('builds a structured MTRL_NOTFOUND error with xmlValue/xmlDescription/remedyLocation (real Auchan XML)', async () => {
    const xml = await fs.readFile(AUCHAN_FIXTURE, 'utf-8')
    const ajsLog = []
    const fetchMock = async (url, init) => {
      const body = JSON.parse(init.body)
      if (body.sql.toLowerCase().includes('trdbranch')) return jsonResponse({ success: true, data: 7875 })
      if (body.value === '332216') return jsonResponse({ success: true, data: '' }) // unmapped MTRL
      return jsonResponse({ success: true, data: `MTRL_${body.value}` })
    }
    const app = makeApp({ ajsLog })
    const { errors } = await buildOrderPayload({
      xml, sosource: 1351, fprms: 701, series: 7012, retailer: 13248,
      orderId: 'AUCHAN_182540228.xml', cccsftpxml: 7566, app, fetchImpl: fetchMock
    })

    assert.strictEqual(errors.length, 1, `expected exactly one error: ${JSON.stringify(errors)}`)
    const [err] = errors
    assert.strictEqual(err.type, 'MTRL_NOTFOUND')
    assert.strictEqual(err.field, 'MTRL')
    assert.strictEqual(err.xmlValue, '332216')
    assert.strictEqual(err.xmlDescription, 'RECOMPENSA NAT. TON MIAU MIAU')
    assert.strictEqual(err.remedyLocation, 'CCCS1DXTRDRMTRL — mapare cod articol retailer către MTRL')

    const message = formatMappingErrorMessage(err)
    assert.match(message, /\[MTRL_NOTFOUND\]/)
    assert.match(message, /332216/)
    assert.match(message, /RECOMPENSA NAT\. TON MIAU MIAU/)

    assert.strictEqual(ajsLog.length, 1)
    assert.strictEqual(ajsLog[0].OPERATION, 'mappingError')
    assert.strictEqual(ajsLog[0].LEVEL, 'error')
    assert.match(ajsLog[0].MESSAGETEXT, /\[MTRL_NOTFOUND\]/)
    assert.match(ajsLog[0].MESSAGETEXT, /SQL: select mtrl from CCCS1DXTRDRMTRL/)
  })

  it('builds a structured TRDBRANCH_NOTFOUND error with xmlValue/xmlDescription/remedyLocation (real Auchan XML)', async () => {
    const xml = await fs.readFile(AUCHAN_FIXTURE, 'utf-8')
    const ajsLog = []
    const fetchMock = async (url, init) => {
      const body = JSON.parse(init.body)
      if (body.sql.toLowerCase().includes('trdbranch')) return jsonResponse({ success: true, data: '' }) // unmapped GLN
      return jsonResponse({ success: true, data: `MTRL_${body.value}` })
    }
    const app = makeApp({ ajsLog })
    const { errors } = await buildOrderPayload({
      xml, sosource: 1351, fprms: 701, series: 7012, retailer: 13248,
      orderId: 'AUCHAN_182528560.xml', cccsftpxml: 7536, app, fetchImpl: fetchMock
    })

    assert.strictEqual(errors.length, 1, `expected exactly one error: ${JSON.stringify(errors)}`)
    const [err] = errors
    assert.strictEqual(err.type, 'TRDBRANCH_NOTFOUND')
    assert.strictEqual(err.field, 'TRDBRANCH')
    assert.strictEqual(err.xmlValue, '5949084999266')
    assert.strictEqual(err.xmlDescription, 'EXIGENT')
    assert.strictEqual(err.remedyLocation, 'TRDBRANCH.CCCS1DXGLN — mapare GLN punct de livrare către punct de lucru')

    const message = formatMappingErrorMessage(err)
    assert.match(message, /\[TRDBRANCH_NOTFOUND\]/)
    assert.match(message, /5949084999266/)
    assert.match(message, /EXIGENT/)

    assert.strictEqual(ajsLog.length, 1)
    assert.match(ajsLog[0].MESSAGETEXT, /\[TRDBRANCH_NOTFOUND\]/)
  })

  it('generic (non MTRL/TRDBRANCH) mapping errors keep the plain message format', () => {
    const err = { field: 'TRDR', value: '0000000000020', sql: 'SELECT TRDR FROM TRDR WHERE AFM=:value', message: 'No row from mapping SQL for field TRDR value 0000000000020' }
    const message = formatMappingErrorMessage(err)
    assert.doesNotMatch(message, /\[TRDR_NOTFOUND\]/)
    assert.match(message, /\[TRDR\] valoarea "0000000000020" nerezolvată/)
  })
})
