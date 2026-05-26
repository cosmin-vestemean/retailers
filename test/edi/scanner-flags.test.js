import assert from 'node:assert'

import { EdiService } from '../../src/services/edi/edi.class.js'
import { SftpService } from '../../src/services/sftp/sftp.class.js'
import { disabledEdiScanStats, disabledScanControlResult, isScannerEnabled } from '../../src/edi/scanner-flags.js'

describe('scanner safety flags', function () {
  let originalEnableScanner

  beforeEach(() => {
    originalEnableScanner = process.env.ENABLE_SFTP_SCANNER
    delete process.env.ENABLE_SFTP_SCANNER
  })

  afterEach(() => {
    if (originalEnableScanner === undefined) delete process.env.ENABLE_SFTP_SCANNER
    else process.env.ENABLE_SFTP_SCANNER = originalEnableScanner
  })

  it('defaults scanner bootstrap to disabled unless ENABLE_SFTP_SCANNER=true', () => {
    assert.strictEqual(isScannerEnabled({}), false)
    assert.strictEqual(isScannerEnabled({ ENABLE_SFTP_SCANNER: 'false' }), false)
    assert.strictEqual(isScannerEnabled({ ENABLE_SFTP_SCANNER: 'true' }), true)
  })

  it('edi scanNow short-circuits when scanner is disabled', async () => {
    const service = new EdiService({ app: { get() { return null } } })
    const result = await service.scanNow()
    assert.deepStrictEqual(result, disabledEdiScanStats())
  })

  it('legacy scanNow short-circuits when scanner is disabled', async () => {
    const service = new SftpService({ app: {} })
    const result = await service.scanNow({}, {})
    assert.deepStrictEqual(result, disabledScanControlResult())
  })
})