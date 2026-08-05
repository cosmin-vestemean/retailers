// Integration test: local ftp-srv stands in for ftp.infinite.pl.
// Verifies the scanner's download-and-insert pipeline end-to-end without
// touching production. The safe-host guard in transports/safe-host.js makes
// dialing a real production host physically impossible while NODE_ENV=test.
import assert from 'node:assert'
import path from 'node:path'
import fs from 'node:fs/promises'
import { feathers } from '@feathersjs/feathers'

import { startFtp, makeWorkdir, FIXTURES_DIR } from './ftp-server.js'
import { scanAll } from '../../src/edi/scanner.js'

const TEST_PORT = 2121

function buildMockApp(testRow, store, options = {}) {
  const app = feathers()
  const testRows = Array.isArray(testRow) ? testRow : [testRow]

  app.use('CCCSFTP', {
    async find() { return { data: testRows, total: testRows.length } },
    async list() { return { data: testRows, total: testRows.length } }
  }, { methods: ['find', 'list'] })

  app.use('CCCSFTPXML', {
    async find({ query }) {
      const match = store.filter((r) => r.XMLFILENAME === query.XMLFILENAME)
      return { data: match, total: match.length, limit: 1, skip: 0 }
    },
    async create(data) {
      if (options.failCreate) throw new Error('S1 insert failed')
      const row = { CCCSFTPXML: store.length + 1, ...data }
      store.push(row)
      return row
    },
    async patch() { return null },
    async pending() { return { data: [] } },
    async claim() { return false }
  }, { methods: ['find', 'create', 'patch', 'pending', 'claim'] })

  if (options.doStorage) {
    app.use('do-storage', options.doStorage, { methods: ['backupXml', 'moveToRetry', 'deleteSuccess'] })
  }

  return app
}

describe('EDI scanner against local ftp-srv', function () {
  this.timeout(30000)
  let stop, cleanup, root

  before(async () => {
    assert.strictEqual(process.env.NODE_ENV, 'test', 'must run under NODE_ENV=test for safe-host guard')
    const wd = await makeWorkdir()
    root = wd.root
    cleanup = wd.cleanup
    const srv = await startFtp({ port: TEST_PORT, root })
    stop = srv.stop
  })

  after(async () => {
    try { await stop?.() } catch { /* ignore */ }
    try { await cleanup?.() } catch { /* ignore */ }
    // Clean per-run download dir
    try { await fs.rm(path.join('data', 'infinite', '99999'), { recursive: true, force: true }) } catch {}
  })

  it('refuses to construct a transport pointing at a production host', async () => {
    const { FtpTransport } = await import('../../src/edi/transports/ftp-transport.js')
    assert.throws(
      () => new FtpTransport({ host: 'ftp.infinite.pl', port: 21, username: 'x', password: 'y' }),
      /refusing non-loopback host/
    )
  })

  it('lists, downloads and stores both AUCHAN_ and DEDEMAN_ fixtures', async () => {
    const pdfPath = path.join(root, 'orders', 'AUCHAN_900000003.pdf')
    await fs.writeFile(pdfPath, '%PDF-1.4 fake non-XML payload')

    const store = []
    const testRow = {
      CCCSFTP: 999,
      TRDR_CLIENT: 1,
      TRDR_RETAILER: 99999,
      URL: '127.0.0.1',
      PORT: TEST_PORT,
      USERNAME: 'testuser',
      PASSPHRASE: 'testpass',
      INITIALDIRIN: '/',
      INITIALDIROUT: '/',
      PROVIDER_CODE: 'infinite',
      PROVIDER_NAME: 'Infinite Edinet',
      PROVIDER_CONNTYPE: 4
    }
    const app = buildMockApp(testRow, store)

    const stats = await scanAll(app)

    assert.deepStrictEqual(stats.errors, [], 'no errors expected')
    assert.strictEqual(stats.providers, 1)
    assert.strictEqual(stats.downloaded, 2, 'two order fixtures should be downloaded')
    assert.strictEqual(stats.inserted, 2)
    assert.strictEqual(stats.duplicates, 0)

    const filenames = store.map((r) => r.XMLFILENAME).sort()
    assert.deepStrictEqual(filenames, ['AUCHAN_900000001.xml', 'DEDEMAN_900000002.xml'],
      'the /retann/ and /recadv/ fixtures must stay untouched — those flows are off by default')

    for (const row of store) {
      assert.strictEqual(row.EDIDOCTYPE, 'ORDERS')
      assert.strictEqual(row.XMLSTATUS, 'NEW')
      assert.strictEqual(row.TRDR_RETAILER, 99999)
      assert.ok(row.XMLDATA.includes('<BuyerOrderNumber>'), 'XML body persisted')
    }

    await fs.rm(pdfPath, { force: true })
  })

  it('routes Infinite files to the retailer matching their filename prefix', async () => {
    const store = []
    const baseRow = {
      CCCSFTP: 999,
      TRDR_CLIENT: 1,
      URL: '127.0.0.1',
      PORT: TEST_PORT,
      USERNAME: 'testuser',
      PASSPHRASE: 'testpass',
      INITIALDIRIN: '/',
      INITIALDIROUT: '/',
      PROVIDER_CODE: 'infinite',
      PROVIDER_NAME: 'Infinite Edinet',
      PROVIDER_CONNTYPE: 4
    }
    const app = buildMockApp([
      { ...baseRow, CCCSFTP: 11654, TRDR_RETAILER: 11654 },
      { ...baseRow, CCCSFTP: 13248, TRDR_RETAILER: 13248 }
    ], store)

    const stats = await scanAll(app)

    assert.deepStrictEqual(stats.errors, [], 'no errors expected')
    assert.strictEqual(stats.providers, 2)
    assert.strictEqual(stats.downloaded, 2)
    assert.strictEqual(stats.inserted, 2)

    const byFilename = Object.fromEntries(store.map((row) => [row.XMLFILENAME, row.TRDR_RETAILER]))
    assert.strictEqual(byFilename['AUCHAN_900000001.xml'], 13248)
    assert.strictEqual(byFilename['DEDEMAN_900000002.xml'], 11654)
  })

  it('dedupes on second scan — no re-insert', async () => {
    const store = [
      { CCCSFTPXML: 1, XMLFILENAME: 'AUCHAN_900000001.xml', TRDR_RETAILER: 99999 },
      { CCCSFTPXML: 2, XMLFILENAME: 'DEDEMAN_900000002.xml', TRDR_RETAILER: 99999 }
    ]
    const testRow = {
      CCCSFTP: 999, TRDR_CLIENT: 1, TRDR_RETAILER: 99999,
      URL: '127.0.0.1', PORT: TEST_PORT, USERNAME: 'testuser', PASSPHRASE: 'testpass',
      INITIALDIRIN: '/', INITIALDIROUT: '/',
      PROVIDER_CODE: 'infinite', PROVIDER_NAME: 'Infinite Edinet', PROVIDER_CONNTYPE: 4
    }
    const app = buildMockApp(testRow, store)
    const stats = await scanAll(app)

    assert.strictEqual(stats.downloaded, 0, 'nothing new should be downloaded')
    assert.strictEqual(stats.inserted, 0)
    assert.strictEqual(stats.duplicates, 2)
    assert.strictEqual(store.length, 2, 'store size unchanged')
  })

  it('moves XMLs to DO retry when CCCSFTPXML insert fails', async () => {
    const store = []
    const retryKeys = []
    const testRow = {
      CCCSFTP: 999, TRDR_CLIENT: 1, TRDR_RETAILER: 99999,
      URL: '127.0.0.1', PORT: TEST_PORT, USERNAME: 'testuser', PASSPHRASE: 'testpass',
      INITIALDIRIN: '/', INITIALDIROUT: '/',
      PROVIDER_CODE: 'infinite', PROVIDER_NAME: 'Infinite Edinet', PROVIDER_CONNTYPE: 4
    }
    const app = buildMockApp(testRow, store, {
      failCreate: true,
      doStorage: {
        async backupXml({ filename }) {
          return { key: `incoming/${filename}` }
        },
        async moveToRetry(fromKey, { filename, stage }) {
          const key = `retry/${stage}/${filename}`
          retryKeys.push({ fromKey, key })
          return { key }
        },
        async deleteSuccess() {
          throw new Error('deleteSuccess should not be called on insert failure')
        }
      }
    })

    const stats = await scanAll(app)

    assert.strictEqual(stats.inserted, 0)
    assert.strictEqual(stats.retryBackedUp, 2)
    assert.strictEqual(stats.failed, 2)
    assert.deepStrictEqual(retryKeys.map((item) => item.key).sort(), [
      'retry/db-insert/AUCHAN_900000001.xml',
      'retry/db-insert/DEDEMAN_900000002.xml'
    ])
  })

  it('FIXTURES_DIR mirrors real Infinite layout (orders only for now)', async () => {
    const ordersDir = path.join(FIXTURES_DIR, 'orders')
    const files = await fs.readdir(ordersDir)
    assert.ok(files.some((f) => f.startsWith('AUCHAN_')), 'AUCHAN_ fixture present')
    assert.ok(files.some((f) => f.startsWith('DEDEMAN_')), 'DEDEMAN_ fixture present')
  })

  describe('RECADV ingestion (EDI_ENABLE_RECADV=true)', () => {
    const recadvRow = {
      CCCSFTP: 999, TRDR_CLIENT: 1, TRDR_RETAILER: 99999,
      URL: '127.0.0.1', PORT: TEST_PORT, USERNAME: 'testuser', PASSPHRASE: 'testpass',
      INITIALDIRIN: '/', INITIALDIROUT: '/',
      PROVIDER_CODE: 'infinite', PROVIDER_NAME: 'Infinite Edinet', PROVIDER_CONNTYPE: 4
    }

    beforeEach(() => { process.env.EDI_ENABLE_RECADV = 'true' })
    afterEach(() => { delete process.env.EDI_ENABLE_RECADV })

    it('stores RECADV as INGESTED, routed by buyer GLN, and fails closed on an unknown one', async () => {
      const store = []
      const stats = await scanAll(buildMockApp(recadvRow, store))

      assert.strictEqual(stats.downloaded, 4, 'two orders plus two recadv fixtures')
      assert.strictEqual(stats.inserted, 4, 'the unrouteable recadv still gets a routing-error row')
      assert.strictEqual(stats.failed, 1)

      const ingested = store.find((r) => r.XMLFILENAME === '900000010.xml')
      assert.strictEqual(ingested.EDIDOCTYPE, 'RECADV')
      assert.strictEqual(ingested.XMLSTATUS, 'INGESTED', 'NEW would make the order processor look at it')
      assert.strictEqual(ingested.TRDR_RETAILER, 11654, 'routed by BuyerParty GLN, not by the config row')

      const payload = JSON.parse(ingested.JSONDATA)
      assert.strictEqual(payload.documentNumber, '5900000010')
      assert.deepStrictEqual(payload.adviceSuffixes, ['900010'])
      assert.strictEqual(payload.items.length, 1)
      assert.strictEqual(payload.items[0].accepted, 12)
      assert.strictEqual(payload.raw, undefined, 'XMLDATA already holds the source document')

      const unrouted = store.find((r) => r.XMLFILENAME === '900000011.xml')
      assert.strictEqual(unrouted.XMLSTATUS, 'ERROR')
      assert.strictEqual(unrouted.TRDR_RETAILER, 0, 'never guess a retailer for an unknown GLN')
      assert.match(unrouted.XMLERROR, /unknown buyer GLN \(5940000000009\)/)
      assert.strictEqual(JSON.parse(unrouted.JSONDATA).routing.reason, 'unknown_buyer_gln')
    })

    it('never re-downloads a RECADV file it already stored', async () => {
      const store = [
        { CCCSFTPXML: 1, XMLFILENAME: 'AUCHAN_900000001.xml', TRDR_RETAILER: 99999 },
        { CCCSFTPXML: 2, XMLFILENAME: 'DEDEMAN_900000002.xml', TRDR_RETAILER: 99999 },
        { CCCSFTPXML: 3, XMLFILENAME: '900000010.xml', TRDR_RETAILER: 11654 },
        { CCCSFTPXML: 4, XMLFILENAME: '900000011.xml', TRDR_RETAILER: 0 }
      ]
      const stats = await scanAll(buildMockApp(recadvRow, store))

      assert.strictEqual(stats.downloaded, 0, 'each RETR re-lights the EDInet portal read flag')
      assert.strictEqual(stats.duplicates, 4)
      assert.strictEqual(store.length, 4)
    })

    it('lists the shared /recadv directory once even with both Infinite retailers configured', async () => {
      const store = []
      const stats = await scanAll(buildMockApp([
        { ...recadvRow, CCCSFTP: 11654, TRDR_RETAILER: 11654 },
        { ...recadvRow, CCCSFTP: 13248, TRDR_RETAILER: 13248 }
      ], store))

      assert.strictEqual(stats.providers, 2)
      assert.strictEqual(stats.downloaded, 4, 'one prefix-matched order each, plus the two recadv files once')
      // A second unfiltered pass over the same account+directory would re-list it and report the
      // already-inserted recadv files as duplicates. Zero proves it was skipped, not re-scanned.
      assert.strictEqual(stats.duplicates, 0)
      assert.strictEqual(store.filter((r) => r.EDIDOCTYPE === 'RECADV').length, 2)
    })
  })
})
