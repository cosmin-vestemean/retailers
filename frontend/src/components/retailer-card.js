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
    :host { display: block; height: 100%; }
    .card {
      height: 100%; display: flex; flex-direction: column;
      background: #fff; border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      transition: box-shadow 0.15s;
    }
    .card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.13); }
    a { text-decoration: none; color: inherit; }

    .card-logo {
      display: flex; align-items: center; justify-content: center;
      padding: 1.75rem 1.5rem 1rem;
      min-height: 100px;
    }
    .card-logo img { max-height: 72px; max-width: 160px; object-fit: contain; }

    .card-name {
      text-align: center; font-weight: 700; font-size: 1.05rem;
      padding: 0 1.25rem 1rem;
    }

    .stats { padding: 0 1.25rem 1.25rem; flex: 1; }
    .stats table { width: 100%; font-size: 0.9rem; border: none; }
    .stats td { border: none; padding: 0.35em 0; }
    .stats td:last-child { text-align: right; }

    .card-links {
      border-top: 1px solid #ededed;
      display: flex; height: 44px; flex-shrink: 0;
    }
    .card-links a {
      flex: 1; display: flex; align-items: center; justify-content: center;
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
          <div class="card-logo">
            <img src="${this.logo}" alt="${this.name}" />
          </div>
          <div class="card-name">${this.name}</div>
          <div class="stats">
            <table>
              <tr>
                <td>Comenzi de trimis:</td>
                <td>${this._renderBadge(this._pendingOrders)}</td>
              </tr>
              <tr>
                <td>Facturi de trimis:</td>
                <td>${this._renderBadge(this._pendingInvoices)}</td>
              </tr>
            </table>
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
