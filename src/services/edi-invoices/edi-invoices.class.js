import Client from 'ssh2-sftp-client'
import { assertSafeHost } from '../../edi/transports/safe-host.js'

function joinRemotePath(dir, filename) {
  return String(dir || '').replace(/\/+$/, '') + '/' + filename
}

export class EdiInvoicesService {
  constructor(options) {
    this.options = options
    this.app = options.app
  }

  async create(data, params) {
    const retailer = parseInt(data?.retailer ?? data?.trdr ?? params?.query?.retailer, 10)
    const { findoc, xml, filename } = data || {}

    if (!Number.isInteger(retailer)) return { success: false, message: 'Missing retailer' }
    if (!findoc) return { success: false, message: 'Missing FINDOC' }
    if (!xml) return { success: false, message: 'Missing XML data' }
    if (!filename) return { success: false, message: 'Missing XML filename' }

    const sftpRows = await this.app.service('CCCSFTP').find({ query: { TRDR_RETAILER: retailer } })
    const sftpRow = sftpRows.data?.[0]
    if (!sftpRow) return { success: false, message: `Missing SFTP config for retailer ${retailer}` }
    if (!sftpRow.INITIALDIROUT) return { success: false, message: `Missing INITIALDIROUT for retailer ${retailer}` }

    const client = new Client()
    const config = {
      host: sftpRow.URL,
      port: sftpRow.PORT,
      username: sftpRow.USERNAME,
      readyTimeout: 99999
    }
    assertSafeHost(config.host)
    if (sftpRow.PRIVATEKEY) {
      config.privateKey = Buffer.from(sftpRow.PRIVATEKEY)
      if (sftpRow.PASSPHRASE) config.passphrase = sftpRow.PASSPHRASE
    } else if (sftpRow.PASSWORD || sftpRow.PASSPHRASE) {
      config.password = sftpRow.PASSWORD || sftpRow.PASSPHRASE
    } else {
      return { success: false, message: 'Missing SFTP private key or password' }
    }

    try {
      await client.connect(config)
      await client.put(Buffer.from(xml, 'utf8'), joinRemotePath(sftpRow.INITIALDIROUT, filename))
      return { findoc, filename, success: true }
    } catch (error) {
      console.error(error)
      return { findoc, filename, success: false, message: error.message }
    } finally {
      try { await client.end() } catch { /* ignore */ }
    }
  }
}

export const getOptions = (app) => ({ app })