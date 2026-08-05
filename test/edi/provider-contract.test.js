// Locks the provider contract that decides what the scanner is allowed to fetch.
// `docTypes` is the only gate: a type absent from it is never listed, which is what keeps
// the parked RETANN/RECADV flows off the live Infinite account (the July 2026 portal
// read-flag incident). `filenamePrefixes` is only a filter on top.
import assert from 'node:assert'

import { infiniteProvider } from '../../src/edi/providers/infinite.provider.js'
import { docProcessProvider } from '../../src/edi/providers/docprocess.provider.js'

describe('EDI provider contract', () => {
  afterEach(() => { delete process.env.EDI_ENABLE_RECADV })

  it('Infinite scans orders only by default — retann waits on RO-7627, recadv on the reception screen', () => {
    assert.deepStrictEqual(infiniteProvider.docTypes, ['orders'])
  })

  it('Infinite picks up recadv only when EDI_ENABLE_RECADV is explicitly true', () => {
    process.env.EDI_ENABLE_RECADV = 'true'
    assert.deepStrictEqual(infiniteProvider.docTypes, ['orders', 'recadv'])
    process.env.EDI_ENABLE_RECADV = '1'
    assert.deepStrictEqual(infiniteProvider.docTypes, ['orders'], 'only the literal string "true" activates it')
  })

  it('Infinite exposes no parseAperak — its acknowledgements are RECADV, never CCCAPERAK rows', () => {
    assert.strictEqual(infiniteProvider.parseAperak, undefined)
    assert.strictEqual(typeof infiniteProvider.parseRecadv, 'function')
  })

  it('Infinite retann lives in /retann/, not the /retanns/ of the vendor doc', () => {
    assert.strictEqual(infiniteProvider.remoteSubdir('retann'), '/retann/')
    assert.strictEqual(infiniteProvider.remoteSubdir('recadv'), '/recadv/')
    assert.strictEqual(infiniteProvider.remoteSubdir('orders'), '/orders/')
  })

  it('Infinite prefixes retailer-scope orders only; recadv/retann filenames are numeric', () => {
    assert.deepStrictEqual(infiniteProvider.filenamePrefixes('orders', { TRDR_RETAILER: 13248 }), ['AUCHAN_'])
    assert.deepStrictEqual(infiniteProvider.filenamePrefixes('orders', { TRDR_RETAILER: 11654 }), ['DEDEMAN_'])
    assert.deepStrictEqual(infiniteProvider.filenamePrefixes('orders', {}), ['AUCHAN_', 'DEDEMAN_'])
    assert.deepStrictEqual(infiniteProvider.filenamePrefixes('recadv', { TRDR_RETAILER: 11654 }), [])
    assert.deepStrictEqual(infiniteProvider.filenamePrefixes('retann', { TRDR_RETAILER: 11654 }), [])
  })

  it('DocProcess keeps its real aperak flow and always filters — its docTypes share one inbox', () => {
    assert.deepStrictEqual(docProcessProvider.docTypes, ['orders', 'aperak'])
    assert.strictEqual(typeof docProcessProvider.parseAperak, 'function')
    assert.strictEqual(docProcessProvider.remoteSubdir('aperak'), '')
    for (const docType of docProcessProvider.docTypes) {
      const prefixes = docProcessProvider.filenamePrefixes(docType)
      assert.ok(prefixes.length > 0, `${docType} must keep a prefix filter on the shared inbox`)
    }
  })
})
