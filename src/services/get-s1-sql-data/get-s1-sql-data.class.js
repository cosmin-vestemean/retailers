import fetch from 'node-fetch'

const mainURL = 'https://petfactory.oncloud.gr/s1services'

export class GetS1SqlDataService {
  constructor(options) {
    this.options = options
  }

  async find(params) {
    const clientID = params.query.clientID
    const appID = params.query.appID
    const service = 'sqlData'
    const SqlName = params.query.SqlName
    const trdr = params.query.trdr
    const sosource = params.query.sosource
    const fprms = params.query.fprms
    const series = params.query.series
    const daysOlder = params.query.daysOlder
    const url = mainURL
    const method = 'POST'
    const body = {
      service: service,
      clientID: clientID,
      appID: appID,
      SqlName: SqlName,
      trdr: trdr,
      sosource: sosource,
      fprms: fprms,
      series: series,
      daysOlder: daysOlder
    }
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

export const getOptions = (app) => ({ app })