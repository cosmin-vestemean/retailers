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

  _renderBadge(value) {
    if (value === null) return html`<span class="badge badge-loading">...</span>`
    if (value > 0) return html`<span class="badge badge-pending" title="Ultimele 30 zile">${value}</span>`
    return html`<span class="badge badge-ok">${value}</span>`
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
      <div class="card">
        <a href="${detailsHref}">
          <div class="card-logo">
            <img src="${this.logo}" alt="${this.name}" />
          </div>
          <div class="card-name">${this.name}</div>
          <div class="stats">
            <table>
              <tr>
                <td>Comenzi de trimis:</td>
                <td>${this._renderBadge(this._pendingOrders)}</td>
              </tr>
              <tr>
                <td>Facturi de trimis:</td>
                <td>${this._renderBadge(this._pendingInvoices)}</td>
              </tr>
            </table>
          </div>
        </a>
        <div class="card-links">
          <a href="${detailsHref}">Detalii</a>
          <a href="${configHref}">Configurează</a>
        </div>
      </div>
    `
  }
}

customElements.define('retailer-card', RetailerCard)
