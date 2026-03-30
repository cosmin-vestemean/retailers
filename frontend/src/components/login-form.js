import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { getUsers, login } from '@/services/api.js'

export class LoginForm extends LitElement {
  static properties = {
    _users: { state: true },
    _error: { state: true },
    _loading: { state: true },
  }

  static styles = [sharedStyles, css`
    :host {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 52px); background: #f5f5f5;
    }
    .login-card { max-width: 400px; width: 100%; }
    .logo { display: block; max-height: 80px; margin: 0 auto 1rem; }
    .title { text-align: center; font-size: 1.3rem; margin-bottom: 1.5rem; }
    .field { margin-bottom: 1rem; }
    select { width: 100%; padding: 0.5em 0.75em; border: 1px solid #dbdbdb; border-radius: 4px; font-size: 1rem; }
    select:focus { border-color: #3e8ed0; outline: none; }
  `]

  constructor() {
    super()
    this._users = []
    this._error = ''
    this._loading = false
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
          <div class="title">Pet Factory's software hub</div>

          <form @submit=${this._handleSubmit}>
            <div class="field">
              <label class="label">Utilizator</label>
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
              <label class="label">Parola</label>
              <input class="input" type="password" name="password"
                     placeholder="Introduceți parola S1" required />
            </div>

            ${this._error ? html`
              <div class="notification is-danger">${this._error}</div>
            ` : ''}

            <div class="field mt-4">
              <button type="submit"
                class="button is-primary ${this._loading ? 'is-loading' : ''}"
                style="width:100%"
                ?disabled=${this._loading}>
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }
}

customElements.define('login-form', LoginForm)
