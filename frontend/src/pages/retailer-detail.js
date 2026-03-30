import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { RETAILERS } from '@/state/app-context.js'
import '@/components/orders-table.js'
import '@/components/invoice-table.js'

export class RetailerDetail extends LitElement {
  static properties = {
    trdr: { type: String },
    _tab: { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .header img { max-height: 48px; object-fit: contain; }
    .tabs-bar { display: flex; gap: 0; border-bottom: 2px solid #dbdbdb; margin-bottom: 1rem; }
    .tab-btn {
      padding: 0.6em 1.2em; cursor: pointer; font-weight: 600;
      border: none; background: none; font-size: 0.95rem; color: #666;
      border-bottom: 3px solid transparent; transition: all 0.15s;
    }
    .tab-btn:hover { color: #363636; }
    .tab-btn.active { color: #3e8ed0; border-bottom-color: #3e8ed0; }
    .tab-content { min-height: 300px; }
  `]

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
