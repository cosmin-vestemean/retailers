import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class MarkInvoiceSentService {
  constructor(options) {
    this.options = options
    this.fetch = options.fetch || fetch
  }

  async create(data) {
    const { findoc, xmlFilename } = data || {}
    const url = buildS1Url('/JS/JSRetailers/markInvoiceSent', { app: this.options.app })
    const response = await this.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findoc, xmlFilename })
    })
    return response.json()
  }
}

export const getOptions = (app) => ({ app })