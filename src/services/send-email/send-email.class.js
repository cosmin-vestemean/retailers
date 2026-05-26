import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'

export class SendEmailService {
  constructor(options) {
    this.options = options
  }

  async create(data, params) {
    const url = buildS1Url('/JS/JSRetailers/sendEmail', { app: this.options.app })
    const method = 'POST'
    const body = data
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })