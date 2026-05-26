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

  /**
   * List all SFTP/FTP configs joined with their CCCEDIPROVIDER row.
   * Returns rows shaped for the EDI scanner: includes PROVIDER_CODE,
   * PROVIDER_NAME, PROVIDER_CONNTYPE.
   */
  async list({ onlyActive = true } = {}) {
    const url = mainURL + '/JS/JSRetailers/listEdiConfigs'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ onlyActive })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'listEdiConfigs failed')
    return { data: result.data || [], total: result.total || 0 }
  }
}

export const getOptions = (app) => {
  return { app }
}
