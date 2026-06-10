import assert from 'node:assert'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { feathers } from '@feathersjs/feathers'

import { SftpService } from '../../../src/services/sftp/sftp.class.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APERAK_FIXTURE = path.join(__dirname, '../../edi/fixtures/docprocess/aperak/APERAK_TEST_DX01_900000001.xml')

function buildApp({ invoiceDocuments = {}, aperakStore = [] } = {}) {
  const app = feathers()

  app.use('CCCAPERAK', {
    async find({ query }) {
      const match = aperakStore.filter((row) => !query.DOCUMENTUID || row.DOCUMENTUID === query.DOCUMENTUID)
      return { data: match.slice(0, query.$limit || 50), total: match.length }
    },
    async create(data) {
      const row = { CCCAPERAK: aperakStore.length + 1, ...data }
      aperakStore.push(row)
      return row
    }
  }, { methods: ['find', 'create'] })

  app.use('getDataset1', {
    async find({ query }) {
      const match = String(query.sqlQuery || '').match(/LIKE '%([^']+)%'/)
      const document = invoiceDocuments[match?.[1]]
      return { success: true, data: document ? [document] : [], total: document ? 1 : 0 }
    }
  }, { methods: ['find'] })

  return { app, aperakStore }
}

async function makeRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sftp-aperak-'))
  await fs.mkdir(path.join(root, 'xml'), { recursive: true })
  await fs.copyFile(APERAK_FIXTURE, path.join(root, 'xml', 'APERAK_TEST_DX01_900000001.xml'))
  return root
}

describe('legacy sftp APERAK storage', () => {
  it('returns an empty success result when the APERAK folder does not exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sftp-aperak-missing-'))
    try {
      const { app } = buildApp()
      const service = new SftpService({ app })

      const result = await service.storeAperakInErpMessages({}, { query: { rootPath: path.join(root, 'aperak') } })

      assert.deepStrictEqual(result, [{ success: true, message: 'No APERAK files to store' }])
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('stores unlinked APERAK files and moves them to processed', async () => {
    const root = await makeRoot()
    try {
      const { app, aperakStore } = buildApp()
      const service = new SftpService({ app })

      const result = await service.storeAperakInErpMessages({}, { query: { rootPath: root } })

      assert.strictEqual(result[0].success, true)
      assert.strictEqual(result[0].message, 'No document found in ERP')
      assert.strictEqual(aperakStore.length, 1)
      assert.strictEqual(aperakStore[0].FINDOC, -1)
      assert.strictEqual(aperakStore[0].TRDR_RETAILER, -1)
      assert.strictEqual(aperakStore[0].XMLFILENAME, 'APERAK_TEST_DX01_900000001.xml')
      await fs.access(path.join(root, 'xml', 'processed', 'APERAK_TEST_DX01_900000001.xml'))
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('does not insert duplicate APERAK rows on repeated processing', async () => {
    const root = await makeRoot()
    try {
      const { app, aperakStore } = buildApp({
        invoiceDocuments: {
          38723: {
            FINDOC: 2145262,
            retailer: 11322,
            xmlFilename: 'INVOIC_38723_VAT_RO25190857.xml',
            xmlSentDate: '2026-06-10T08:00:00.000Z'
          }
        }
      })
      const service = new SftpService({ app })

      const first = await service.storeAperakInErpMessages({}, { query: { rootPath: root } })
      await fs.copyFile(APERAK_FIXTURE, path.join(root, 'xml', 'APERAK_TEST_DX01_900000001.xml'))
      const second = await service.storeAperakInErpMessages({}, { query: { rootPath: root } })

      assert.strictEqual(first[0].success, true)
      assert.strictEqual(second[0].success, true)
      assert.strictEqual(second[0].message, 'APERAK already stored')
      assert.strictEqual(aperakStore.length, 1)
      assert.strictEqual(aperakStore[0].FINDOC, 2145262)
      assert.strictEqual(aperakStore[0].TRDR_RETAILER, 11322)
      assert.strictEqual(aperakStore[0].XMLFILENAME, 'INVOIC_38723_VAT_RO25190857.xml')
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})