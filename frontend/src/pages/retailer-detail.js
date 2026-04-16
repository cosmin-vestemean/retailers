import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { dashboardUrl } from '@/routing/ui-routes.js'
import { RETAILERS } from '@/state/app-context.js'
import '@/components/orders-table.js'
import '@/components/invoice-table.js'

export class RetailerDetail extends LightElement {
  static properties = {
    trdr: { type: String },
    _tab: { state: true },
  }

  constructor() {
    super()
    this._tab = 'orders'
  }

  get retailer() {
    return RETAILERS.find(r => r.trdr === this.trdr)
  }

  render() {
    const r = this.retailer
    if (!r) return html`<div class="container-xl py-4"><p>Retailer not found (TRDR: ${this.trdr})</p></div>`

    return html`
      <div class="container-xl py-4">
        <div class="header mb-4">
          <img src="${r.logo}" alt="${r.name}" />
          <h1 class="fw-bold" style="font-size:1.5rem;">${r.name}</h1>
          <a href="${dashboardUrl()}" class="btn btn-sm ms-3">&larr; Dashboard</a>
        </div>

        <ul class="nav nav-tabs mb-3">
          <li class="nav-item">
            <a class="nav-link ${this._tab === 'orders' ? 'active' : ''}"
               href="#" @click=${(e) => { e.preventDefault(); this._tab = 'orders' }}>Comenzi</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${this._tab === 'invoices' ? 'active' : ''}"
               href="#" @click=${(e) => { e.preventDefault(); this._tab = 'invoices' }}>Facturi</a>
          </li>
        </ul>

        <div class="tab-content">
          ${this._tab === 'orders' ? html`
            <orders-table .trdr=${this.trdr}></orders-table>
          ` : html`
            <invoice-table .trdr=${this.trdr}></invoice-table>
          `}
        </div>
      </div>
    `
  }
}

customElements.define('retailer-detail', RetailerDetail)
