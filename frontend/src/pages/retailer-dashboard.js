import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { RETAILERS } from '@/state/app-context.js'

export class RetailerDashboard extends LitElement {
  static styles = [sharedStyles, css`
    :host { display: block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
    .card img { max-height: 48px; object-fit: contain; }
    .card-header { display: flex; align-items: center; padding: 1rem; gap: 1rem; }
    .card-header .name { font-weight: 700; font-size: 1.1rem; }
    a.card { text-decoration: none; color: inherit; transition: transform 0.15s; }
    a.card:hover { transform: translateY(-2px); }
  `]

  render() {
    return html`
      <div class="section">
        <h1 class="has-text-weight-bold mb-4" style="font-size:1.5rem;">Retailers Dashboard</h1>
        <div class="grid">
          ${RETAILERS.map(r => html`
            <a class="card" href="/retailer/${r.trdr}">
              <div class="card-header">
                <img src="${r.logo}" alt="${r.name}" />
                <span class="name">${r.name}</span>
              </div>
              <div class="card-content">
                <span class="tag is-info mr-2">TRDR ${r.trdr}</span>
              </div>
            </a>
          `)}
        </div>
      </div>
    `
  }
}

customElements.define('retailer-dashboard', RetailerDashboard)
