import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class OrdersLogService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const { trdr, orderid, operation, level, dateFrom, dateTo, page, pageSize } = params.query || {}

    const url = mainURL + '/JS/JSRetailers/getOrdersLog'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ trdr, orderid, operation, level, dateFrom, dateTo, page, pageSize })
    })
    return response.json()
  }

  async create(data, params) {
    const url = mainURL + '/JS/JSRetailers/createOrderLog'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async remove(id, params) {
    const days = params?.query?.days || 30
    const url = mainURL + '/JS/JSRetailers/cleanupOrdersLog'
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
