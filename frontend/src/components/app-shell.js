import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { Router } from '@vaadin/router'

// Import components & pages
import './login-form.js'
import './notification-toast.js'
import '@/pages/retailer-dashboard.js'
import '@/pages/retailer-detail.js'
import '@/pages/retailer-config.js'
import '@/pages/logs-page.js'

export class AppShell extends LightElement {
  static properties = {
    _user: { state: true },
  }

  constructor() {
    super()
    // Restore session
    const saved = sessionStorage.getItem('s1User')
    this._user = saved ? JSON.parse(saved) : null
  }

  firstUpdated() {
    if (this._user) {
      this._initRouter()
    }

    // Listen for toast events from anywhere in the app
    this.addEventListener('show-toast', (e) => {
      const toast = this.querySelector('notification-toast')
      if (toast) toast.show(e.detail.message, e.detail.type)
    })
  }

  _onLoginSuccess(e) {
    this._user = e.detail
    // Need to wait for the outlet to render before initializing router
    this.updateComplete.then(() => this._initRouter())
  }

  _initRouter() {
    const outlet = this.querySelector('#outlet')
    if (!outlet || outlet._routerInitialized) return
    outlet._routerInitialized = true

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
      { path: '/logs',            component: 'logs-page' },
      { path: '(.*)',           redirect: '/' },
    ])
  }

  _logout() {
    sessionStorage.removeItem('s1User')
    this._user = null
  }

  render() {
    if (!this._user) {
      return html`
        <nav>
          <span class="brand">Pet Factory — Retailers</span>
        </nav>
        <login-form @login-success=${this._onLoginSuccess}></login-form>
        <notification-toast></notification-toast>
      `
    }

    return html`
      <nav>
        <a class="brand" href="/">Pet Factory — Retailers</a>
        <a href="/">Dashboard</a>
        <a href="/logs">Logs</a>
        <div class="user-section">
          <span class="user-name">${this._user.name}</span>
          <button class="logout-btn" @click=${this._logout}>Logout</button>
        </div>
      </nav>
      <div id="outlet"></div>
      <notification-toast></notification-toast>
    `
  }
}

customElements.define('app-shell', AppShell)
