import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class CccaperakService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getAperaks', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getAperaks failed')
    return { data: result.data, total: result.total }
  }

  async create(data) {
    const url = buildS1Url('/JS/JSRetailers/createAperak', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'createAperak failed')
    // Caller checks result.CCCAPERAK (the PK)
    return { CCCAPERAK: result.CCCAPERAK, ...data }
  }
}

export const getOptions = (app) => {
  return { app }
}
