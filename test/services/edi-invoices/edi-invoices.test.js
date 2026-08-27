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

function fakeTransport({ landed = true, uploadError = null, listError = null } = {}) {
  const calls = { uploaded: [], listed: [], closed: false }
  return {
    calls,
    async uploadBuffer(buffer, remotePath) {
      calls.uploaded.push(remotePath)
      if (uploadError) throw uploadError
    },
    async list(dir) {
      calls.listed.push(dir)
      if (listError) throw listError
      return landed ? [{ name: 'FAEX1-PF-40689_2026-08-27.xml', size: 100, modifyTime: new Date() }] : []
    },
    async close() { calls.closed = true }
  }
}

describe('edi-invoices service', () => {
  it('confirms the upload landed on the FTP before reporting success, and logs it', async () => {
    const logCalls = []
    const app = makeApp({ sftpRows: [DOCPROCESS_ROW], logCalls })
    const transport = fakeTransport({ landed: true })
    const service = new EdiInvoicesService({ app, buildTransport: () => transport })

    const result = await service.create({
      retailer: 13248, findoc: 2208760, xml: '<Invoice/>', filename: 'FAEX1-PF-40689_2026-08-27.xml'
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(transport.calls.uploaded.length, 1)
    assert.strictEqual(transport.calls.listed.length, 1)
    assert.ok(transport.calls.closed)
    assert.strictEqual(logCalls.length, 1)
    assert.strictEqual(logCalls[0].OPERATION, 'sendInvoice')
    assert.strictEqual(logCalls[0].LEVEL, 'success')
  })

  it('reports failure and logs an error when the file is not listed after upload', async () => {
    const logCalls = []
    const app = makeApp({ sftpRows: [DOCPROCESS_ROW], logCalls })
    const transport = fakeTransport({ landed: false })
    const service = new EdiInvoicesService({ app, buildTransport: () => transport })

    const result = await service.create({
      retailer: 13248, findoc: 2208760, xml: '<Invoice/>', filename: 'FAEX1-PF-40689_2026-08-27.xml'
    })

    assert.strictEqual(result.success, false)
    assert.ok(/nu a putut fi confirmat pe FTP/.test(result.message))
    assert.strictEqual(logCalls.length, 1)
    assert.strictEqual(logCalls[0].LEVEL, 'error')
  })

  it('treats a listing error after upload as a failed verification, not a thrown exception', async () => {
    const app = makeApp({ sftpRows: [DOCPROCESS_ROW] })
    const transport = fakeTransport({ listError: new Error('LIST timed out') })
    const service = new EdiInvoicesService({ app, buildTransport: () => transport })

    const result = await service.create({
      retailer: 13248, findoc: 2208760, xml: '<Invoice/>', filename: 'X.xml'
    })

    assert.strictEqual(result.success, false)
    assert.ok(transport.calls.closed)
  })

  it('still fails closed and logs when the upload itself throws', async () => {
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
