import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { getSftpConfig, updateSftpConfig, getRetailerClients } from '@/services/api.js'

export class ConnectionSettings extends LitElement {
  static properties = {
    trdr: { type: String },
    _sftp: { state: true },
    _erp:  { state: true },
    _loading: { state: true },
    _saving:  { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.5rem;
    }
    .form-grid.single { grid-template-columns: 1fr; }
    .field-label { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; color: #363636; }
    .erp-section {
      background: #eff5fb; border-radius: 6px; padding: 1rem; margin-top: 1.5rem;
    }
    .erp-section h3 { color: #3e8ed0; margin-bottom: 0.75rem; }
    h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; }
  `]

  constructor() {
    super()
    this._sftp = {}
    this._erp = {}
    this._loading = true
    this._saving = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadData()
  }

  async _loadData() {
    this._loading = true
    try {
      const [sftpRes, erpRes] = await Promise.all([
        getSftpConfig(this.trdr),
        getRetailerClients({ TRDR_CLIENT: 1 }),
      ])
      this._sftp = sftpRes.data?.[0] || {}
      this._erp = erpRes.data?.[0] || {}
    } catch (e) {
      this._toast('Failed to load config: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  _updateField(section, field, value) {
    if (section === 'sftp') {
      this._sftp = { ...this._sftp, [field]: value }
    } else {
      this._erp = { ...this._erp, [field]: value }
    }
  }

  async _save() {
    this._saving = true
    try {
      await updateSftpConfig(this.trdr, {
        URL: this._sftp.URL || '',
        PORT: this._sftp.PORT || '',
        USERNAME: this._sftp.USERNAME || '',
        PASSPHRASE: this._sftp.PASSPHRASE || '',
        FINGERPRINT: this._sftp.FINGERPRINT || '',
        INITIALDIRIN: this._sftp.INITIALDIRIN || '',
        INITIALDIROUT: this._sftp.INITIALDIROUT || '',
      })
      this._toast('Connection settings saved', 'is-success')
    } catch (e) {
      this._toast('Save failed: ' + e.message, 'is-danger')
    } finally {
      this._saving = false
    }
  }

  _toast(msg, type) {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: msg, type }, bubbles: true, composed: true,
    }))
  }

  _renderInput(label, section, field, opts = {}) {
    const val = (section === 'sftp' ? this._sftp : this._erp)[field] || ''
    return html`
      <div>
        <div class="field-label">${label}</div>
        <input class="input is-small" type="${opts.type || 'text'}"
               .value=${String(val)}
               ?readonly=${opts.readonly}
               placeholder=${label}
               @input=${(e) => this._updateField(section, field, e.target.value)} />
      </div>
    `
  }

  render() {
    if (this._loading) return html`<div style="padding:1rem; color:#3e8ed0;">Loading configuration...</div>`

    return html`
      <h2>SFTP / FTP Connection</h2>
      <div class="form-grid">
        ${this._renderInput('TRDR Retailer', 'sftp', 'TRDR_RETAILER', { readonly: true })}
        ${this._renderInput('URL', 'sftp', 'URL')}
        ${this._renderInput('Port', 'sftp', 'PORT')}
        ${this._renderInput('Username', 'sftp', 'USERNAME')}
        ${this._renderInput('Passphrase', 'sftp', 'PASSPHRASE', { type: 'password' })}
        ${this._renderInput('Fingerprint', 'sftp', 'FINGERPRINT')}
        ${this._renderInput('Initial Dir IN', 'sftp', 'INITIALDIRIN')}
        ${this._renderInput('Initial Dir OUT', 'sftp', 'INITIALDIROUT')}
      </div>

      <div class="erp-section">
        <h3>ERP Connection (S1)</h3>
        <div class="form-grid">
          ${this._renderInput('WS URL', 'erp', 'WSURL')}
          ${this._renderInput('Company', 'erp', 'COMPANY')}
          ${this._renderInput('Branch', 'erp', 'BRANCH')}
          ${this._renderInput('User', 'erp', 'WSUSER')}
          ${this._renderInput('Password', 'erp', 'WSPASS', { type: 'password' })}
        </div>
      </div>

      <div style="margin-top:1rem;">
        <button class="button is-success ${this._saving ? 'is-loading' : ''}"
                @click=${this._save} ?disabled=${this._saving}>
          Save Connection Settings
        </button>
      </div>
    `
  }
}

customElements.define('connection-settings', ConnectionSettings)
