import { LitElement, html, css } from 'lit'
import { Router } from '@vaadin/router'
import { sharedStyles } from '@/styles/shared-styles.js'

// Import pages so they get registered
import '@/pages/retailer-dashboard.js'
import '@/pages/retailer-detail.js'
import '@/pages/retailer-config.js'

export class AppShell extends LitElement {
  static styles = [sharedStyles, css`
    :host { display: block; min-height: 100vh; background: #f5f5f5; }

    nav {
      background: #363636; color: #fff; padding: 0.75rem 1.5rem;
      display: flex; align-items: center; gap: 1rem;
    }
    nav a { color: #fff; text-decoration: none; font-weight: 600; }
    nav a:hover { text-decoration: underline; }
    .brand { font-size: 1.25rem; font-weight: 700; margin-right: auto; }

    #outlet { min-height: calc(100vh - 52px); }
  `]

  firstUpdated() {
    const outlet = this.shadowRoot.getElementById('outlet')
    const router = new Router(outlet)
    router.setRoutes([
      { path: '/',              component: 'retailer-dashboard' },
      { path: '/retailer/:trdr', component: 'retailer-detail',
        action: (ctx, commands) => {
          const el = commands.component('retailer-detail')
          el.trdr = ctx.params.trdr
          return el
        }
      },
      { path: '/config/:trdr',  component: 'retailer-config',
        action: (ctx, commands) => {
          const el = commands.component('retailer-config')
          el.trdr = ctx.params.trdr
          return el
        }
      },
      { path: '(.*)',           redirect: '/' },
    ])
  }

  render() {
    return html`
      <nav>
        <a class="brand" href="/">Pet Factory — Retailers</a>
        <a href="/">Dashboard</a>
      </nav>
      <div id="outlet"></div>
    `
  }
}

customElements.define('app-shell', AppShell)
