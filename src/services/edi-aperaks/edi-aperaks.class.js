export class EdiAperaksService {
  constructor(options) {
    this.options = options
    this.app = options.app
  }

  async create(data, params) {
    const retailer = parseInt(data?.retailer ?? data?.trdr ?? params?.query?.retailer, 10)
    if (!Number.isInteger(retailer)) return { success: false, message: 'Missing retailer' }

    const downloaded = await this.app.service('sftp').downloadXml({}, {
      query: { retailer, rootPath: 'data/aperak', startsWith: 'APERAK_' }
    })
    const stored = await this.app.service('sftp').storeAperakInErpMessages({}, {
      query: { rootPath: 'data/aperak' }
    })

    return { success: true, downloaded, stored }
  }
}

export const getOptions = (app) => ({ app })