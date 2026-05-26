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
    return response.json()
  }
}

export const getOptions = (app) => ({ app })
