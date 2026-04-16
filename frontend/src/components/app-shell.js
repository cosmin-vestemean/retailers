import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { Router } from '@vaadin/router'
import { UI_ROUTES, dashboardUrl, logsUrl } from '@/routing/ui-routes.js'
import {
  applyTheme,
  getActiveThemeId,
  getAvailableThemes,
} from '@/styles/theme-manager.js'

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
    _theme: { state: true },
    _themes: { state: true },
  }

  constructor() {
    super()
    // Restore session
    const saved = sessionStorage.getItem('s1User')
    this._user = saved ? JSON.parse(saved) : null
    this._theme = getActiveThemeId()
    this._themes = getAvailableThemes()
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

  _onThemeChange(e) {
    this._theme = applyTheme(e.target.value)
  }

  _renderThemeSwitcher() {
    return html`
      <div class="theme-switcher">
        <label class="theme-switcher-label" for="theme-select">Temă</label>
        <select
          id="theme-select"
          class="form-select form-select-sm"
          .value=${this._theme}
          @change=${this._onThemeChange}
        >
          ${this._themes.map((theme) => html`
            <option value=${theme.id}>${theme.label}</option>
          `)}
        </select>
      </div>
    `
  }

  _renderHeader() {
    return html`
      <header class="navbar navbar-expand-md d-print-none app-navbar border-bottom shadow-sm">
        <div class="container-xl app-shell-header">
          ${this._user
            ? html`<a class="navbar-brand fw-semibold" href="${dashboardUrl()}">Pet Factory — Retailers</a>`
            : html`<span class="navbar-brand fw-semibold">Pet Factory — Retailers</span>`}

          ${this._user
            ? html`
                <div class="navbar-nav flex-row ms-auto gap-2">
                  <a class="nav-link px-2" href="${dashboardUrl()}">Dashboard</a>
                  <a class="nav-link px-2" href="${logsUrl()}">Logs</a>
                </div>
              `
            : html`<div class="ms-auto"></div>`}

          <div class="header-actions ${this._user ? 'ms-3' : 'ms-2'}">
            ${this._renderThemeSwitcher()}
            ${this._user
              ? html`
                  <div class="navbar-nav flex-row align-items-center">
                    <span class="text-body-secondary me-2">${this._user.name}</span>
                    <button class="btn btn-sm btn-outline-secondary" @click=${this._logout}>Logout</button>
                  </div>
                `
              : null}
          </div>
        </div>
      </header>
    `
  }

  render() {
    if (!this._user) {
      return html`
        ${this._renderHeader()}
        <login-form @login-success=${this._onLoginSuccess}></login-form>
        <notification-toast></notification-toast>
      `
    }

    return html`
      ${this._renderHeader()}
      <div class="page-wrapper">
        <div id="outlet"></div>
      </div>
      <notification-toast></notification-toast>
    `
  }
}

customElements.define('app-shell', AppShell)
