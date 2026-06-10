import assert from 'assert'
import { RetailerStatsService } from '../../../src/services/retailer-stats/retailer-stats.class.js'

describe('retailer-stats service', () => {
  it('excludes invoices with positive APERAK responses from pending invoice count', async () => {
    const queries = []
    const app = {
      service(name) {
        if (name === 'getDataset') {
          return {
            async find({ query }) {
              queries.push(query.sqlQuery)
              return { data: [{ value: 0 }] }
            }
          }
        }
        if (name === 'getDataset1') {
          return {
            async find({ query }) {
              queries.push(query.sqlQuery)
              return { success: true, data: [] }
            }
          }
        }
        throw new Error(`Unexpected service ${name}`)
      }
    }

    const service = new RetailerStatsService({ app })

    await service.find({ query: { trdr: 12349, daysOlder: 30 } })

    const invoiceCountSql = queries.find((sql) => sql.includes('nrFacturiDeTrimis'))
    const invoiceListSql = queries.find((sql) => sql.includes('FORMAT(trndate'))

    assert.ok(invoiceCountSql.includes('NOT EXISTS (SELECT 1 FROM CCCAPERAK a'))
    assert.ok(invoiceCountSql.includes("UPPER(ISNULL(a.DOCUMENTRESPONSE, '')) IN ('RECEPTIONAT', 'ACCEPTAT')"))
    assert.ok(invoiceListSql.includes('NOT EXISTS (SELECT 1 FROM CCCAPERAK a'))
  })
})