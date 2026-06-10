import assert from 'node:assert'
import { app } from '../../src/app.js'

describe('dedicated EDI services', () => {
  it('registers edi-orders', () => {
    assert.ok(app.service('edi-orders'))
  })

  it('registers edi-invoices', () => {
    assert.ok(app.service('edi-invoices'))
  })

  it('registers edi-aperaks', () => {
    assert.ok(app.service('edi-aperaks'))
  })
})