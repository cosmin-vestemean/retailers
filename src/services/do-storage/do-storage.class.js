import { createDoStorageClient, makeDoXmlKey, metadataForXml } from '../../do-storage/client.js'

export class DoStorageService {
  constructor(options) {
    this.options = options
    this.app = options.app
    this.client = options.client || createDoStorageClient()
    this._retryTimer = null
  }

  async status() {
    return this.client.status()
  }

  async list(data = {}, params = {}) {
    const query = params.query || data || {}
    return this.client.list({
      prefix: query.prefix || '',
      limit: query.limit || query.$limit || 100,
      continuationToken: query.continuationToken
    })
  }

  async get(data = {}, params = {}) {
    const key = typeof data === 'string' ? data : data.key || params.query?.key
    if (!key) throw new Error('Missing DO object key')
    return this.client.getText(key)
  }

  async retry(data = {}) {
    const { retryDoFailures, retryDoObject } = await import('../../edi/do-retry.js')
    if (data.key) return retryDoObject(this.app, data.key)
    return retryDoFailures(this.app, data)
  }

  async retryPeriodically(data = {}) {
    const intervalMs = parseInt(data.intervalMs) || parseInt(process.env.DO_RETRY_INTERVAL_MS) || 5 * 60_000
    this.stopRetry()
    this._retryTimer = setInterval(() => {
      this.retry({ prefix: 'retry/' }).catch((error) => {
        this.app.get('logger')?.error?.('[do-storage] retry loop failed: ' + error.message)
        console.error('[do-storage] retry loop failed', error)
      })
    }, intervalMs)
    this.retry({ prefix: 'retry/' }).catch((error) => console.error('[do-storage] initial retry failed', error))
    return { started: true, intervalMs }
  }

  async stopRetry() {
    if (this._retryTimer) {
      clearInterval(this._retryTimer)
      this._retryTimer = null
      return { stopped: true }
    }
    return { stopped: false }
  }

  async remove(id) {
    await this.client.delete(id)
    return { key: id, deleted: true }
  }

  async backupXml({ xml, filename, provider, retailer, trdrClient, docType, stage = 'incoming', error, cccsftpxmlId, sourcePath }) {
    if (!this.client.isConfigured()) return { skipped: true }
    const key = makeDoXmlKey({ state: 'incoming', provider, retailer, docType, filename })
    const metadata = metadataForXml({ provider, retailer, trdrClient, docType, filename, stage, error, cccsftpxmlId, sourcePath, retryCount: 0 })
    await this.client.putXml({ key, xml, metadata })
    return { key, metadata }
  }

  async saveRetryXml({ key, xml, filename, provider, retailer, trdrClient, docType, stage, error, cccsftpxmlId, sourcePath, metadata }) {
    if (!this.client.isConfigured()) return { skipped: true }
    const retryKey = key || makeDoXmlKey({ state: 'retry', stage, provider, retailer, docType, filename })
    const nextMetadata = metadata || metadataForXml({
      provider,
      retailer,
      trdrClient,
      docType,
      filename,
      stage,
      error,
      cccsftpxmlId,
      sourcePath,
      retryCount: 0
    })
    await this.client.putXml({ key: retryKey, xml, metadata: nextMetadata })
    return { key: retryKey }
  }

  async moveToRetry(fromKey, { xml, filename, provider, retailer, trdrClient, docType, stage, error, cccsftpxmlId, sourcePath } = {}) {
    if (!this.client.isConfigured()) return { skipped: true }
    const retryKey = makeDoXmlKey({ state: 'retry', stage, provider, retailer, docType, filename })
    const metadata = metadataForXml({ provider, retailer, trdrClient, docType, filename, stage, error, cccsftpxmlId, sourcePath, retryCount: 0 })
    if (fromKey) return this.client.move({ fromKey, toKey: retryKey, metadata })
    return this.saveRetryXml({ key: retryKey, xml, metadata })
  }

  async deleteSuccess(key) {
    if (!this.client.isConfigured() || !key) return { skipped: true }
    await this.client.delete(key)
    return { key, deleted: true }
  }
}

export const getOptions = (app) => ({ app })