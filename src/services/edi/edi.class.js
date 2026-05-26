import { scanAll } from '../../edi/scanner.js'
import { disabledEdiScanStats, disabledScanControlResult, isScannerEnabled } from '../../edi/scanner-flags.js'

export class EdiService {
  constructor(options) {
    this.options = options
    this.app = options.app
    this._timer = null
  }

  /** Synchronous trigger — runs one full scan pass and returns stats. */
  async scanNow() {
    if (!isScannerEnabled()) return disabledEdiScanStats()
    return scanAll(this.app)
  }

  /**
   * Schedule recurring scans. Idempotent: calling twice replaces the timer.
   * @param {{intervalMs?:number}} data
   */
  async scanPeriodically(data = {}) {
    if (!isScannerEnabled()) return disabledScanControlResult()
    const intervalMs = parseInt(data.intervalMs) || parseInt(process.env.EDI_SCAN_INTERVAL_MS) || 5 * 60_000
    this.stop()
    this._timer = setInterval(() => {
      scanAll(this.app).catch((e) => {
        this.app.get('logger')?.error?.('[edi-scanner] unhandled error: ' + e.message)
        console.error('[edi-scanner] unhandled error', e)
      })
    }, intervalMs)
    // Fire one immediately so callers see results without waiting for the first tick.
    scanAll(this.app).catch((e) => console.error('[edi-scanner] initial run failed', e))
    return { started: true, intervalMs }
  }

  async stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
      return { stopped: true }
    }
    return { stopped: false }
  }
}

export const getOptions = (app) => ({ app })
