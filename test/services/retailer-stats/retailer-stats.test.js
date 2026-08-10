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

  it('returns pendingReceipts for retailers with RECADV flows (Dedeman/Auchan)', async () => {
    const queries = []
    const app = {
      service(name) {
        if (name === 'getDataset') {
          return {
            async find({ query }) {
              queries.push(query.sqlQuery)
              if (query.sqlQuery.includes('nrReceptiiNefacturate')) return { data: [{ value: 4 }] }
              return { data: [{ value: 0 }] }
            }
          }
        }
        if (name === 'getDataset1') {
          return { async find() { return { success: true, data: [] } } }
        }
        throw new Error(`Unexpected service ${name}`)
      }
    }

    const service = new RetailerStatsService({ app })
    const result = await service.find({ query: { trdr: 11654, daysOlder: 30 } })

    const receiptsSql = queries.find((sql) => sql.includes('nrReceptiiNefacturate'))
    assert.ok(receiptsSql, 'expected receipts SQL to be issued for RECADV retailer')
    assert.ok(receiptsSql.includes('f.SERIES = 7111'))
    assert.ok(receiptsSql.includes('TFPRMS = 103'))
    assert.strictEqual(result.pendingReceipts, 4)
  })

  it('returns null pendingReceipts for retailers without RECADV flows', async () => {
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
          return { async find() { return { success: true, data: [] } } }
        }
        throw new Error(`Unexpected service ${name}`)
      }
    }

    const service = new RetailerStatsService({ app })
    const result = await service.find({ query: { trdr: 99999, daysOlder: 30 } })

    assert.ok(!queries.some((sql) => sql.includes('nrReceptiiNefacturate')))
    assert.strictEqual(result.pendingReceipts, null)
  })
})