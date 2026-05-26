import fetch from 'node-fetch'
import { resolveS1BaseUrl } from '../../s1-base-url.js'

export class ConnectToS1Service {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const url = resolveS1BaseUrl({ url: params?.query?.url, app: this.options.app })
    const username = params?.query?.username || process.env.S1_USERNAME || 'websitepetfactory'
    const password = params?.query?.password || process.env.S1_PASSWORD || 'petfactory4321'
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