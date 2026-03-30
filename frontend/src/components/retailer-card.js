import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import { getDataset, getDataset1 } from '@/services/api.js'

export class RetailerCard extends LitElement {
  static properties = {
    trdr:  { type: String },
    name:  { type: String },
    logo:  { type: String },
    _pendingOrders:   { state: true },
    _pendingInvoices: { state: true },
    _invoiceList:     { state: true },
    _loading:         { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .card { height: 100%; display: flex; flex-direction: column; transition: transform 0.15s; }
    .card:hover { transform: translateY(-2px); }
    a { text-decoration: none; color: inherit; }

    .card-top { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem 0; }
    .card-top img { max-height: 48px; max-width: 120px; object-fit: contain; }
    .card-top .name { font-weight: 700; font-size: 1.1rem; }

    .stats { padding: 0.75rem 1.25rem 1rem; flex: 1; }
    .stats table { width: 100%; font-size: 0.9rem; border: none; }
    .stats td { border: none; padding: 0.3em 0; }
    .stats td:last-child { text-align: right; }

    .card-links {
      border-top: 1px solid #ededed; display: flex;
    }
    .card-links a {
      flex: 1; text-align: center; padding: 0.6rem 0.5rem;
      font-size: 0.85rem; color: #3e8ed0; font-weight: 600;
    }
    .card-links a:hover { background: #f5f5f5; }
    .card-links a + a { border-left: 1px solid #ededed; }

    .badge {
      display: inline-flex; align-items: center; padding: 0 0.6em;
      height: 1.7em; border-radius: 4px; font-size: 0.8rem; font-weight: 700;
      cursor: default;
    }
    .badge.ok      { background: #48c78e; color: #fff; }
    .badge.pending { background: #f14668; color: #fff; }
    .badge.loading { background: #dbdbdb; color: #7a7a7a; min-width: 2em; }

    .invoice-detail {
      font-size: 0.75rem; color: #666; margin-top: 0.2rem;
      max-height: 3.5em; overflow: auto;
    }
  `]

  constructor() {
    super()
    this._pendingOrders = null
    this._pendingInvoices = null
    this._invoiceList = ''
    this._loading = true
  }

  connectedCallback() {
    super.connectedCallback()
    this._fetchStats()
  }

  async _fetchStats() {
    this._loading = true
    try {
      await Promise.all([
        this._fetchOrders(),
        this._fetchInvoices(),
        this._fetchInvoiceList(),
      ])
    } finally {
      this._loading = false
    }
  }

  async _fetchOrders() {
    try {
      const sql = `SELECT COUNT(*) nrComenziDeTrimis FROM CCCSFTPXML WHERE TRDR_RETAILER = ${parseInt(this.trdr)} AND COALESCE(FINDOC, 0) = 0 AND XMLDATE > DATEADD(day, -30, GETDATE())`
      const res = await getDataset(sql)
      this._pendingOrders = res.data || 0
    } catch {
      this._pendingOrders = 0
    }
  }

  async _fetchInvoices() {
    try {
      const sql = `SELECT COUNT(*) nrFacturiDeTrimis FROM findoc f INNER JOIN mtrdoc m ON (f.findoc=m.findoc) WHERE f.sosource=1351 AND f.fprms=712 AND f.series=7121 AND f.trdr=${parseInt(this.trdr)} AND m.CCCXMLSendDate IS NULL AND f.iscancel=0 AND trndate > DATEADD(day, -30, GETDATE())`
      const res = await getDataset(sql)
      this._pendingInvoices = res.data || 0
    } catch {
      this._pendingInvoices = 0
    }
  }

  async _fetchInvoiceList() {
    try {
      const sql = `SELECT fincode, FORMAT(trndate, 'dd.MM.yyyy') trndate FROM findoc f INNER JOIN mtrdoc m ON (f.findoc=m.findoc) WHERE f.sosource=1351 AND f.fprms=712 AND f.series=7121 AND f.trdr=${parseInt(this.trdr)} AND m.CCCXMLSendDate IS NULL AND f.iscancel=0 AND trndate > DATEADD(day, -30, GETDATE())`
      const res = await getDataset1(sql)
      if (res.success && res.data) {
        this._invoiceList = res.data.map(i => `${i.fincode} ${i.trndate}`).join('; ')
      }
    } catch {
      this._invoiceList = ''
    }
  }

  _renderBadge(value) {
    if (value === null) return html`<span class="badge loading">...</span>`
    if (value > 0) return html`<span class="badge pending" title="Ultimele 30 zile">${value}</span>`
    return html`<span class="badge ok">${value}</span>`
  }

  _showInvoiceDetail() {
    if (this._invoiceList) {
      this.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: this._invoiceList, type: 'is-info' },
        bubbles: true, composed: true,
      }))
    }
  }

  render() {
    return html`
      <div class="card">
        <a href="/retailer/${this.trdr}">
          <div class="card-top">
            <img src="${this.logo}" alt="${this.name}" />
            <span class="name">${this.name}</span>
          </div>
          <div class="stats">
            <table>
              <tr>
                <td>Comenzi de trimis:</td>
                <td>${this._renderBadge(this._pendingOrders)}</td>
              </tr>
              <tr>
                <td>Facturi de trimis:</td>
                <td @click=${this._showInvoiceDetail}>
                  ${this._renderBadge(this._pendingInvoices)}
                </td>
              </tr>
            </table>
            ${this._invoiceList ? html`
              <div class="invoice-detail">${this._invoiceList}</div>
            ` : ''}
          </div>
        </a>
        <div class="card-links">
          <a href="/retailer/${this.trdr}">Detalii</a>
          <a href="/config/${this.trdr}">Configurează</a>
        </div>
      </div>
    `
  }
}

customElements.define('retailer-card', RetailerCard)
