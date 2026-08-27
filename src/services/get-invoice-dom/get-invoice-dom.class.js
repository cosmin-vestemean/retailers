import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'
import { parseS1Json } from '../../s1-response.js'
import { getProvider } from '../../edi/providers/factory.js'

const DOCPROCESS_PATH = '/JS/runCmd20210915/runExternalCode'
const INFINITE_PATH = '/JS/InfiniteInvoice/buildInvoiceXml'

// DocProcess's runCmd20210915.js builds <DXInvoice>; Infinite (Auchan/Dedeman) needs its own
// native <Invoice> schema, built by InfiniteInvoice.js instead - see
// .copilot/wiki/infinite-invoice-format.md. Routing is by the retailer's CCCSFTP provider, the
// same lookup edi-invoices.class.js already uses for the upload/signing side.
export class GetInvoiceDomService {
  constructor(options) {
    this.options = options
    this.fetch = options.fetch || fetch
  }

  async find(params) {
    const query = params.query || {}
    const { clientID, appID, findoc } = query
    const trdr = parseInt(query.trdr, 10)

    let useInfinite = false
    if (Number.isInteger(trdr)) {
      try {
        const provider = await this.resolveProvider(trdr)
        useInfinite = provider?.code === 'infinite'
      } catch (e) {
        console.error('[get-invoice-dom] provider lookup failed:', e.message)
      }
    }

    const result = useInfinite
      ? await this.callAjs(INFINITE_PATH, { findoc })
      : await this.callAjs(DOCPROCESS_PATH, { clientID, appID, findoc })

    if (useInfinite && result?.success === false) {
      await this.logFailure({ trdr, findoc, message: result.message })
    }
    return result
  }

  async resolveProvider(trdr) {
    const configs = await this.options.app.service('CCCSFTP').list({ onlyActive: true })
    const row = (configs.data || []).find((r) => parseInt(r.TRDR_RETAILER, 10) === trdr)
    if (!row) return null
    return getProvider({ CODE: row.PROVIDER_CODE, NAME: row.PROVIDER_NAME })
  }

  async callAjs(path, body) {
    const url = buildS1Url(path, { app: this.options.app })
    const response = await this.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return parseS1Json(response, path)
  }

  // Mirrors recadv.class.js's logInvoiceResult pattern - only failures are logged (success just
  // returns the XML for the frontend to send, that step has its own logging once uploaded).
  async logFailure({ trdr, findoc, message }) {
    try {
      await this.options.app.service('orders-log').create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: parseInt(trdr, 10) || -1,
        ORDERID: `FINDOC=${findoc}`,
        OPERATION: 'buildInvoiceXml',
        LEVEL: 'error',
        MESSAGETEXT: `Generare XML factură Infinite eșuată pentru FINDOC=${findoc}: ${message}`
      })
    } catch (e) {
      console.error('[get-invoice-dom] orders-log insert failed:', e.message)
    }
  }
}

export const getOptions = (app) => ({ app })