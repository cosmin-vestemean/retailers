import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { Router } from '@vaadin/router'
import { UI_ROUTES, dashboardUrl, logsUrl } from '@/routing/ui-routes.js'

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
      { path: UI_ROUTES.dashboard, component: 'retailer-dashboard' },
      { path: UI_ROUTES.retailer, component: 'retailer-detail',
        action: (ctx, commands) => {
          const el = commands.component('retailer-detail')
          el.trdr = ctx.params.trdr
          return el
        }
      },
      { path: UI_ROUTES.config, component: 'retailer-config',
        action: (ctx, commands) => {
          const el = commands.component('retailer-config')
          el.trdr = ctx.params.trdr
          return el
        }
      },
      { path: UI_ROUTES.logs, component: 'logs-page' },
      { path: '(.*)', redirect: UI_ROUTES.fallback },
    ])
  }

  _logout() {
    sessionStorage.removeItem('s1User')
    this._user = null
  }

  render() {
    if (!this._user) {
      return html`
        <header class="navbar navbar-expand-md navbar-dark d-print-none" data-bs-theme="dark">
          <div class="container-xl">
            <span class="navbar-brand">Pet Factory — Retailers</span>
          </div>
        </header>
        <login-form @login-success=${this._onLoginSuccess}></login-form>
        <notification-toast></notification-toast>
      `
    }

    return html`
      <header class="navbar navbar-expand-md navbar-dark d-print-none" data-bs-theme="dark">
        <div class="container-xl">
          <a class="navbar-brand" href="${dashboardUrl()}">Pet Factory — Retailers</a>
          <div class="navbar-nav flex-row ms-auto">
            <a class="nav-link" href="${dashboardUrl()}">Dashboard</a>
            <a class="nav-link" href="${logsUrl()}">Logs</a>
          </div>
          <div class="navbar-nav flex-row ms-3 align-items-center">
            <span class="text-white opacity-75 me-2">${this._user.name}</span>
            <button class="btn btn-sm btn-outline-light" @click=${this._logout}>Logout</button>
          </div>
        </div>
      </header>
      <div class="page-wrapper">
        <div id="outlet"></div>
      </div>
      <notification-toast></notification-toast>
    `
  }
}

customElements.define('app-shell', AppShell)
