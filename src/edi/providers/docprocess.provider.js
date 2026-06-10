import { parseString } from 'xml2js'

const parseXml = (xml) =>
  new Promise((resolve, reject) =>
    parseString(xml, { explicitArray: false, trim: true }, (err, result) =>
      err ? reject(err) : resolve(result)
    )
  )

const cleanXml = (xml) =>
  xml.replace(/<\?xml[^?]*\?>/g, '').replace(/\ufeff/g, '').replace(/[\n\r\t]/g, '')

function text(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object' && value._ !== undefined) return String(value._).trim()
  return String(value).trim()
}

function attr(value, name) {
  return value?.$?.[name] ? String(value.$[name]).trim() : ''
}

function partyContext(party) {
  const address = party?.PostalAddress || {}
  const country = address.Country
  return {
    gln: text(party?.EndpointID),
    name: text(party?.PartyName),
    street: text(address.StreetName),
    city: text(address.CityName),
    postalZone: text(address.PostalZone),
    country: text(country?.IdentificationCode || country)
  }
}

function firstItemsPreview(orderLine) {
  const lines = Array.isArray(orderLine) ? orderLine : orderLine ? [orderLine] : []
  return lines.slice(0, 10).map((line) => {
    const item = line.Item || {}
    return {
      buyerItemId: text(item.BuyersItemIdentification),
      sellerItemId: text(item.SellersItemIdentification),
      standardItemId: text(item.StandardItemIdentification),
      name: text(item.Name || item.Description),
      quantity: text(line.Quantity?.Amount || line.Quantity),
      unit: attr(line.Quantity, 'UnitCode')
    }
  })
}

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
    const requestedPeriod = order.RequestedDeliveryPeriod || order.Delivery?.RequestedDeliveryPeriod || {}
    const routingContext = {
      provider: 'docprocess',
      orderId: text(orderId),
      issueDate: text(order.IssueDate),
      requestedDeliveryStart: text(requestedPeriod.StartDate),
      requestedDeliveryEnd: text(requestedPeriod.EndDate),
      actualDeliveryDate: text(order.Delivery?.ActualDeliveryDate),
      buyer: partyContext(order.BuyerCustomerParty?.Party || order.BuyerCustomerParty),
      seller: partyContext(order.SellerSupplierParty?.Party || order.SellerSupplierParty),
      delivery: partyContext(order.DeliveryParty),
      totals: {
        lineCount: parseInt(text(order.LineCountNumeric), 10) || (Array.isArray(order.OrderLine) ? order.OrderLine.length : order.OrderLine ? 1 : 0)
      },
      itemsPreview: firstItemsPreview(order.OrderLine)
    }

    return {
      orderId: String(orderId ?? '').trim(),
      buyerGln: buyerGln ? String(buyerGln).trim() : undefined,
      shipToGln: shipToGln ? String(shipToGln).trim() : undefined,
      documentType: 'order',
      routingContext,
      raw: json
    }
  },

  async parseAperak(xml) {
    return parseXml(cleanXml(xml))
  }
}
