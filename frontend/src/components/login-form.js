import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { getUsers, login } from '@/services/api.js'

export class LoginForm extends LitElement {
  static properties = {
    _users:    { state: true },
    _error:    { state: true },
    _loading:  { state: true },
    _showInfo: { state: true },
  }

  static styles = [sharedStyles, css`
    :host {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 52px); background: #f0f2f5;
    }
    .login-card {
      width: 420px; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 1.5px 6px rgba(0,0,0,0.06);
    }
    .card-content { padding: 2.5rem 2.5rem 2rem; }
    .logo { display: block; max-height: 72px; margin: 0 auto 1.25rem; }
    .login-title {
      text-align: center; font-size: 1.15rem; font-weight: 500;
      color: #555; margin-bottom: 2rem; letter-spacing: 0.01em;
    }
    .field { margin-bottom: 1.25rem; }
    .label { font-size: 0.85rem; font-weight: 600; color: #555; margin-bottom: 0.4rem; }
    .field select,
    .field .input {
      width: 100%; box-sizing: border-box;
      padding: 0.6em 0.85em;
      border: 1.5px solid #dbdbdb; border-radius: 6px;
      font-size: 0.97rem; color: #363636;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: auto;
    }
    .field select:focus,
    .field .input:focus {
      border-color: #00d1b2; outline: none;
      box-shadow: 0 0 0 3px rgba(0,209,178,0.15);
    }
    .btn-login {
      width: 100%; padding: 0.7em;
      background: #00d1b2; border: none; border-radius: 6px;
      color: #fff; font-size: 1rem; font-weight: 600;
      cursor: pointer; transition: background 0.15s;
      margin-top: 0.5rem;
    }
    .btn-login:hover:not(:disabled) { background: #00c4a7; }
    .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-login.is-loading { position: relative; color: transparent; pointer-events: none; }
    .btn-login.is-loading::after {
      content: ''; position: absolute;
      top: 50%; left: 50%; width: 1em; height: 1em;
      margin: -0.5em 0 0 -0.5em;
      border: 2px solid #fff; border-top-color: transparent;
      border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .divider { border: none; border-top: 1px solid #f0f0f0; margin: 1.5rem 0 1.25rem; }

    /* Info icon */
    .info-btn {
      background: none; border: none; cursor: pointer; padding: 0;
      color: #3e8ed0; vertical-align: middle; margin-left: 0.4rem;
      font-size: 0.95rem; line-height: 1;
    }
    .info-btn:hover { color: #1a6fb3; }

    /* Info modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal-box {
      background: #fff; border-radius: 10px; max-width: 520px; width: 90%;
      box-shadow: 0 12px 40px rgba(0,0,0,0.18); overflow: hidden;
    }
    .modal-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid #f0f0f0;
      font-weight: 600; font-size: 1rem;
    }
    .modal-close-btn {
      background: none; border: none; font-size: 1.3rem; cursor: pointer;
      color: #aaa; line-height: 1; padding: 0;
    }
    .modal-close-btn:hover { color: #363636; }
    .modal-body { padding: 1.25rem 1.5rem 1.5rem; font-size: 0.93rem; line-height: 1.6; color: #444; }
    .modal-body strong { color: #363636; }
    .modal-path {
      background: #f5f5f5; border-radius: 6px; padding: 0.6rem 0.9rem;
      margin: 0.75rem 0; font-size: 0.88rem; color: #363636;
    }
  `]

  constructor() {
    super()
    this._users = []
    this._error = ''
    this._loading = false
    this._showInfo = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadUsers()
  }

  async _loadUsers() {
    try {
      const result = await getUsers()
      if (result.success && result.data) {
        this._users = result.data
      }
    } catch (e) {
      console.error('Error loading users:', e)
      this._error = 'Eroare la încărcarea utilizatorilor'
    }
  }

  async _handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    const userId = form.userId.value
    const password = form.password.value

    if (!userId) {
      this._error = 'Selectați un utilizator S1'
      return
    }

    this._loading = true
    this._error = ''

    try {
      const result = await login(userId, password)
      if (result.success) {
        sessionStorage.setItem('s1User', JSON.stringify(result.user))
        this.dispatchEvent(new CustomEvent('login-success', {
          detail: result.user,
          bubbles: true,
          composed: true,
        }))
      } else {
        this._error = result.message || 'Credențiale invalide'
      }
    } catch (err) {
      this._error = 'Eroare la autentificare'
      console.error('Auth error:', err)
    } finally {
      this._loading = false
    }
  }

  render() {
    return html`
      <div class="card login-card">
        <div class="card-content">
          <img class="logo"
            src="https://www.petfactory.ro/wp-content/uploads/2022/06/sigla-pet-factory.ro_.png"
            alt="Pet Factory" />
          <p class="login-title">Pet Factory's software hub</p>
          <hr class="divider" />

          <form @submit=${this._handleSubmit}>
            <div class="field">
              <label class="label">
                Utilizator
                <button type="button" class="info-btn"
                        title="Cum adaug/șterg utilizatori?"
                        @click=${() => this._showInfo = true}>&#9432;</button>
              </label>
              <select name="userId" required>
                <option value="">
                  ${this._users.length ? 'Selectați utilizatorul S1' : 'Se încarcă...'}
                </option>
                ${this._users.map(u => html`
                  <option value=${u.userId}>${u.name}</option>
                `)}
              </select>
            </div>

            <div class="field">
              <label class="label">Parolă</label>
              <input class="input" type="password" name="password"
                     autocomplete="current-password"
                     placeholder="Introduceți parola S1" required />
            </div>

            ${this._error ? html`
              <div class="notification is-danger" style="margin-bottom:1rem;">${this._error}</div>
            ` : ''}

            <button type="submit"
              class="btn-login ${this._loading ? 'is-loading' : ''}"
              ?disabled=${this._loading}>
              Login
            </button>
          </form>
        </div>
      </div>

      ${this._showInfo ? html`
        <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this._showInfo = false }}>
          <div class="modal-box">
            <div class="modal-head">
              <span>Gestiune utilizatori — Ghid S1</span>
              <button class="modal-close-btn" @click=${() => this._showInfo = false}>&times;</button>
            </div>
            <div class="modal-body">
              <p>Pentru a adăuga, șterge sau consulta utilizatorii disponibili, accesați în ERP Soft1:</p>
              <div class="modal-path">
                <strong>Web &amp; Mobile → Conturi web → websitepetfactory → tab Relații</strong>
              </div>
              <p>Utilizatorii cu serviciul web <strong>WebSiteService</strong> sunt cei care pot accesa platforma.</p>
              <figure style="margin-top:1rem; border-radius:6px; overflow:hidden; border:1px solid #e8e8e8;">
                <img src="/images/s1_web_accounts_guide.png"
                     alt="Ghid gestiune utilizatori S1"
                     style="width:100%; display:block;" />
              </figure>
            </div>
          </div>
        </div>
      ` : ''}
    `
  }
}

customElements.define('login-form', LoginForm)
