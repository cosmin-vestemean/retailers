import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class Cccdocumentes1MappingsService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getDocumentMappings'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getDocumentMappings failed')
    return { data: result.data, total: result.total }
  }

  async create(data) {
    const url = mainURL + '/JS/JSRetailers/createDocumentMapping'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'createDocumentMapping failed')
    return result
  }

  async remove(id) {
    const url = mainURL + '/JS/JSRetailers/removeDocumentMapping'
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
