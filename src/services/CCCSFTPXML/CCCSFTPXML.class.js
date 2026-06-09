import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class CccsftpxmlService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getSftpXml', { app: this.options.app })
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
    const url = buildS1Url('/JS/JSRetailers/createSftpXml', { app: this.options.app })
    const body = {
      ...data,
      XMLDATA: normalizeXmlDataForS1(data.XMLDATA)
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'createSftpXml failed')
    // Return the full row — store-xml.class.js uses xmlInsert as a record object
    if (result.data && Object.keys(result.data).length > 0) return result.data
    return { CCCSFTPXML: result.id, ...body }
  }

  async patch(id, data, params) {
    const query = params?.query || {}
    const url = buildS1Url('/JS/JSRetailers/patchSftpXml', { app: this.options.app })
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
    const url = buildS1Url('/JS/JSRetailers/claimSftpXml', { app: this.options.app })
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
    const url = buildS1Url('/JS/JSRetailers/getPendingSftpXml', { app: this.options.app })
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
    const url = buildS1Url('/JS/JSRetailers/removeSftpXml', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id })
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'removeSftpXml failed')
    return result
  }
}

function normalizeXmlDataForS1(xml) {
  return String(xml || '').replace(/^\uFEFF?\s*<\?xml[^?]*\?>\s*/i, '')
}

export const getOptions = (app) => {
  return { app }
}
