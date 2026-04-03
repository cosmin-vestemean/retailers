export class RetailerService {
  constructor(options) {
    this.options = options
    this.app = options.app
  }

  async find(params) {
    const retailer = params.query.retailer
    const clientPlatforma = params.query.clientPlatforma
    const ediQry = `SELECT A.*, B.NAME EDIPROVIDERNAME, C.NAME CONNTYPE FROM CCCSFTP A 
      INNER JOIN CCCEDIPROVIDER B ON A.EDIPROVIDER = B.CCCEDIPROVIDER 
      INNER JOIN CCCCONNTYPE C ON B.CONNTYPE = C.CCCCONNTYPE WHERE A.TRDR_RETAILER = ${retailer}`
    const response = await this.app.service('getDataset1').find({ query: { sqlQuery: ediQry } })
    const ediDetails = response.success
      ? {
        TRDR_RETAILER: response.TRDR_RETAILER,
        EDIPROVIDER: response.EDIPROVIDER,
        EDIPROVIDERNAME: response.EDIPROVIDERNAME,
        CONNTYPE: response.CONNTYPE,
        URL: response.URL,
        PORT: response.PORT,
        USERNAME: response.USERNAME,
        PASSPHRASE: response.PASSPHRASE,
        PRIVATEKEY: response.PRIVATEKEY,
        FINGERPRINT: response.FINGERPRINT,
        INITIALDIRIN: response.INITIALDIRIN,
        INITIALDIROUT: response.INITIALDIROUT
      }
      : {}

    const documentMappingsQry = `SELECT CCCDOCUMENTES1MAPPINGS, SOSOURCE, FPRMS, SERIES, INITIALDIRIN, INITIALDIROUT FROM CCCDOCUMENTES1MAPPINGS WHERE TRDR_RETAILER = ${retailer} and TRDR_CLIENT = ${clientPlatforma}`
    const documentMappingsResponse = await this.app
      .service('getDataset1')
      .find({ query: { sqlQuery: documentMappingsQry } })

    const S1DocumentSeries = documentMappingsResponse.success ? documentMappingsResponse.data : []

    return { success: response.success, edi: ediDetails, S1DocumentSeries: S1DocumentSeries }
  }
}

export const getOptions = (app) => ({ app })