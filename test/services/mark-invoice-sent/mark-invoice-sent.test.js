import assert from 'assert'
import { MarkInvoiceSentService } from '../../../src/services/mark-invoice-sent/mark-invoice-sent.class.js'

describe('mark-invoice-sent service', () => {
  it('calls the AJS endpoint that sets CCCXMLSendDate with GETDATE()', async () => {
    let capturedUrl = null
    let capturedBody = null
    const app = { get: (key) => key === 's1BaseUrl' ? 'https://s1.example/s1services' : undefined }
    const service = new MarkInvoiceSentService({
      app,
      async fetch(url, options) {
        capturedUrl = url
        capturedBody = JSON.parse(options.body)
        return {
          async json() {
            return { success: true, findoc: 2144463, CCCXMLSendDate: '2026-06-10 12:34:56' }
          }
        }
      }
    })

    const result = await service.create({ findoc: 2144463, xmlFilename: 'INVOIC_38714.xml' })

    assert.strictEqual(capturedUrl, 'https://s1.example/s1services/JS/JSRetailers/markInvoiceSent')
    assert.deepStrictEqual(capturedBody, { findoc: 2144463, xmlFilename: 'INVOIC_38714.xml' })
    assert.strictEqual(result.CCCXMLSendDate, '2026-06-10 12:34:56')
  })
})