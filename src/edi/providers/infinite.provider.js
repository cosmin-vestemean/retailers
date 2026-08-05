import { parseString } from 'xml2js'

const parseXml = (xml) =>
  new Promise((resolve, reject) =>
    parseString(xml, { explicitArray: false, trim: true }, (err, result) =>
      err ? reject(err) : resolve(result)
    )
  )

const cleanXml = (xml) =>
  xml.replace(/<\?xml[^?]*\?>/g, '').replace(/\ufeff/g, '').replace(/[\n\r\t]/g, '')

const RETAILER_PREFIXES = {
  13248: ['AUCHAN_'],
  11654: ['DEDEMAN_']
}

// RecadvParty/BuyerParty/GLN -> TRDR. RECADV filenames are purely numeric, so routing
// happens by GLN, not by filename prefix like orders/retann.
const RETAILER_GLNS = {
  '5940475841003': 11654, // Dedeman
  '5940475172008': 13248 // Auchan
}

const PALLET_DESCRIPTION = /palet/i

function text(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object' && value._ !== undefined) return String(value._).trim()
  return String(value).trim()
}

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

  filenamePrefixes(docType, sftpRow = {}) {
    const retailerPrefixes = RETAILER_PREFIXES[parseInt(sftpRow.TRDR_RETAILER, 10)]
    if (docType === 'orders') return retailerPrefixes || ['AUCHAN_', 'DEDEMAN_']
    if (docType === 'retann') return retailerPrefixes || ['AUCHAN_', 'DEDEMAN_']
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
  },

  /**
   * Parses a RECADV (goods-receipt advice) payload. Format is measured on the full 101-file
   * production corpus, not the (partly wrong) v4.0 spec — see /memories/repo/edi-recadv-real-format.md.
   * @param {string} xml
   * @returns {Promise<object>}
   */
  async parseRecadv(xml) {
    const json = await parseXml(cleanXml(xml))
    const doc = json?.Document
    const header = doc?.RecadvHeader
    if (!header) throw new Error('Infinite: missing <Document><RecadvHeader> root')

    const buyerGln = text(doc?.RecadvParty?.BuyerParty?.GLN)
    const adviceRaw = text(header.DeliveryDocumentNumber)
    const rawItems = doc?.RecadvDetail?.Item
    const itemList = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []

    return {
      documentNumber: text(header.DocumentNumber),
      buyerGln: buyerGln || undefined,
      trdr: RETAILER_GLNS[buyerGln],
      // BuyerOrderNumber may carry more than one order, comma/semicolon separated.
      orders: text(header.BuyerOrderNumber).split(/[,;]/).map((o) => o.trim()).filter(Boolean),
      adviceRaw,
      // "AEX-AE-053744", "53986" and the truncated "AEX-AE-053657/AE" all reduce to a numeric tail.
      adviceSuffixes: [...adviceRaw.matchAll(/(\d{2,6})/g)].map((m) => m[1].padStart(6, '0')),
      adviceTruncated: adviceRaw.includes('/') && !/\d{2,6}$/.test(adviceRaw),
      items: itemList.map((item) => {
        const description = text(item.ProductDescription)
        return {
          buyerItemId: text(item.BuyerItemID),
          gtin: text(item.GTIN),
          accepted: Number(text(item.QuantityAccepted) || 0),
          description,
          isPallet: PALLET_DESCRIPTION.test(description)
        }
      }),
      numberOfItems: parseInt(text(doc?.RecadvSummary?.NumberOfItems), 10) || itemList.length,
      numberOfDocuments: parseInt(text(doc?.DocumentSummary?.NumberOfDocuments), 10) || 1,
      raw: json
    }
  }
}
