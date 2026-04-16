import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { scanNow, getLastScan } from '@/services/api.js'
import { logsUrl } from '@/routing/ui-routes.js'

export class ScanStatus extends LightElement {
  static properties = {
    _scanning: { state: true },
    _lastRun: { state: true },
    _error: { state: true },
  }

  constructor() {
    super()
    this._scanning = false
    this._lastRun = null
    this._error = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadLastRun()
  }

  async _loadLastRun() {
    try {
      const res = await getLastScan()
      if (res?.success && res.data?.length) {
        this._lastRun = res.data[0].MESSAGEDATE
      }
    } catch (_) { /* silent */ }
  }

  _nextRun() {
    if (!this._lastRun) return null
    const last = new Date(this._lastRun)
    if (isNaN(last.getTime())) return null
    return new Date(last.getTime() + 30 * 60 * 1000)
  }

  _formatNext() {
    const next = this._nextRun()
    if (!next) return '—'
    const now = new Date()
    const diff = next.getTime() - now.getTime()
    if (diff <= 0) return 'iminentă'
    const mins = Math.ceil(diff / 60000)
    return mins <= 60 ? `~${mins} min` : next.toLocaleString('ro-RO')
  }

  async _handleScan() {
    this._scanning = true
    this._error = null
    try {
      await scanNow()
      await this._loadLastRun()
    } catch (e) {
      this._error = e.message
    } finally {
      this._scanning = false
    }
  }

  render() {
    return html`
      <div class="card scan-card ${this._error ? 'is-error' : ''}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>Scan &amp; Send</strong>
            <button
              class="btn btn-info btn-sm"
              ?disabled=${this._scanning}
              @click=${this._handleScan}
            >
              ${this._scanning
                ? html`<span class="spinner-inline"></span> Se execută…`
                : 'Scan Now'}
            </button>
          </div>

          ${this._error ? html`
            <div class="alert alert-danger py-2 px-3 mb-2" style="font-size:0.85rem;">
              ${this._error}
            </div>
          ` : ''}

          <div class="meta">
            Ultima rulare: <strong>${this._lastRun ?? '—'}</strong>
            &nbsp;|&nbsp;
            Următoarea: <strong>${this._formatNext()}</strong>
            &nbsp;|&nbsp;
            <a href="${logsUrl()}">Vezi log-uri &rarr;</a>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('scan-status', ScanStatus)
