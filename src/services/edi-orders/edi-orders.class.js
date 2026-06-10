import { buildOrderPayload } from '../../edi/order-builder.js'
import { sendOrderToS1 } from '../../edi/order-sender.js'

export class EdiOrdersService {
  constructor(options) {
    this.options = options
    this.app = options.app
  }

  async create(data, params) {
    const retailer = parseInt(data.trdr ?? params?.query?.trdr, 10)
    const cccsftpxml = parseInt(data.CCCSFTPXML, 10)
    const xml = data.xmlData
    const xmlFilename = data.filename
    const orderId = data.orderId
    const sosource = 1351
    const fprms = 701
    const series = 7012

    if (!Number.isInteger(retailer)) {
      return { success: false, message: 'Missing retailer' }
    }
    if (!xml) {
      return { success: false, message: 'Missing XML data' }
    }
    if (!xmlFilename) {
      return { success: false, message: 'Missing XML filename' }
    }

    try {
      const { jsonOrder, errors, s1BaseUrl } = await buildOrderPayload({
        xml,
        sosource,
        fprms,
        series,
        retailer,
        orderId: orderId || xmlFilename,
        cccsftpxml,
        app: this.app
      })

      if (errors.length > 0) {
        const message = `Mapping errors (${errors.length}): ${errors.slice(0, 3).map((e) => e.message).join(' | ')}`
        if (cccsftpxml) {
          await this.app.service('CCCSFTPXML').patch(cccsftpxml, {
            XMLSTATUS: 'ERROR',
            XMLERROR: message.slice(0, 4000)
          })
        }
        return { success: false, errors, message }
      }

      return sendOrderToS1({
        app: this.app,
        jsonOrder,
        s1BaseUrl,
        retailer,
        orderId: orderId || xmlFilename,
        cccsftpxmlId: cccsftpxml,
        manual: data.manual === true
      })
    } catch (error) {
      if (cccsftpxml) {
        await this.app.service('CCCSFTPXML').patch(cccsftpxml, {
          XMLSTATUS: 'ERROR',
          XMLERROR: (error.message || '').slice(0, 4000)
        })
      }
      return { success: false, errors: [error.message], message: error.message }
    }
  }
}

export const getOptions = (app) => ({ app })