import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class CccretailersclientsService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getRetailersClients', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getRetailersClients failed')
    return { data: result.data, total: result.total }
  }
}

export const getOptions = (app) => {
  return { app }
}
