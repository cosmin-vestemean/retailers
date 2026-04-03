import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class GetDatasetService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const url = mainURL + '/JS/JSRetailers/processSqlAsDataset'
    const method = 'POST'
    const sqlQuery = params.query.sqlQuery
    console.log('sqlQuery', sqlQuery)
    const response = await fetch(url, { method: method, body: JSON.stringify({ sqlQuery: sqlQuery }) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })