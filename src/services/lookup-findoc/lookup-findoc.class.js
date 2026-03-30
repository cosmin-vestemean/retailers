import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class LookupFindocService {
  constructor(options) {
    this.options = options
  }

  async create(data) {
    const { trdr, orderId, xmlFilename } = data
    const url = mainURL + '/JS/JSRetailers/lookupFindoc'
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trdr, orderId, xmlFilename })
    })
    return response.json()
  }
}

export const getOptions = (app) => ({ app })
