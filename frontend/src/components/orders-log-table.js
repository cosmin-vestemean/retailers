import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { getOrdersLog } from '@/services/api.js'
import { RETAILERS } from '@/state/app-context.js'

const OP_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'downloadXml', label: 'Download XML' },
  { value: 'storeXmlInDB', label: 'Store in DB' },
  { value: 'createOrders', label: 'Create orders' },
  { value: 'system', label: 'System' },
]

export class OrdersLogTable extends LitElement {
  static properties = {
    _logs: { state: true },
    _total: { state: true },
    _page: { state: true },
    _pageSize: { state: true },
    _loading: { state: true },
    _loaded: { state: true },
    _error: { state: true },
    // filters
    _trdr: { state: true },
    _orderid: { state: true },
    _dateFrom: { state: true },
    _dateTo: { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .filters { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; }
    .filters .field { margin-bottom: 0; }
    table { width: 100%; font-size: 0.85rem; }
    th { white-space: nowrap; }
    td { vertical-align: top; }
    .msg-cell { max-width: 500px; word-break: break-word; }
    .msg-cell pre { white-space: pre-wrap; font-size: 0.75rem; max-height: 120px; overflow: auto; margin: 0; }
    .pagination-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; }
    .refresh-btn { cursor: pointer; background: none; border: none; font-size: 1.1rem; padding: 0.25em; }
    .refresh-btn:hover { opacity: 0.7; }
    .spinner-inline {
      display: inline-block; width: 1em; height: 1em;
      border: 2px solid hsl(0, 0%, 86%);
      border-top-color: hsl(204, 86%, 53%);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .placeholder {
      text-align: center; padding: 3rem 1rem; color: hsl(0, 0%, 48%);
    }
  `]

  constructor() {
    super()
    this._logs = []
    this._total = 0
    this._page = 1
    this._pageSize = 25
    this._loading = false
    this._loaded = false
    this._error = null
    this._trdr = ''
    this._orderid = ''
    this._dateFrom = ''
    this._dateTo = ''
  }

  get _totalPages() {
    return Math.max(1, Math.ceil(this._total / this._pageSize))
  }

  async _search() {
    this._page = 1
    await this._fetchLogs()
  }

  async _fetchLogs() {
    this._loading = true
    this._error = null
    try {
      const res = await getOrdersLog({
        trdr: this._trdr === '' ? undefined : parseInt(this._trdr),
        orderid: this._orderid || undefined,
        dateFrom: this._dateFrom || undefined,
        dateTo: this._dateTo || undefined,
        page: this._page,
        pageSize: this._pageSize,
      })
      if (res.success) {
        this._logs = res.data || []
        this._total = res.total || 0
        this._loaded = true
      } else {
        this._error = res.error || 'Eroare necunoscută'
      }
    } catch (e) {
      this._error = e.message
    } finally {
      this._loading = false
    }
  }

  _prevPage() {
    if (this._page > 1) { this._page--; this._fetchLogs() }
  }

  _nextPage() {
    if (this._page < this._totalPages) { this._page++; this._fetchLogs() }
  }

  _retailerName(trdr) {
    if (trdr === -1) return 'System'
    const r = RETAILERS.find(r => r.trdr === trdr)
    return r ? r.name : String(trdr)
  }

  _opLabel(orderid) {
    const op = OP_OPTIONS.find(o => o.value === orderid)
    return op ? op.label : orderid
  }

  render() {
    return html`
      <div class="box">
        <!-- Filters -->
        <div class="filters mb-4">
          <div class="field">
            <label class="label is-small">Retailer</label>
            <div class="control">
              <div class="select is-small">
                <select @change=${e => this._trdr = e.target.value}>
                  <option value="">Toți</option>
                  <option value="-1">System</option>
                  ${RETAILERS.map(r => html`
                    <option value=${r.trdr}>${r.name}</option>
                  `)}
                </select>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label is-small">Operație</label>
            <div class="control">
              <div class="select is-small">
                <select @change=${e => this._orderid = e.target.value}>
                  ${OP_OPTIONS.map(o => html`
                    <option value=${o.value}>${o.label}</option>
                  `)}
                </select>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label is-small">De la</label>
            <div class="control">
              <input class="input is-small" type="date"
                .value=${this._dateFrom}
                @change=${e => this._dateFrom = e.target.value}>
            </div>
          </div>

          <div class="field">
            <label class="label is-small">Până la</label>
            <div class="control">
              <input class="input is-small" type="date"
                .value=${this._dateTo}
                @change=${e => this._dateTo = e.target.value}>
            </div>
          </div>

          <div class="field">
            <label class="label is-small">&nbsp;</label>
            <div class="control">
              <button class="button is-info is-small" @click=${this._search}
                ?disabled=${this._loading}>
                ${this._loading
                  ? html`<span class="spinner-inline"></span>`
                  : 'Caută'}
              </button>
            </div>
          </div>

          ${this._loaded ? html`
            <div class="field">
              <label class="label is-small">&nbsp;</label>
              <div class="control">
                <button class="refresh-btn" title="Reîncarcă"
                  @click=${() => this._fetchLogs()} ?disabled=${this._loading}>
                  &#x21bb;
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        ${this._error ? html`
          <div class="notification is-danger is-light py-2 px-3 mb-3" style="font-size:0.85rem;">
            ${this._error}
          </div>
        ` : ''}

        ${!this._loaded && !this._loading && !this._error ? html`
          <div class="placeholder">
            <p class="is-size-5 mb-2">&#x1f50d;</p>
            <p>Selectează filtrele dorite și apasă <strong>Caută</strong>.</p>
          </div>
        ` : ''}

        ${this._loaded ? html`
          <div class="table-container">
            <table class="table is-hoverable is-fullwidth is-striped">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Retailer</th>
                  <th>Operație</th>
                  <th>Mesaj</th>
                </tr>
              </thead>
              <tbody>
                ${this._logs.length === 0 ? html`
                  <tr><td colspan="4" class="has-text-centered has-text-grey">
                    Niciun rezultat.
                  </td></tr>
                ` : this._logs.map(log => html`
                  <tr>
                    <td style="white-space:nowrap;">${log.MESSAGEDATE ?? ''}</td>
                    <td>${this._retailerName(log.TRDR_RETAILER)}</td>
                    <td><span class="tag is-light">${this._opLabel(log.ORDERID)}</span></td>
                    <td class="msg-cell">${unsafeHTML(log.MESSAGETEXT ?? '')}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>

          <div class="pagination-row">
            <span class="is-size-7 has-text-grey">
              ${this._total} rezultate — pagina ${this._page}/${this._totalPages}
            </span>
            <div class="buttons are-small">
              <button class="button is-small" ?disabled=${this._page <= 1}
                @click=${this._prevPage}>&#8592; Prev</button>
              <button class="button is-small" ?disabled=${this._page >= this._totalPages}
                @click=${this._nextPage}>Next &#8594;</button>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }
}

customElements.define('orders-log-table', OrdersLogTable)
