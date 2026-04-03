import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class GetInvoiceDomService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const clientID = params.query.clientID
    const appID = params.query.appID
    const findoc = params.query.findoc
    const url = mainURL + '/JS/runCmd20210915/runExternalCode'
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