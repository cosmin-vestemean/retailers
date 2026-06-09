import assert from 'node:assert'
import { feathers } from '@feathersjs/feathers'

import { makeDoXmlKey, metadataForXml } from '../../src/do-storage/client.js'
import { retryDoObject } from '../../src/edi/do-retry.js'

describe('DigitalOcean XML retry storage', () => {
  it('builds stable XML keys and S3-safe metadata', () => {
    const key = makeDoXmlKey({
      state: 'retry',
      stage: 'db-insert',
      provider: 'docprocess',
      retailer: 12649,
      docType: 'orders',
      filename: 'ORDERS DX01 test.xml',
      date: '2026-06-09T10:00:00Z'
    })

    assert.strictEqual(key, 'retry/db-insert/docprocess/12649/ORDERS/2026-06-09/ORDERS-DX01-test.xml')

    const metadata = metadataForXml({
      provider: 'docprocess',
      retailer: 12649,
      trdrClient: 1,
      docType: 'ORDERS',
      filename: 'ORDERS_DX01.xml',
      stage: 'db-insert',
      error: 'line 1\nline 2',
      retryCount: 0
    })

    assert.strictEqual(metadata.provider, 'docprocess')
    assert.strictEqual(metadata.retailer, '12649')
    assert.strictEqual(metadata.trdrclient, '1')
    assert.strictEqual(metadata.error, 'line 1 line 2')
  })

  it('inserts a retry XML into CCCSFTPXML then deletes the DO object', async () => {
    const app = feathers()
    const createdRows = []
    const deletedKeys = []

    app.use('do-storage', {
      async get({ key }) {
        return {
          key,
          body: '<Order><BuyerOrderNumber>DO-1</BuyerOrderNumber></Order>',
          metadata: {
            filename: 'DO_ORDER.xml',
            retailer: '12649',
            trdrclient: '1',
            doctype: 'ORDERS'
          }
        }
      },
      async deleteSuccess(key) {
        deletedKeys.push(key)
        return { key, deleted: true }
      }
    }, { methods: ['get', 'deleteSuccess'] })

    app.use('CCCSFTPXML', {
      async find() {
        return { data: [], total: 0 }
      },
      async create(data) {
        const row = { CCCSFTPXML: 1, ...data }
        createdRows.push(row)
        return row
      }
    }, { methods: ['find', 'create'] })

    const result = await retryDoObject(app, 'retry/db-insert/docprocess/12649/ORDERS/2026-06-09/DO_ORDER.xml')

    assert.deepStrictEqual(result, {
      key: 'retry/db-insert/docprocess/12649/ORDERS/2026-06-09/DO_ORDER.xml',
      processed: true,
      success: true,
      deleted: true
    })
    assert.strictEqual(createdRows.length, 1)
    assert.strictEqual(createdRows[0].XMLFILENAME, 'DO_ORDER.xml')
    assert.strictEqual(createdRows[0].TRDR_RETAILER, 12649)
    assert.strictEqual(createdRows[0].XMLSTATUS, 'NEW')
    assert.deepStrictEqual(deletedKeys, ['retry/db-insert/docprocess/12649/ORDERS/2026-06-09/DO_ORDER.xml'])
  })
})