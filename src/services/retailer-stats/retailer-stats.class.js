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

    const ordersSql = `SELECT COUNT(*) nrComenziDeTrimis FROM CCCSFTPXML WHERE TRDR_RETAILER = ${trdr} AND COALESCE(FINDOC, 0) = 0 AND XMLDATE > DATEADD(day, -${daysOlder}, GETDATE())`
    const invoicesCountSql = `SELECT COUNT(*) nrFacturiDeTrimis FROM findoc f INNER JOIN mtrdoc m ON (f.findoc=m.findoc) WHERE f.sosource=1351 AND f.fprms=712 AND f.series=7121 AND f.trdr=${trdr} AND m.CCCXMLSendDate IS NULL AND f.iscancel=0 AND trndate > DATEADD(day, -${daysOlder}, GETDATE())`
    const invoicesListSql = `SELECT fincode, FORMAT(trndate, 'dd.MM.yyyy') trndate FROM findoc f INNER JOIN mtrdoc m ON (f.findoc=m.findoc) WHERE f.sosource=1351 AND f.fprms=712 AND f.series=7121 AND f.trdr=${trdr} AND m.CCCXMLSendDate IS NULL AND f.iscancel=0 AND trndate > DATEADD(day, -${daysOlder}, GETDATE())`

    const [ordersRes, invoicesCountRes, invoicesListRes] = await Promise.all([
      this.app.service('getDataset').find({ query: { sqlQuery: ordersSql } }),
      this.app.service('getDataset').find({ query: { sqlQuery: invoicesCountSql } }),
      this.app.service('getDataset1').find({ query: { sqlQuery: invoicesListSql } })
    ])

    const pendingOrders = Number(this.getScalarValue(ordersRes.data) || 0)
    const pendingInvoices = Number(this.getScalarValue(invoicesCountRes.data) || 0)
    const invoiceRows = invoicesListRes.success && Array.isArray(invoicesListRes.data)
      ? invoicesListRes.data
      : []

    return {
      success: true,
      trdr,
      daysOlder,
      pendingOrders,
      pendingInvoices,
      invoiceList: invoiceRows.map((item) => `${item.fincode} ${item.trndate}`).join('; '),
      invoiceRows
    }
  }
}

export const getOptions = (app) => ({ app })