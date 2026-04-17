import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class CccsftpxmlService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getSftpXml'
    const body = {
      TRDR_RETAILER: query.TRDR_RETAILER,
      XMLFILENAME: query.XMLFILENAME,
      $limit: query.$limit,
      $sortDir: query.$sort?.XMLDATE === -1 ? 'DESC' : query.$sort?.XMLDATE === 1 ? 'ASC' : undefined
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getSftpXml failed')
    return { data: result.data, total: result.total }
  }

  async create(data) {
    const url = mainURL + '/JS/JSRetailers/createSftpXml'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'createSftpXml failed')
    // Return the full row — store-xml.class.js uses xmlInsert as a record object
    return result.data || { CCCSFTPXML: result.id, ...data }
  }

  async patch(id, data, params) {
    const query = params?.query || {}
    const url = mainURL + '/JS/JSRetailers/patchSftpXml'
    const body = {
      id: id,
      FINDOC: data.FINDOC,
      XMLFILENAME: query.XMLFILENAME,
      TRDR_RETAILER: query.TRDR_RETAILER
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'patchSftpXml failed')
    // Knex multi-patch returns array — callers use patchRes[0].CCCSFTPXML
    return result.data || []
  }

  async remove(id) {
    const url = mainURL + '/JS/JSRetailers/removeSftpXml'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'removeSftpXml failed')
    return result
  }
}

export const getOptions = (app) => {
  return { app }
}
