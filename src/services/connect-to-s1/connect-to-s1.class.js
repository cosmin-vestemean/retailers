import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class ConnectToS1Service {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const url = mainURL
    const username = 'websitepetfactory'
    const password = 'petfactory4321'
    const method = 'POST'
    const body = {
      service: 'login',
      username: username,
      password: password,
      appId: 1001
    }
    console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    const clientID = json.clientID
    const REFID = json.objs[0].REFID
    const MODULE = json.objs[0].MODULE
    const COMPANY = json.objs[0].COMPANY
    const BRANCH = json.objs[0].BRANCH
    const authenticateBody = {
      service: 'authenticate',
      clientID: clientID,
      COMPANY: COMPANY,
      BRANCH: BRANCH,
      MODULE: MODULE,
      REFID: REFID
    }
    console.log(authenticateBody)
    const authenticateResponse = await fetch(url, {
      method: method,
      body: JSON.stringify(authenticateBody)
    })
    const authenticateJson = await authenticateResponse.json()
    console.log(authenticateJson)
    const token = authenticateJson.clientID
    return { token: token }
  }
}

export const getOptions = (app) => ({ app })