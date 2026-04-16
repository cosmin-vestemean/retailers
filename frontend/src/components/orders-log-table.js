import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { getOrdersLog } from '@/services/api.js'
import { RETAILERS } from '@/state/app-context.js'

const OP_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'downloadXml', label: 'Download XML' },
  { value: 'storeXmlInDB', label: 'Store in DB' },
  { value: 'createOrders', label: 'Create orders' },
  { value: 'processOrder', label: 'Process order' },
  { value: 'createDocument', label: 'Create document' },
  { value: 'mappingError', label: 'Mapping error' },
  { value: 'emailNotify', label: 'Email notify' },
  { value: 'system', label: 'System' },
]

const LEVEL_OPTIONS = [
  { value: '', label: 'Toate' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
]

export class OrdersLogTable extends LightElement {
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
    _operation: { state: true },
    _level: { state: true },
    _orderid: { state: true },
    _dateFrom: { state: true },
    _dateTo: { state: true },
  }

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
    this._operation = ''
    this._level = ''
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
        operation: this._operation || undefined,
        level: this._level || undefined,
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

  _opLabel(op) {
    const o = OP_OPTIONS.find(o => o.value === op)
    return o ? o.label : op
  }

  _levelClass(level) {
    switch (level) {
      case 'error': return 'text-danger'
      case 'warn': return 'text-warning'
      case 'success': return 'text-success'
      default: return 'text-secondary'
    }
  }

  render() {
    return html`
      <div class="card shadow-sm border-0">
        <div class="card-header bg-body-tertiary border-0 py-3 px-4">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h2 class="h5 mb-1">Logs procesare</h2>
              <p class="text-secondary small mb-0">Filtrează după retailer, operație și interval.</p>
            </div>

            ${this._loaded ? html`
              <button class="btn btn-outline-secondary btn-sm" title="Reîncarcă"
                @click=${() => this._fetchLogs()} ?disabled=${this._loading} type="button">
                Reîncarcă
              </button>
            ` : ''}
          </div>
        </div>

        <div class="card-body p-4">
          <div class="row g-3 align-items-end mb-4">
            <div class="col-12 col-md-6 col-xl-3">
              <label class="form-label small">Retailer</label>
            <select class="form-select form-select-sm" @change=${e => this._trdr = e.target.value}>
              <option value="">Toți</option>
              <option value="-1">System</option>
              ${RETAILERS.map(r => html`
                <option value=${r.trdr}>${r.name}</option>
              `)}
            </select>
            </div>

            <div class="col-12 col-md-6 col-xl-3">
              <label class="form-label small">Operație</label>
            <select class="form-select form-select-sm" @change=${e => this._operation = e.target.value}>
              ${OP_OPTIONS.map(o => html`
                <option value=${o.value}>${o.label}</option>
              `)}
            </select>
            </div>

            <div class="col-12 col-md-6 col-xl-2">
              <label class="form-label small">Nivel</label>
            <select class="form-select form-select-sm" @change=${e => this._level = e.target.value}>
              ${LEVEL_OPTIONS.map(o => html`
                <option value=${o.value}>${o.label}</option>
              `)}
            </select>
            </div>

            <div class="col-12 col-md-6 col-xl-2">
              <label class="form-label small">De la</label>
            <input class="form-control form-control-sm" type="date"
              .value=${this._dateFrom}
              @change=${e => this._dateFrom = e.target.value}>
            </div>

            <div class="col-12 col-md-6 col-xl-2">
              <label class="form-label small">Până la</label>
            <input class="form-control form-control-sm" type="date"
              .value=${this._dateTo}
              @change=${e => this._dateTo = e.target.value}>
            </div>

            <div class="col-12 col-xl-2">
              <label class="form-label small d-none d-xl-block">&nbsp;</label>
            <button class="btn btn-info btn-sm" @click=${this._search}
              ?disabled=${this._loading} type="button">
              ${this._loading
                ? html`<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Caută`
                : 'Caută'}
            </button>
            </div>
          </div>

          ${this._error ? html`
            <div class="alert alert-danger py-2 px-3 small mb-3" role="alert">
            ${this._error}
            </div>
          ` : ''}

          ${!this._loaded && !this._loading && !this._error ? html`
            <div class="placeholder">
              <p class="fs-5 mb-2">&#x1f50d;</p>
              <p class="mb-0">Selectează filtrele dorite și apasă <strong>Caută</strong>.</p>
            </div>
          ` : ''}

          ${this._loaded ? html`
            <div class="table-responsive border rounded-3 bg-body">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Data</th>
                    <th>Retailer</th>
                    <th>Operație</th>
                    <th>Nivel</th>
                    <th>Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._logs.length === 0 ? html`
                    <tr><td colspan="5" class="text-center text-secondary py-4">
                      Niciun rezultat.
                    </td></tr>
                  ` : this._logs.map(log => html`
                    <tr>
                      <td class="text-nowrap">${log.MESSAGEDATE ?? ''}</td>
                      <td>${this._retailerName(log.TRDR_RETAILER)}</td>
                      <td><span class="badge rounded-pill text-bg-secondary">${this._opLabel(log.OPERATION)}</span></td>
                      <td><span class="fw-semibold ${this._levelClass(log.LEVEL)}">${log.LEVEL || '—'}</span></td>
                      <td class="msg-cell">${log.MESSAGETEXT ?? ''}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>

            <div class="pagination-row">
              <span class="small text-secondary orders-log-summary">
                ${this._total} rezultate — pagina ${this._page}/${this._totalPages}
              </span>
              <div class="btn-group btn-group-sm" role="group" aria-label="Paginare loguri">
                <button class="btn btn-outline-secondary" ?disabled=${this._page <= 1}
                  @click=${this._prevPage} type="button">&#8592; Prev</button>
                <button class="btn btn-outline-secondary" ?disabled=${this._page >= this._totalPages}
                  @click=${this._nextPage} type="button">Next &#8594;</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }
}

customElements.define('orders-log-table', OrdersLogTable)
