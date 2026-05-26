import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class S1UsersService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const url = buildS1Url('/JS/JSRetailers/processSqlAsDataset1', { app: this.options.app })
    const sqlQuery = `SELECT b.name, a.luser as userId FROM webaccountlns a
      INNER JOIN users b ON a.luser = b.users
      WHERE a.webservice = 1001 AND a.webaccount = 4`

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ sqlQuery })
    })
    const json = await response.json()
    return json
  }
}

export const getOptions = (app) => {
  return { app }
}
