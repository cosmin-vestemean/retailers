import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class OrdersDataService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const { trdr, page, pageSize, daysOlder, includeSent } = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getOrdersData'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ trdr, page, pageSize, daysOlder, includeSent })
    })
    return response.json()
  }
}

export const getOptions = (app) => ({ app })
