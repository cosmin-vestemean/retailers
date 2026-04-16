import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { getUsers, login } from '@/services/api.js'

export class LoginForm extends LightElement {
  static properties = {
    _users:    { state: true },
    _error:    { state: true },
    _loading:  { state: true },
    _showInfo: { state: true },
  }

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
        <div class="card-body">
          <img class="logo"
            src="https://www.petfactory.ro/wp-content/uploads/2022/06/sigla-pet-factory.ro_.png"
            alt="Pet Factory" />
          <p class="login-title">Pet Factory's software hub</p>
          <hr class="divider" />

          <form @submit=${this._handleSubmit}>
            <div class="mb-3">
              <label class="form-label">
                Utilizator
                <button type="button" class="info-btn"
                        title="Cum adaug/șterg utilizatori?"
                        @click=${() => this._showInfo = true}>&#9432;</button>
              </label>
              <select name="userId" class="form-select" required>
                <option value="">
                  ${this._users.length ? 'Selectați utilizatorul S1' : 'Se încarcă...'}
                </option>
                ${this._users.map(u => html`
                  <option value=${u.userId}>${u.name}</option>
                `)}
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Parolă</label>
              <input class="form-control" type="password" name="password"
                     autocomplete="current-password"
                     placeholder="Introduceți parola S1" required />
            </div>

            ${this._error ? html`
              <div class="alert alert-danger mb-3">${this._error}</div>
            ` : ''}

            <button type="submit"
              class="btn btn-primary w-100 ${this._loading ? 'btn-loading' : ''}"
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
