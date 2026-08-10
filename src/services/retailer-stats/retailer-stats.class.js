// RECADV (goods-receipt advice) only flows through Infinite Edinet today (Dedeman + Auchan) —
// see infinite.provider.js RETAILER_GLNS and frontend/src/pages/retailer-detail.js. Other
// retailers have no advices (FINDOC.SERIES=7111), so the count would always be 0/misleading.
const RECADV_RETAILERS = [11654, 13248]

export class RetailerStatsService {
  constructor(options) {
    this.options = options
    this.app = options.app
  }

  getScalarValue(value) {
    if (value == null) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isNaN(parsed) ? value : parsed
    }
    if (Array.isArray(value) && value.length > 0) {
      return this.getScalarValue(value[0])
    }
    if (typeof value === 'object') {
      const firstValue = Object.values(value)[0]
      return this.getScalarValue(firstValue)
    }
    return value
  }

  async find(params) {
    const trdr = parseInt(params.query?.trdr, 10)
    const daysOlder = parseInt(params.query?.daysOlder || 30, 10)

    if (!Number.isInteger(trdr)) {
      throw new Error('trdr is required')
    }

    const ordersSql = `SELECT COUNT(*) nrComenziDeTrimis FROM CCCSFTPXML WHERE TRDR_RETAILER = ${trdr} AND COALESCE(FINDOC, 0) = 0 AND XMLDATE > DATEADD(day, -${daysOlder}, GETDATE()) AND ISNULL(EDIDOCTYPE, 'ORDERS') = 'ORDERS' AND CAST(XMLFILENAME AS VARCHAR(MAX)) NOT LIKE 'APERAK[_]%'`
    const positiveAperakFilter = `NOT EXISTS (SELECT 1 FROM CCCAPERAK a WHERE a.FINDOC = f.FINDOC AND UPPER(ISNULL(a.DOCUMENTRESPONSE, '')) IN ('RECEPTIONAT', 'ACCEPTAT'))`
    const invoicesWhere = `WHERE f.sosource=1351 AND f.fprms=712 AND f.series=7121 AND f.trdr=${trdr} AND m.CCCXMLSendDate IS NULL AND f.iscancel=0 AND trndate > DATEADD(day, -${daysOlder}, GETDATE()) AND ${positiveAperakFilter}`
    const invoicesCountSql = `SELECT COUNT(*) nrFacturiDeTrimis FROM findoc f INNER JOIN mtrdoc m ON (f.findoc=m.findoc) ${invoicesWhere}`
    const invoicesListSql = `SELECT fincode, FORMAT(trndate, 'dd.MM.yyyy') trndate FROM findoc f INNER JOIN mtrdoc m ON (f.findoc=m.findoc) ${invoicesWhere}`

    // Mirrors the invoiced predicate + pallet-line exclusion from S1/JS/AJS/RECADV.js's
    // getReceptionsData (soft1-schema-facts.md: SALFPRMS.TFPRMS = 103, never FPRMS=712).
    const hasReceptions = RECADV_RETAILERS.includes(trdr)
    const receiptsSql = `SELECT COUNT(*) nrReceptiiNefacturate FROM FINDOC f`
      + ` WHERE f.TRDR = ${trdr} AND f.SERIES = 7111 AND f.ISCANCEL = 0`
      + ` AND f.TRNDATE >= DATEADD(day, -${daysOlder}, GETDATE())`
      + ` AND EXISTS (SELECT 1 FROM MTRLINES l INNER JOIN MTRL m ON m.MTRL = l.MTRL`
      + `   WHERE l.FINDOC = f.FINDOC AND m.NAME NOT LIKE '%PALET%')`
      + ` AND NOT EXISTS (SELECT 1 FROM MTRLINES l`
      + `   INNER JOIN FINDOC i ON i.FINDOC = l.FINDOC AND i.ISCANCEL = 0`
      + `   INNER JOIN SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY`
      + `   WHERE l.FINDOCS = f.FINDOC AND p.TFPRMS = 103)`

    const [ordersRes, invoicesCountRes, invoicesListRes, receiptsRes] = await Promise.all([
      this.app.service('getDataset').find({ query: { sqlQuery: ordersSql } }),
      this.app.service('getDataset').find({ query: { sqlQuery: invoicesCountSql } }),
      this.app.service('getDataset1').find({ query: { sqlQuery: invoicesListSql } }),
      hasReceptions
        ? this.app.service('getDataset').find({ query: { sqlQuery: receiptsSql } })
        : Promise.resolve(null)
    ])

    const pendingOrders = Number(this.getScalarValue(ordersRes.data) || 0)
    const pendingInvoices = Number(this.getScalarValue(invoicesCountRes.data) || 0)
    const pendingReceipts = hasReceptions ? Number(this.getScalarValue(receiptsRes.data) || 0) : null
    const invoiceRows = invoicesListRes.success && Array.isArray(invoicesListRes.data)
      ? invoicesListRes.data
      : []

    return {
      success: true,
      trdr,
      daysOlder,
      pendingOrders,
      pendingInvoices,
      pendingReceipts,
      invoiceList: invoiceRows.map((item) => `${item.fincode} ${item.trndate}`).join('; '),
      invoiceRows
    }
  }
}

export const getOptions = (app) => ({ app })