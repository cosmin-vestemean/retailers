import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { getDataset, getDataset1 } from '@/services/api.js'

export class RetailerCard extends LightElement {
  static properties = {
    trdr:  { type: String },
    name:  { type: String },
    logo:  { type: String },
    _pendingOrders:   { state: true },
    _pendingInvoices: { state: true },
    _invoiceList:     { state: true },
    _loading:         { state: true },
  }

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
