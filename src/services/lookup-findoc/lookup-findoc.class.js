import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class LookupFindocService {
  constructor(options) {
    this.options = options
  }

  async create(data) {
    const { trdr, orderId, xmlFilename } = data
    const url = buildS1Url('/JS/JSRetailers/lookupFindoc', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trdr, orderId, xmlFilename })
    })
    return response.json()
  }
}

export const getOptions = (app) => ({ app })
