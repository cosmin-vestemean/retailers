import { parseString } from 'xml2js'

const parseXml = (xml) =>
  new Promise((resolve, reject) =>
    parseString(xml, { explicitArray: false, trim: true }, (err, result) =>
      err ? reject(err) : resolve(result)
    )
  )

const cleanXml = (xml) =>
  xml.replace(/<\?xml[^?]*\?>/g, '').replace(/\ufeff/g, '').replace(/[\n\r\t]/g, '')

/**
 * DocProcess provider. UBL-flavoured Order XML, single remote inbox.
 * @type {import('./provider.interface.js').EdiProvider}
 */
export const docProcessProvider = {
  code: 'docprocess',

  filenamePrefixes(docType) {
    if (docType === 'orders') return ['ORDERS_']
    if (docType === 'aperak') return ['APERAK_']
    return []
  },

  // DocProcess uses a single bucket per credential (INITIALDIRIN/OUT in CCCSFTP),
  // not per document type. Subdir is empty — caller uses CCCSFTP.INITIALDIRIN as-is.
  remoteSubdir() {
    return ''
  },

  async parseOrder(xml) {
    const json = await parseXml(cleanXml(xml))
    const order = json?.Order
    if (!order) throw new Error('DocProcess: missing <Order> root')

    const orderId = order.ID
    const buyerGln = order.DeliveryParty?.EndpointID || order.BuyerCustomerParty?.Party?.EndpointID
    const shipToGln = order.DeliveryParty?.EndpointID

    return {
      orderId: String(orderId ?? '').trim(),
      buyerGln: buyerGln ? String(buyerGln).trim() : undefined,
      shipToGln: shipToGln ? String(shipToGln).trim() : undefined,
      documentType: 'order',
      raw: json
    }
  },

  async parseAperak(xml) {
    return parseXml(cleanXml(xml))
  }
}
