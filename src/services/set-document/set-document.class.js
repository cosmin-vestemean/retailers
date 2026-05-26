import fetch from 'node-fetch'
import { resolveS1BaseUrl } from '../../s1-base-url.js'

export class SetDocumentService {
  constructor(options) {
    this.options = options
  }

  async create(data, params) {
    const url = resolveS1BaseUrl(params?.query?.url)
    const method = 'POST'
    const body = data
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })