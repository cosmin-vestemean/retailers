import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'
import { getProvider } from '../../edi/providers/factory.js'
import { resolveInsertSftpRow } from '../../edi/scanner.js'

/**
 * Read a fetch Response and parse it as the S1 JSON contract.
 * Throws a descriptive error (status + body snippet) when the body is empty
 * or not valid JSON, instead of a cryptic "Unexpected end of JSON input".
 */
async function parseS1Json(response, label) {
  const text = await response.text()
  if (!text || !text.trim()) {
    throw new Error(`${label} returned empty response (HTTP ${response.status} ${response.statusText})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 300)}`)
  }
}

export class CccsftpxmlService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const query = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getSftpXml', { app: this.options.app })
    const body = {
      id: query.id,
      TRDR_RETAILER: query.TRDR_RETAILER,
      XMLFILENAME: query.XMLFILENAME,
      ROUTING_ERRORS: query.ROUTING_ERRORS,
      $limit: query.$limit,
      $sortDir: query.$sort?.XMLDATE === -1 ? 'DESC' : query.$sort?.XMLDATE === 1 ? 'ASC' : undefined
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await parseS1Json(response, 'getSftpXml')
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
    const result = await parseS1Json(response, 'createSftpXml')
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
      SET_TRDR_RETAILER: data.SET_TRDR_RETAILER,
      XMLSTATUS: data.XMLSTATUS,
      XMLERROR: data.XMLERROR,
      JSONDATA: data.JSONDATA,
      XMLFILENAME: query.XMLFILENAME,
      TRDR_RETAILER: query.TRDR_RETAILER
    }
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const result = await parseS1Json(response, 'patchSftpXml')
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
    const result = await parseS1Json(response, 'claimSftpXml')
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
    const result = await parseS1Json(response, 'getPendingSftpXml')
    if (!result.success) throw new Error(result.error || 'getPendingSftpXml failed')
    return { data: result.data || [], total: result.total || 0 }
  }

  async remove(id) {
    const url = buildS1Url('/JS/JSRetailers/removeSftpXml', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ id })
    })
    const result = await parseS1Json(response, 'removeSftpXml')
    if (!result.success) throw new Error(result.error || 'removeSftpXml failed')
    return result
  }

  async resolveRouting(id) {
    const rowId = parseInt(id, 10)
    if (!rowId) throw new Error('Missing CCCSFTPXML id')
    const current = await this.find({ query: { id: rowId, $limit: 1 } })
    const row = current.data?.[0]
    if (!row) throw new Error(`CCCSFTPXML ${rowId} not found`)

    const configs = await this.options.app.service('CCCSFTP').list({ onlyActive: true })
    const sftpRows = configs.data || []
    const docProcessRow = sftpRows.find((r) => String(r.PROVIDER_CODE || '').toLowerCase() === 'docprocess')
    if (!docProcessRow) throw new Error('No active DocProcess configuration found')

    const provider = getProvider({ CODE: 'docprocess', NAME: 'DocProcess' })
    let resolvedRow
    try {
      resolvedRow = await resolveInsertSftpRow(this.options.app, {
        xml: row.XMLDATA,
        sftpRow: docProcessRow,
        provider,
        docType: 'orders',
        sftpRows
      })
    } catch (error) {
      if (!error.routingError) throw error
      const patched = await this.patch(rowId, {
        XMLSTATUS: 'ERROR',
        XMLERROR: (error.message || '').slice(0, 4000),
        JSONDATA: JSON.stringify({ routing: error.routingContext || {} })
      })
      return { success: false, error: error.message, data: patched }
    }
    const parsed = await provider.parseOrder(row.XMLDATA)
    const routingContext = {
      ...(parsed.routingContext || {}),
      reason: 'resolved',
      resolvedRetailer: parseInt(resolvedRow.TRDR_RETAILER, 10)
    }

    const patched = await this.patch(rowId, {
      SET_TRDR_RETAILER: parseInt(resolvedRow.TRDR_RETAILER, 10),
      XMLSTATUS: 'NEW',
      XMLERROR: '',
      JSONDATA: JSON.stringify({ routing: routingContext })
    })
    return { success: true, resolvedRetailer: parseInt(resolvedRow.TRDR_RETAILER, 10), data: patched }
  }
}

function normalizeXmlDataForS1(xml) {
  return String(xml || '').replace(/^\uFEFF?\s*<\?xml[^?]*\?>\s*/i, '')
}

export const getOptions = (app) => {
  return { app }
}
