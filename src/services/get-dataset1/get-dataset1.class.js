import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class GetDataset1Service {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const url = buildS1Url('/JS/JSRetailers/processSqlAsDataset1', { app: this.options.app })
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