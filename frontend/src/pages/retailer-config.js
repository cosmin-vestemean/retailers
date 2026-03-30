import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { RETAILERS } from '@/state/app-context.js'

export class RetailerConfig extends LitElement {
  static properties = {
    trdr: { type: String },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
  `]

  get retailer() {
    return RETAILERS.find(r => r.trdr === this.trdr)
  }

  render() {
    const r = this.retailer
    if (!r) return html`<div class="section"><p>Retailer not found.</p></div>`

    return html`
      <div class="section">
        <h1 class="has-text-weight-bold mb-4" style="font-size:1.5rem;">Config — ${r.name}</h1>
        <p class="mb-4">Configuration UI will be implemented in <strong>Faza 3</strong>.</p>
        <a href="/retailer/${r.trdr}" class="button is-primary">← Back</a>
      </div>
    `
  }
}

customElements.define('retailer-config', RetailerConfig)
