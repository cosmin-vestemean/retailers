import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class Cccdocumentes1MappingsService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getDocumentMappings', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getDocumentMappings failed')
    return { data: result.data, total: result.total }
  }

  async create(data) {
    const url = buildS1Url('/JS/JSRetailers/createDocumentMapping', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'createDocumentMapping failed')
    return result
  }

  async remove(id) {
    const url = buildS1Url('/JS/JSRetailers/removeDocumentMapping', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'removeDocumentMapping failed')
    return result
  }
}

export const getOptions = (app) => {
  return { app }
}
