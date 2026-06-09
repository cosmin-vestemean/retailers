import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class OrdersLogService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const { trdr, orderid, operation, level, dateFrom, dateTo, page, pageSize, excludeResolvedDuplicateGuard, excludeHeartbeat } = params.query || {}

    const url = buildS1Url('/JS/JSRetailers/getOrdersLog', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ trdr, orderid, operation, level, dateFrom, dateTo, page, pageSize, excludeResolvedDuplicateGuard, excludeHeartbeat })
    })
    return response.json()
  }

  async create(data, params) {
    const url = buildS1Url('/JS/JSRetailers/createOrderLog', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async remove(id, params) {
    const days = params?.query?.days || 30
    const url = buildS1Url('/JS/JSRetailers/cleanupOrdersLog', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ days })
    })
    return response.json()
  }
}

export const getOptions = (app) => {
  return { app }
}
