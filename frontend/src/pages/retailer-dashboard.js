import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { RETAILERS } from '@/state/app-context.js'
import '@/components/retailer-card.js'
import '@/components/scan-status.js'

export class RetailerDashboard extends LitElement {
  static styles = [sharedStyles, css`
    :host { display: block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
  `]

  render() {
    return html`
      <div class="section">
        <h1 class="has-text-weight-bold mb-4" style="font-size:1.5rem;">Retailers Dashboard</h1>

        <div class="mb-5">
          <scan-status></scan-status>
        </div>

        <div class="grid">
          ${RETAILERS.map(r => html`
            <retailer-card
              trdr=${r.trdr}
              name=${r.name}
              logo=${r.logo}
            ></retailer-card>
          `)}
        </div>
      </div>
    `
  }
}

customElements.define('retailer-dashboard', RetailerDashboard)
