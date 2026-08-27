import { buildTransport } from '../../edi/transports/factory.js'
import { getProvider } from '../../edi/providers/factory.js'
import { joinRemote } from '../../edi/scanner.js'
import { signSmime } from '../../edi/sign-smime.js'

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

    const configs = await this.app.service('CCCSFTP').list({ onlyActive: true })
    const sftpRow = (configs.data || []).find((r) => parseInt(r.TRDR_RETAILER, 10) === retailer)
    if (!sftpRow) return { success: false, message: `Missing SFTP config for retailer ${retailer}` }

    const provider = getProvider({ CODE: sftpRow.PROVIDER_CODE, NAME: sftpRow.PROVIDER_NAME })
    const remoteDir = joinRemote(sftpRow.INITIALDIROUT, provider.remoteSubdir('invoice'))
    if (!remoteDir || remoteDir === '/') return { success: false, message: `Missing invoice upload directory for retailer ${retailer}` }

    // Infinite requires a detached S/MIME signature over the raw XML; DocProcess does not.
    let payload = xml
    if (provider.code === 'infinite') {
      try {
        payload = signSmime(xml)
      } catch (error) {
        return { findoc, filename, success: false, message: `S/MIME signing failed: ${error.message}` }
      }
    }

    let transport
    try {
      transport = buildTransport(sftpRow, sftpRow.PROVIDER_CONNTYPE)
    } catch (error) {
      return { findoc, filename, success: false, message: error.message }
    }

    try {
      await transport.uploadBuffer(Buffer.from(payload, 'utf8'), joinRemote(remoteDir, filename))
      return { findoc, filename, success: true }
    } catch (error) {
      console.error(error)
      return { findoc, filename, success: false, message: error.message }
    } finally {
      try { await transport.close() } catch { /* ignore */ }
    }
  }
}

export const getOptions = (app) => ({ app })