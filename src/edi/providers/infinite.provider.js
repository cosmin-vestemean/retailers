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
 * Infinite Edinet provider. Sample schema:
 *   <Document Type="Orders|RetAnn"><Order><OrderHeader><BuyerOrderNumber/>...
 *   <OrderParty><BuyerParty><GLN/>...<ShipToParty><GLN/>...
 *   <OrderDetail><Item><GTIN/><BuyerItemID/>...
 *
 * Filenames are per-retailer (AUCHAN_*.xml, DEDEMAN_*.xml), not "PKI*".
 * Remote layout has separate directories per document type.
 *
 * @type {import('./provider.interface.js').EdiProvider}
 */
export const infiniteProvider = {
  code: 'infinite',

  filenamePrefixes(docType) {
    if (docType === 'orders') return ['AUCHAN_', 'DEDEMAN_']
    if (docType === 'retann') return ['AUCHAN_', 'DEDEMAN_']
    return []
  },

  remoteSubdir(docType) {
    if (docType === 'orders') return '/orders/'
    if (docType === 'retann') return '/retanns/'
    if (docType === 'invoice') return '/invoice/'
    if (docType === 'aperak') return '/recadv/'
    return '/'
  },

  async parseOrder(xml) {
    const json = await parseXml(cleanXml(xml))
    const doc = json?.Document
    const order = doc?.Order
    if (!order) throw new Error('Infinite: missing <Document><Order> root')

    const orderId = order.OrderHeader?.BuyerOrderNumber
    const buyerGln = order.OrderParty?.BuyerParty?.GLN
    const shipToGln = order.OrderParty?.ShipToParty?.GLN

    const documentType = (doc?.$?.Type || '').toLowerCase() === 'retann' ? 'retann' : 'order'

    return {
      orderId: String(orderId ?? '').trim(),
      buyerGln: buyerGln ? String(buyerGln).trim() : undefined,
      shipToGln: shipToGln ? String(shipToGln).trim() : undefined,
      documentType,
      raw: json
    }
  },

  async parseAperak(xml) {
    // Infinite delivers RECADV instead of DocProcess-style APERAK.
    // Stub: return parsed tree; mapping to CCCAPERAK comes in a later step.
    return parseXml(cleanXml(xml))
  }
}
