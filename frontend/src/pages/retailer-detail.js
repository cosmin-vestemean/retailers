import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { RETAILERS } from '@/state/app-context.js'

export class RetailerDetail extends LitElement {
  static properties = {
    trdr: { type: String },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .header { display: flex; align-items: center; gap: 1rem; }
    .header img { max-height: 48px; object-fit: contain; }
  `]

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
          <span class="tag is-info">TRDR ${r.trdr}</span>
        </div>
        <p class="mb-4">Orders and invoices tables will be implemented in <strong>Faza 2</strong>.</p>
        <a href="/" class="button is-primary">← Dashboard</a>
      </div>
    `
  }
}

customElements.define('retailer-detail', RetailerDetail)
