import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class Cccxmls1MappingsService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getXmlMappings', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getXmlMappings failed')
    return { data: result.data, total: result.total }
  }

  async create(data) {
    const url = buildS1Url('/JS/JSRetailers/createXmlMapping', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'createXmlMapping failed')
    return result
  }

  async remove(id, params) {
    const query = params?.query || {}
    const url = buildS1Url('/JS/JSRetailers/removeXmlMappings', { app: this.options.app })
    const body = id ? { id } : { CCCDOCUMENTES1MAPPINGS: query.CCCDOCUMENTES1MAPPINGS }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'removeXmlMappings failed')
    return result
  }
}

export const getOptions = (app) => {
  return { app }
}
