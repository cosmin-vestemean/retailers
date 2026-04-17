import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class CccsftpService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getSftpConfig'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(query)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getSftpConfig failed')
    return { data: result.data, total: result.total }
  }

  async update(id, data) {
    const trdr = typeof id === 'object' ? (id.query || {}).TRDR_RETAILER : id
    const url = mainURL + '/JS/JSRetailers/updateSftpConfig'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ ...data, TRDR_RETAILER: trdr })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'updateSftpConfig failed')
    return result
  }

  async patch(id, data, params) {
    const trdr = id || (params?.query || {}).TRDR_RETAILER
    return this.update(trdr, data)
  }
}

export const getOptions = (app) => {
  return { app }
}
