import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { scanNow, getLastScan } from '@/services/api.js'

export class ScanStatus extends LitElement {
  static properties = {
    _scanning: { state: true },
    _lastRun: { state: true },
    _error: { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .scan-card { border-left: 4px solid hsl(204, 86%, 53%); }
    .scan-card.is-error { border-left-color: hsl(348, 100%, 61%); }
    .meta { font-size: 0.85rem; color: hsl(0, 0%, 48%); }
    .spinner-inline {
      display: inline-block; width: 1em; height: 1em;
      border: 2px solid hsl(0, 0%, 86%);
      border-top-color: hsl(204, 86%, 53%);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      vertical-align: middle;
      margin-right: 0.4em;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]

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
      <div class="box scan-card ${this._error ? 'is-error' : ''}">
        <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
          <strong>Scan &amp; Send</strong>
          <button
            class="button is-info is-small"
            ?disabled=${this._scanning}
            @click=${this._handleScan}
          >
            ${this._scanning
              ? html`<span class="spinner-inline"></span> Se execută…`
              : 'Scan Now'}
          </button>
        </div>

        ${this._error ? html`
          <div class="notification is-danger is-light py-2 px-3 mb-2" style="font-size:0.85rem;">
            ${this._error}
          </div>
        ` : ''}

        <div class="meta">
          Ultima rulare: <strong>${this._lastRun ?? '—'}</strong>
          &nbsp;|&nbsp;
          Următoarea: <strong>${this._formatNext()}</strong>
          &nbsp;|&nbsp;
          <a href="/logs">Vezi log-uri &rarr;</a>
        </div>
      </div>
    `
  }
}

customElements.define('scan-status', ScanStatus)
