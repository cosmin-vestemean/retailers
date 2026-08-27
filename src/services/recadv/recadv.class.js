import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'
import { parseS1Json } from '../../s1-response.js'
import { reconcileRecadv } from '../../edi/recadv-reconciler.js'

/**
 * Thin Feathers proxy over S1/JS/AJS/RECADV.js. Assembles the reconciler's `lookup` seam
 * from getAdvicesByCode/getAdvicesByOrder/getAdviceLines, loads parsed RECADV documents via
 * getRecadvDocuments, and merges the reconciliation result onto the paginated advice list
 * from getReceptionsData — the actual screen data source. Reconciliation is computed on
 * demand and never persisted (see current-focus.md Confirmed Decisions).
 */
export class RecadvService {
  constructor(options) {
    this.options = options
    this.fetch = options.fetch || fetch
  }

  // Item B: creates the invoice for one clean 7111 advice via S1/JS/AJS/RECADV.js's
  // createInvoiceFromReception (X.CreateObj('SALDOC;EF')). Never automatic — one explicit click.
  async create(data) {
    const findoc = parseInt(data?.findoc, 10)
    if (!findoc) return { success: false, error: 'Invalid advice FINDOC provided.' }
    const result = await this.callAjs('createInvoiceFromReception', { findoc })
    await this.logInvoiceResult({ trdr: data?.trdr, findoc, adviceFincode: data?.fincode, result })
    return result
  }

  // Own OPERATION value ('createInvoice') in CCCORDERSLOG, kept distinct from the automated
  // order-intake pipeline's 'createDocument' — this is a manual, user-triggered action.
  async logInvoiceResult({ trdr, findoc, adviceFincode, result }) {
    const adviceRef = adviceFincode || `FINDOC=${findoc}`
    const message = result?.success
      ? `Factură creată din recepția ${adviceRef}: FINCODE=${result.fincode} FINDOC=${result.findoc}`
      : `Facturare eșuată pentru recepția ${adviceRef}: ${result?.error || 'Eroare necunoscută'}`
    try {
      await this.options.app.service('orders-log').create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: parseInt(trdr, 10) || -1,
        ORDERID: adviceRef,
        OPERATION: 'createInvoice',
        LEVEL: result?.success ? 'success' : 'error',
        MESSAGETEXT: message
      })
    } catch (e) {
      console.error('[recadv] orders-log insert failed:', e.message)
    }
  }

  async find(params) {
    const { trdr, page = 1, pageSize = 25, daysOlder = 30, search = '' } = params.query || {}
    const trdrNum = parseInt(trdr, 10)
    if (!trdrNum) return { success: false, error: 'Invalid retailer ID (trdr) provided.' }

    try {
      const receptionsResult = await this.callAjs('getReceptionsData', { trdr: trdrNum, page, pageSize, daysOlder, search })
      if (!receptionsResult.success) return receptionsResult

      const documents = await this.loadDocuments({ trdr: trdrNum, daysOlder })
      const { receptions, summary } = await reconcileRecadv({ documents, lookup: this.buildLookup() })

      const byFindoc = new Map()
      for (const reception of receptions) {
        for (const advice of reception.advices) byFindoc.set(String(advice.FINDOC), reception)
      }

      const data = (receptionsResult.data || []).map((row) => ({
        ...row,
        reconciliation: this.toReconciliationView(byFindoc.get(String(row.FINDOC)))
      }))

      return {
        success: true,
        data,
        total: receptionsResult.total,
        page: receptionsResult.page,
        pageSize: receptionsResult.pageSize,
        summary
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  // Advices with no reception yet (RECADV not received, or received but unresolved) still
  // render — 'not_received' distinguishes "nothing to reconcile against" from a bad match.
  toReconciliationView(reception) {
    if (!reception) return { status: 'not_received' }
    const {
      status, resolvedBy, files, documentNumbers, lines,
      blockedLines, differenceLines, unresolvedLines,
      missingOnReceipt, gtinMismatches, palletLines
    } = reception
    return {
      status, resolvedBy, files, documentNumbers, lines,
      blockedLines, differenceLines, unresolvedLines,
      missingOnReceipt, gtinMismatches, palletLines
    }
  }

  buildLookup() {
    return {
      findAdvices: async ({ trdr, suffixes, orders }) => {
        const [byCode, byOrder] = await Promise.all([
          suffixes?.length ? this.callAjs('getAdvicesByCode', { trdr, codes: suffixes }) : { success: true, data: [] },
          orders?.length ? this.callAjs('getAdvicesByOrder', { trdr, orders }) : { success: true, data: [] }
        ])
        if (!byCode.success) throw new Error(byCode.error || 'getAdvicesByCode failed')
        if (!byOrder.success) throw new Error(byOrder.error || 'getAdvicesByOrder failed')
        const seen = new Set()
        return [...byCode.data, ...byOrder.data].filter((row) => !seen.has(row.FINDOC) && seen.add(row.FINDOC))
      },
      findAdviceLines: async ({ findocs }) => {
        const result = await this.callAjs('getAdviceLines', { findocs })
        if (!result.success) throw new Error(result.error || 'getAdviceLines failed')
        return result.data || []
      }
    }
  }

  async loadDocuments({ trdr, daysOlder }) {
    const result = await this.callAjs('getRecadvDocuments', { trdr, daysOlder })
    if (!result.success) throw new Error(result.error || 'getRecadvDocuments failed')
    return (result.data || []).map((row) => this.parseDocument(row)).filter(Boolean)
  }

  // A single malformed JSONDATA row must not take down the whole screen.
  parseDocument(row) {
    try {
      return { ...JSON.parse(row.JSONDATA || '{}'), file: row.XMLFILENAME, cccsftpxml: row.CCCSFTPXML }
    } catch {
      return null
    }
  }

  async callAjs(fn, body) {
    const url = buildS1Url(`/JS/RECADV/${fn}`, { app: this.options.app })
    const response = await this.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return parseS1Json(response, `RECADV/${fn}`)
  }
}

export const getOptions = (app) => ({ app })
