import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class InvoicesDataService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const { trdr, page, pageSize, daysOlder, sosource, fprms, series, includeSent } = params.query || {}
    const url = buildS1Url('/JS/JSRetailers/getInvoicesData', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ trdr, page, pageSize, daysOlder, sosource, fprms, series, includeSent })
    })
    return response.json()
  }
}

export const getOptions = (app) => ({ app })
