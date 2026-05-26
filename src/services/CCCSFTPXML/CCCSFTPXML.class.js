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
      XMLSTATUS: data.XMLSTATUS,
      XMLERROR: data.XMLERROR,
      XMLFILENAME: query.XMLFILENAME,
      TRDR_RETAILER: query.TRDR_RETAILER
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'patchSftpXml failed')
    return result.data || []
  }

  /** Atomic NEW → PROCESSING transition. Returns true if this caller owns the row. */
  async claim(id) {
    const url = mainURL + '/JS/JSRetailers/claimSftpXml'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'claimSftpXml failed')
    return !!result.claimed
  }

  /** List CCCSFTPXML rows in XMLSTATUS='NEW' ready to be processed. */
  async pending({ retailers = [], doctype = 'ORDERS', daysOld = 30, limit = 50 } = {}) {
    const url = mainURL + '/JS/JSRetailers/getPendingSftpXml'
    const body = {
      TRDR_RETAILERS: Array.isArray(retailers) ? retailers.join(',') : String(retailers || ''),
      EDIDOCTYPE: doctype,
      daysOld,
      $limit: limit
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'getPendingSftpXml failed')
    return { data: result.data || [], total: result.total || 0 }
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
