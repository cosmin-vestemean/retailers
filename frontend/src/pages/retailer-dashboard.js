import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { RETAILERS } from '@/state/app-context.js'
import '@/components/retailer-card.js'
import '@/components/scan-status.js'

export class RetailerDashboard extends LightElement {

  render() {
    return html`
      <div class="container-xl py-4">
        <h1 class="fw-bold mb-4" style="font-size:1.5rem;">Retailers Dashboard</h1>

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
