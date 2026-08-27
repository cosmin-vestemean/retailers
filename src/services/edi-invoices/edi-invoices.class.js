import { buildTransport } from '../../edi/transports/factory.js'
import { getProvider } from '../../edi/providers/factory.js'
import { joinRemote } from '../../edi/scanner.js'
import { signSmime } from '../../edi/sign-smime.js'

export class EdiInvoicesService {
  constructor(options) {
    this.options = options
    this.app = options.app
    this.buildTransport = options.buildTransport || buildTransport
  }

  async create(data, params) {
    const retailer = parseInt(data?.retailer ?? data?.trdr ?? params?.query?.retailer, 10)
    const { findoc, xml, filename } = data || {}

    if (!Number.isInteger(retailer)) return this.fail(retailer, findoc, filename, 'Missing retailer')
    if (!findoc) return this.fail(retailer, findoc, filename, 'Missing FINDOC')
    if (!xml) return this.fail(retailer, findoc, filename, 'Missing XML data')
    if (!filename) return this.fail(retailer, findoc, filename, 'Missing XML filename')

    const configs = await this.app.service('CCCSFTP').list({ onlyActive: true })
    const sftpRow = (configs.data || []).find((r) => parseInt(r.TRDR_RETAILER, 10) === retailer)
    if (!sftpRow) return this.fail(retailer, findoc, filename, `Missing SFTP config for retailer ${retailer}`)

    const provider = getProvider({ CODE: sftpRow.PROVIDER_CODE, NAME: sftpRow.PROVIDER_NAME })
    const remoteDir = joinRemote(sftpRow.INITIALDIROUT, provider.remoteSubdir('invoice'))
    if (!remoteDir || remoteDir === '/') return this.fail(retailer, findoc, filename, `Missing invoice upload directory for retailer ${retailer}`)

    // Infinite requires a detached S/MIME signature over the raw XML; DocProcess does not.
    let payload = xml
    if (provider.code === 'infinite') {
      try {
        payload = signSmime(xml)
      } catch (error) {
        return this.fail(retailer, findoc, filename, `S/MIME signing failed: ${error.message}`)
      }
    }

    let transport
    try {
      transport = this.buildTransport(sftpRow, sftpRow.PROVIDER_CONNTYPE)
    } catch (error) {
      return this.fail(retailer, findoc, filename, error.message)
    }

    try {
      await transport.uploadBuffer(Buffer.from(payload, 'utf8'), joinRemote(remoteDir, filename))

      // uploadBuffer() completing without throwing isn't proof the file is actually there (a
      // silent partial write/drop is possible) - list the remote dir and confirm it's listed
      // before telling the operator the invoice was sent.
      const landed = await this.verifyLanded(transport, remoteDir, filename)
      if (!landed) {
        return this.fail(retailer, findoc, filename, `Upload nu a putut fi confirmat pe FTP - fișierul nu apare în ${remoteDir} după upload`)
      }

      return this.success(retailer, findoc, filename)
    } catch (error) {
      console.error(error)
      return this.fail(retailer, findoc, filename, error.message)
    } finally {
      try { await transport.close() } catch { /* ignore */ }
    }
  }

  async verifyLanded(transport, remoteDir, filename) {
    try {
      const entries = await transport.list(remoteDir)
      return entries.some((e) => e.name === filename)
    } catch (error) {
      console.error('[edi-invoices] post-upload FTP verification failed:', error.message)
      return false
    }
  }

  async success(retailer, findoc, filename) {
    await this.log(retailer, findoc, 'success', `Factură ${filename} trimisă și confirmată pe FTP`)
    return { findoc, filename, success: true }
  }

  async fail(retailer, findoc, filename, message) {
    await this.log(retailer, findoc, 'error', `Trimitere factură eșuată${filename ? ` (${filename})` : ''}: ${message}`)
    return { findoc, filename, success: false, message }
  }

  // Own OPERATION value ('sendInvoice') so both outcomes of the actual send action (not just the
  // XML-build step logged by get-invoice-dom.class.js) are visible on the app's Logs screen.
  async log(retailer, findoc, level, message) {
    try {
      await this.app.service('orders-log').create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: Number.isInteger(retailer) ? retailer : -1,
        ORDERID: findoc ? `FINDOC=${findoc}` : '',
        OPERATION: 'sendInvoice',
        LEVEL: level,
        MESSAGETEXT: message
      })
    } catch (e) {
      console.error('[edi-invoices] orders-log insert failed:', e.message)
    }
  }
}

export const getOptions = (app) => ({ app })