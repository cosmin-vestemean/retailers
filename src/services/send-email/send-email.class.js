import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class SendEmailService {
  constructor(options) {
    this.options = options
  }

  async create(data, params) {
    const url = mainURL + '/JS/JSRetailers/sendEmail'
    const method = 'POST'
    const body = data
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })