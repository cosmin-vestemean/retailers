import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class CccretailersclientsService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getRetailersClients'
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
