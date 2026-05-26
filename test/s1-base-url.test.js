import assert from 'node:assert'

import { buildS1Url, resolveS1BaseUrl } from '../src/s1-base-url.js'

describe('s1-base-url', function () {
  let previousBaseUrl

  beforeEach(() => {
    previousBaseUrl = process.env.S1_BASE_URL
    delete process.env.S1_BASE_URL
  })

  afterEach(() => {
    if (previousBaseUrl === undefined) delete process.env.S1_BASE_URL
    else process.env.S1_BASE_URL = previousBaseUrl
  })

  it('uses the explicit url when provided', () => {
    assert.strictEqual(
      buildS1Url('/JS/JSRetailers/getOrdersData', 'https://dev.example/s1services/'),
      'https://dev.example/s1services/JS/JSRetailers/getOrdersData'
    )
  })

  it('uses app config when no explicit url is provided', () => {
    const app = { get(key) { return key === 's1BaseUrl' ? 'https://cfg.example/s1services/' : undefined } }
    assert.strictEqual(resolveS1BaseUrl({ app }), 'https://cfg.example/s1services')
  })

  it('throws when no url is configured', () => {
    assert.throws(() => resolveS1BaseUrl(), /S1 base URL is not configured/)
  })
})