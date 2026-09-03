import assert from 'assert'
import { EdiInvoicesService } from '../../../src/services/edi-invoices/edi-invoices.class.js'

function makeApp({ sftpRows, logCalls = [] } = {}) {
  return {
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

const DOCPROCESS_ROW = { TRDR_RETAILER: 13248, PROVIDER_CODE: 'docprocess', PROVIDER_NAME: 'DocProcess', INITIALDIROUT: '/outbound', PROVIDER_CONNTYPE: 1 }

function fakeTransport({ uploadError = null } = {}) {
  const calls = { uploaded: [], closed: false }
  return {
    calls,
    async uploadBuffer(buffer, remotePath) {
      calls.uploaded.push(remotePath)
      if (uploadError) throw uploadError
    },
    async close() { calls.closed = true }
  }
}

describe('edi-invoices service', () => {
  it('uploads the file to FTP, reports success, and logs it', async () => {
    const logCalls = []
    const app = makeApp({ sftpRows: [DOCPROCESS_ROW], logCalls })
    const transport = fakeTransport()
    const service = new EdiInvoicesService({ app, buildTransport: () => transport })

    const result = await service.create({
      retailer: 13248, findoc: 2208760, xml: '<Invoice/>', filename: 'FAEX1-PF-40689_2026-08-27.xml'
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(transport.calls.uploaded.length, 1)
    assert.ok(transport.calls.closed)
    assert.strictEqual(logCalls.length, 1)
    assert.strictEqual(logCalls[0].OPERATION, 'sendInvoice')
    assert.strictEqual(logCalls[0].LEVEL, 'success')
  })

  it('fails closed and logs when the upload itself throws', async () => {
    const logCalls = []
    const app = makeApp({ sftpRows: [DOCPROCESS_ROW], logCalls })
    const transport = fakeTransport({ uploadError: new Error('ECONNRESET') })
    const service = new EdiInvoicesService({ app, buildTransport: () => transport })

    const result = await service.create({
      retailer: 13248, findoc: 2208760, xml: '<Invoice/>', filename: 'X.xml'
    })

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.message, 'ECONNRESET')
    assert.strictEqual(logCalls.length, 1)
    assert.strictEqual(logCalls[0].LEVEL, 'error')
  })

  it('rejects and logs when no SFTP config exists for the retailer', async () => {
    const logCalls = []
    const app = makeApp({ sftpRows: [], logCalls })
    const service = new EdiInvoicesService({ app, buildTransport: () => fakeTransport() })

    const result = await service.create({ retailer: 99999, findoc: 1, xml: '<X/>', filename: 'x.xml' })

    assert.strictEqual(result.success, false)
    assert.ok(/Missing SFTP config/.test(result.message))
    assert.strictEqual(logCalls.length, 1)
  })
})
