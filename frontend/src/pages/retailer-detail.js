import { html } from 'lit'
import { LightElement } from '@/light-element.js'
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
    if (!r) return html`<div class="section"><p>Retailer not found (TRDR: ${this.trdr})</p></div>`

    return html`
      <div class="section">
        <div class="header mb-4">
          <img src="${r.logo}" alt="${r.name}" />
          <h1 class="has-text-weight-bold" style="font-size:1.5rem;">${r.name}</h1>
          <a href="/" class="button is-small ml-4">← Dashboard</a>
        </div>

        <div class="tabs-bar">
          <button class="tab-btn ${this._tab === 'orders' ? 'active' : ''}"
                  @click=${() => this._tab = 'orders'}>Comenzi</button>
          <button class="tab-btn ${this._tab === 'invoices' ? 'active' : ''}"
                  @click=${() => this._tab = 'invoices'}>Facturi</button>
        </div>

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
