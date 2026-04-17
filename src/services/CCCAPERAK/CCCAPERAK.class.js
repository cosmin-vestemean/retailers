import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class CccaperakService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getAperaks'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getAperaks failed')
    return { data: result.data, total: result.total }
  }

  async create(data) {
    const url = mainURL + '/JS/JSRetailers/createAperak'
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
