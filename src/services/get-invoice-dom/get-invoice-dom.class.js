import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class GetInvoiceDomService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const clientID = params.query.clientID
    const appID = params.query.appID
    const findoc = params.query.findoc
    const url = buildS1Url('/JS/runCmd20210915/runExternalCode', { app: this.options.app })
    const method = 'POST'
    const body = {
      clientID: clientID,
      appID: appID,
      findoc: findoc
    }
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })