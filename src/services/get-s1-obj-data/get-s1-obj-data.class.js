import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class GetS1ObjDataService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const findoc = params.query.KEY
    const clientID = params.query.clientID
    const appID = params.query.appID
    const OBJECT = params.query.OBJECT
    const FORM = params.query.FORM
    const KEY = findoc
    const service = 'getData'
    const LOCATEINFO = params.query.LOCATEINFO
    const url = mainURL
    const method = 'POST'
    const body = {
      service: service,
      clientID: clientID,
      appID: appID,
      OBJECT: OBJECT,
      FORM: FORM,
      KEY: KEY,
      LOCATEINFO: LOCATEINFO
    }
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })