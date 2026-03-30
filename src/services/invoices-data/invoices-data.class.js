import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class InvoicesDataService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const { trdr, page, pageSize, daysOlder, sosource, fprms, series } = params.query || {}
    const url = mainURL + '/JS/JSRetailers/getInvoicesData'
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ trdr, page, pageSize, daysOlder, sosource, fprms, series })
    })
    return response.json()
  }
}

export const getOptions = (app) => ({ app })
