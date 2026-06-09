import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class OrdersDataService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const { trdr, page, pageSize, daysOlder, includeSent } = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getOrdersData', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ trdr, page, pageSize, daysOlder, includeSent })
    })
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return result
    return this.enrichXmlStatus(result)
  }

  async enrichXmlStatus(result) {
    const app = this.options.app
    const rows = await Promise.all(result.data.map(async (row) => {
      if (row.XMLSTATUS || !row.XMLFILENAME || !row.TRDR_RETAILER) return row
      try {
        const lookup = await app.service('CCCSFTPXML').find({
          query: { TRDR_RETAILER: row.TRDR_RETAILER, XMLFILENAME: row.XMLFILENAME, $limit: 1 }
        })
        const found = lookup.data?.[0]
        if (!found) return row
        return { ...row, XMLSTATUS: found.XMLSTATUS, XMLERROR: found.XMLERROR }
      } catch {
        return row
      }
    }))
    return { ...result, data: rows }
  }
}

export const getOptions = (app) => ({ app })
