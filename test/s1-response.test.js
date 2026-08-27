import assert from 'assert'
import { parseS1Json } from '../src/s1-response.js'

// SoftOne's Greek object-layer errors (GETLASTERROR etc.) come back as raw windows-1253 bytes,
// even though the Fetch spec's response.text()/.json() always UTF-8-decode regardless of the
// declared Content-Type charset. Verified live 2026-08-27 against /JS/RECADV/createInvoiceFromReception.
function windows1253Response(body) {
  const json = JSON.stringify(body)
  const buffer = Buffer.from(json, 'latin1') // stand-in: bytes below assembled directly per-test
  return {
    status: 200,
    statusText: 'OK',
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json; charset=windows-1253' : null },
    async arrayBuffer() { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) },
    async text() { return json } // wrong decode, only used if the charset path is skipped
  }
}

describe('parseS1Json', () => {
  it('parses a plain UTF-8 response with no Content-Type header (back-compat with existing mocks)', async () => {
    const response = {
      status: 200,
      statusText: 'OK',
      async text() { return JSON.stringify({ success: true, value: 'FINCODE=AEX-AE-055138' }) }
    }
    const result = await parseS1Json(response, 'test')
    assert.strictEqual(result.success, true)
    assert.strictEqual(result.value, 'FINCODE=AEX-AE-055138')
  })

  it('decodes windows-1253 Greek error text declared via Content-Type instead of mangling it', async () => {
    // Raw windows-1253 bytes for "Πρέπει να δοθεί ο αριθμός του παραστατικού" (hex captured live).
    const hex = 'd0f1ddf0e5e920ede120e4efe8e5df20ef20e1f1e9e8ecfcf220f4eff520f0e1f1e1f3f4e1f4e9eaeffd'
    const greekBytes = Buffer.from(hex, 'hex')
    const prefix = Buffer.from('{"success":false,"error":"', 'ascii')
    const suffix = Buffer.from('"}', 'ascii')
    const buffer = Buffer.concat([prefix, greekBytes, suffix])

    const response = {
      status: 200,
      statusText: 'OK',
      headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json; charset=windows-1253' : null },
      async arrayBuffer() { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) },
      async text() { throw new Error('text() should not be used when arrayBuffer() + charset are available') }
    }

    const result = await parseS1Json(response, 'createInvoiceFromReception')
    assert.strictEqual(result.success, false)
    assert.strictEqual(result.error, 'Πρέπει να δοθεί ο αριθμός του παραστατικού')
  })

  it('falls back to text() when the declared charset is unsupported', async () => {
    const response = {
      status: 200,
      statusText: 'OK',
      headers: { get: (name) => name.toLowerCase() === 'content-type' ? 'application/json; charset=not-a-real-charset' : null },
      async arrayBuffer() { throw new Error('should not be called') },
      async text() { return JSON.stringify({ success: true }) }
    }
    const result = await parseS1Json(response, 'test')
    assert.strictEqual(result.success, true)
  })

  it('throws a labeled error on empty response', async () => {
    const response = { status: 500, statusText: 'Internal Server Error', async text() { return '' } }
    await assert.rejects(() => parseS1Json(response, 'myLabel'), /myLabel returned empty response \(HTTP 500 Internal Server Error\)/)
  })
})
