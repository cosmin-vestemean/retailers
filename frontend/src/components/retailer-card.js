import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { getRetailerStats } from '@/services/api.js'
import { configUrl, retailerUrl } from '@/routing/ui-routes.js'

export class RetailerCard extends LightElement {
  static properties = {
    trdr:  { type: String },
    name:  { type: String },
    logo:  { type: String },
    _pendingOrders:   { state: true },
    _pendingInvoices: { state: true },
    _invoiceList:     { state: true },
    _loading:         { state: true },
  }

  constructor() {
    super()
    this._pendingOrders = null
    this._pendingInvoices = null
    this._invoiceList = ''
    this._loading = true
  }

  connectedCallback() {
    super.connectedCallback()
    this._fetchStats()
  }

  async _fetchStats() {
    this._loading = true
    try {
      const res = await getRetailerStats(parseInt(this.trdr), { daysOlder: 30 })
      this._pendingOrders = res.pendingOrders ?? 0
      this._pendingInvoices = res.pendingInvoices ?? 0
      this._invoiceList = res.invoiceList || ''
    } catch {
      this._pendingOrders = 0
      this._pendingInvoices = 0
      this._invoiceList = ''
    } finally {
      this._loading = false
    }
  }

  _renderValue(value) {
    if (value === null) return html`<span class="retailer-card-stat text-secondary">...</span>`
    if (value > 0) return html`<span class="retailer-card-stat text-danger" title="Ultimele 30 zile">${value}</span>`
    return html`<span class="retailer-card-stat text-success">${value}</span>`
  }

  _showInvoiceDetail() {
    if (this._invoiceList) {
      this.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: this._invoiceList, type: 'is-info' },
        bubbles: true, composed: true,
      }))
    }
  }

  render() {
    const detailsHref = retailerUrl(this.trdr)
    const configHref = configUrl(this.trdr)

    return html`
      <div class="card h-100 shadow-sm border-0 retailer-card-shell">
        <a href="${detailsHref}" class="text-decoration-none text-reset">
          <div class="card-body text-center p-4">
            <div class="retailer-card-logo d-flex align-items-center justify-content-center mb-3">
              <img src="${this.logo}" alt="${this.name}" class="img-fluid retailer-card-logo-image" />
            </div>
            <h5 class="card-title mb-0">${this.name}</h5>
          </div>
          <ul class="list-group list-group-flush">
            <li class="list-group-item d-flex justify-content-between align-items-center px-4 py-3">
              <span class="fw-medium">Comenzi de trimis</span>
              ${this._renderValue(this._pendingOrders)}
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center px-4 py-3">
              <span class="fw-medium">Facturi de trimis</span>
              ${this._renderValue(this._pendingInvoices)}
            </li>
          </ul>
        </a>
        <div class="card-footer d-flex p-0">
          <a href="${detailsHref}" class="retailer-card-footer-link flex-fill text-center py-2 text-primary fw-semibold text-decoration-none">Detalii</a>
          <a href="${configHref}" class="retailer-card-footer-link flex-fill text-center py-2 text-primary fw-semibold text-decoration-none border-start">Configurează</a>
        </div>
      </div>
    `
  }
}

customElements.define('retailer-card', RetailerCard)
