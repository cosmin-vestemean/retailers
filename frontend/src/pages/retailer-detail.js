import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { dashboardUrl } from '@/routing/ui-routes.js'
import { RETAILERS } from '@/state/app-context.js'
import '@/components/orders-table.js'
import '@/components/invoice-table.js'
import '@/components/reception-table.js'

// RECADV only flows through Infinite Edinet today (Dedeman + Auchan) — see infinite.provider.js
// RETAILER_GLNS. Other retailers have no RECADV data, so the tab would only ever show empty rows.
const RECADV_RETAILERS = ['11654', '13248']

// Every retailer invoices on 712/7121 except these two, whose Facturi tab was empty until this map.
// They send one invoice at a time (beneficiary decision 2026-08-05), so only bulk send is hidden.
const INVOICE_SERIES = {
  '11654': { fprms: 716, series: 7123, manualSend: true },
  '13248': { fprms: 712, series: 7122, manualSend: true }
}

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

  get _hasReceptions() {
    return RECADV_RETAILERS.includes(this.trdr)
  }

  get _invoiceSeries() {
    return INVOICE_SERIES[this.trdr] || { fprms: 712, series: 7121, manualSend: false }
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
          ${this._hasReceptions ? html`
            <li class="nav-item">
              <a class="nav-link ${this._tab === 'receptions' ? 'active' : ''}"
                 href="#" @click=${(e) => { e.preventDefault(); this._tab = 'receptions' }}>Recepții</a>
            </li>
          ` : ''}
          <li class="nav-item">
            <a class="nav-link ${this._tab === 'invoices' ? 'active' : ''}"
               href="#" @click=${(e) => { e.preventDefault(); this._tab = 'invoices' }}>Facturi</a>
          </li>
        </ul>

        <div class="tab-content">
          ${this._tab === 'orders' ? html`
            <orders-table .trdr=${this.trdr}></orders-table>
          ` : this._tab === 'receptions' && this._hasReceptions ? html`
            <reception-table .trdr=${this.trdr}></reception-table>
          ` : html`
            <invoice-table
              .trdr=${this.trdr}
              .fprms=${this._invoiceSeries.fprms}
              .series=${this._invoiceSeries.series}
              .manualSend=${this._invoiceSeries.manualSend}></invoice-table>
          `}
        </div>
      </div>
    `
  }
}

customElements.define('retailer-detail', RetailerDetail)

