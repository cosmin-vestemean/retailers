import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import {
  downloadAndStoreOrders, getOrdersPaged,
  lookupFindoc, sendStoredOrder, client,
} from '@/services/api.js'
import './xml-viewer.js'
import './batch-progress.js'

export class OrdersTable extends LightElement {
  static properties = {
    trdr:       { type: String },
    _orders:    { state: true },
    _loading:   { state: true },
    _sending:   { state: true },
    _showSent:  { state: true },
    _page:      { state: true },
    _pageSize:  { state: true },
    _total:     { state: true },
  }

  constructor() {
    super()
    this._orders = []
    this._loading = false
    this._sending = new Set()
    this._showSent = true
    this._page = 1
    this._pageSize = 25
    this._total = 0
  }

  connectedCallback() {
    super.connectedCallback()
    this.loadOrders()
  }

  updated(changedProps) {
    if (changedProps.has('trdr') && this.trdr) {
      this._page = 1
      this.loadOrders()
    }
  }

  async loadOrders() {
    this._loading = true
    try {
      const res = await getOrdersPaged(this.trdr, { page: this._page, pageSize: this._pageSize })
      if (res?.success) {
        this._orders = (res.data || []).map(o => this._normalizeOrder(o))
        this._total = res.total || 0
      } else {
        this._toast('Failed to load orders: ' + (res?.error || 'Unknown error'), 'is-danger')
      }
    } catch (e) {
      this._toast('Failed to load orders: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  _normalizeOrder(o) {
    return {
      id: o.CCCSFTPXML,
      date: o.XMLDATE,
      filename: o.XMLFILENAME || '',
      xmlData: o.XMLDATA || '',
      findoc: o.FINDOC || null,
      orderId: o.OrderId || '',
      status: (o.FINDOC && o.FINDOC !== 0) ? 'sent' : 'pending',
      error: null,
      fincode: null,
      trndate: null,
      _raw: o,
    }
  }

  get _totalPages() { return Math.max(1, Math.ceil(this._total / this._pageSize)) }

  async _prevPage() {
    if (this._page > 1) { this._page--; await this.loadOrders() }
  }

  async _nextPage() {
    if (this._page < this._totalPages) { this._page++; await this.loadOrders() }
  }

  async _downloadOrders() {
    this._loading = true
    try {
      await downloadAndStoreOrders(this.trdr)
      await this.loadOrders()
      this._toast('Orders downloaded and stored', 'is-success')
    } catch (e) {
      this._toast('Download failed: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  async _sendOrder(order, index) {
    if (order.findoc) return
    this._sending = new Set([...this._sending, index])
    this._updateOrderStatus(index, 'sending')
    try {
      const response = await this._createAndSendOrderJSON(order)
      if (response.success) {
        this._updateOrderStatus(index, 'sent', null, response.message)
        this._orders[index].findoc = response.id
        this.requestUpdate()
      } else {
        const errMsg = response.errors?.map((e, i) =>
          `${i + 1}. "${e.key}" = "${e.value}" — SQL: ${e.sql}`
        ).join('\n') || response.message || 'Unknown error'
        this._updateOrderStatus(index, 'error', errMsg)
      }
    } catch (e) {
      this._updateOrderStatus(index, 'error', e.message)
    } finally {
      this._sending = new Set([...this._sending].filter(i => i !== index))
    }
  }

  async _createAndSendOrderJSON(order) {
    return sendStoredOrder({
      trdr: parseInt(this.trdr),
      CCCSFTPXML: order.id,
      xmlData: order.xmlData,
      filename: order.filename,
      orderId: order.orderId
    })
  }

  async _sendAllPending() {
    const pendingIndices = this._orders
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.status === 'pending')
      .map(({ i }) => i)

    if (!pendingIndices.length) return
    const bp = this.querySelector('batch-progress')
    bp.start(pendingIndices.length)

    for (const i of pendingIndices) {
      const order = this._orders[i]
      bp.advance(`Sending ${order.orderId || order.filename}...`)
      await this._sendOrder(order, i)
    }
    bp.finish('All pending orders processed')
    await this.loadOrders()
  }

  async _deleteOrder(order, index) {
    try {
      await client.service('CCCSFTPXML').remove(order.id)
      this._orders = this._orders.filter((_, i) => i !== index)
      this._toast('Order deleted', 'is-info')
    } catch (e) {
      this._toast('Delete failed: ' + e.message, 'is-danger')
    }
  }

  async _lookupFindoc(order, index) {
    if (!order.orderId) return
    try {
      const res = await lookupFindoc(this.trdr, order.orderId, order.filename)
      if (res?.success) {
        this._orders[index].fincode = res.fincode
        this._orders[index].trndate = res.trndate
        this._orders[index].findoc = res.findoc
        this._orders[index].status = 'sent'
        this.requestUpdate()
        this._toast('Document găsit: ' + res.fincode, 'is-success')
      } else {
        this._toast('Lookup: ' + (res?.error || 'Document negăsit'), 'is-warning')
      }
    } catch (e) {
      this._toast('Lookup failed: ' + e.message, 'is-danger')
    }
  }

  _updateOrderStatus(index, status, error = null, message = null) {
    this._orders[index].status = status
    this._orders[index].error = error
    this.requestUpdate()
  }

  _saveXml(order) {
    const blob = new Blob([order.xmlData], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = order.filename; a.click()
    URL.revokeObjectURL(url)
  }

  _copyXml(order) {
    navigator.clipboard.writeText(order.xmlData)
    this._toast('XML copied to clipboard', 'is-info')
  }

  _toast(msg, type) {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: msg, type }, bubbles: true, composed: true,
    }))
  }

  _statusBadge(order) {
    const map = {
      sent: html`<span class="badge ok">Sent</span>`,
      pending: html`<span class="badge pending">Pending</span>`,
      sending: html`<span class="badge sending">Sending...</span>`,
      error: html`<span class="badge error">Error</span>`,
    }
    return map[order.status] || ''
  }

  get _filteredOrders() {
    if (this._showSent) return this._orders
    return this._orders.filter(o => o.status !== 'sent')
  }

  get _pendingCount() {
    return this._orders.filter(o => o.status === 'pending').length
  }

  render() {
    return html`
      <div class="toolbar">
        <button class="button is-primary is-small ${this._loading ? 'is-loading' : ''}"
                @click=${this._downloadOrders} ?disabled=${this._loading}>
          Preluare comenzi
        </button>
        <button class="button is-info is-small" @click=${this.loadOrders} ?disabled=${this._loading}>
          Refresh
        </button>
        ${this._pendingCount > 0 ? html`
          <button class="button is-success is-small" @click=${this._sendAllPending}>
            Trimite toate (${this._pendingCount})
          </button>
        ` : ''}
        <label style="font-size:0.85rem; margin-left:auto;">
          <input type="checkbox" .checked=${this._showSent}
                 @change=${(e) => this._showSent = e.target.checked} />
          Arată trimise
        </label>
      </div>

      <batch-progress></batch-progress>

      ${this._loading && !this._orders.length ? html`
        <div class="has-text-centered mt-4" style="font-size:1.2rem; color:#3e8ed0;">
          Loading orders...
        </div>
      ` : ''}

      ${this._filteredOrders.length ? html`
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Filename / Order ID</th>
                <th>Actions</th>
                <th>Status</th>
                <th>FINDOC</th>
              </tr>
            </thead>
            <tbody>
              ${this._filteredOrders.map((order, i) => {
                const realIndex = this._orders.indexOf(order)
                return html`
                <tr class=${order.status === 'sent' ? 'sent' : ''}>
                  <td>${new Date(order.date).toLocaleString()}</td>
                  <td>
                    ${order.filename}
                    ${order.orderId ? html`<br><span class="badge" style="background:#3e8ed0;color:#fff;">${order.orderId}</span>` : ''}
                  </td>
                  <td>
                    <div class="actions">
                      <button class="button is-small is-info" @click=${() => this._saveXml(order)}>Save</button>
                      <button class="button is-small is-primary" @click=${() => this._copyXml(order)}>Copy</button>
                      ${order.status === 'pending' ? html`
                        <button class="button is-small is-success"
                                ?disabled=${this._sending.has(realIndex)}
                                @click=${() => this._sendOrder(order, realIndex)}>
                          ${this._sending.has(realIndex) ? 'Sending...' : 'Send'}
                        </button>
                        <button class="button is-small is-danger" @click=${() => this._deleteOrder(order, realIndex)}>Delete</button>
                      ` : ''}
                      ${order.status === 'sent' && !order.fincode ? html`
                        <button class="button is-small" @click=${() => this._lookupFindoc(order, realIndex)}>Lookup</button>
                      ` : ''}
                    </div>
                    ${order.error ? html`<div class="error-box">${order.error}</div>` : ''}
                    ${order.xmlData ? html`<xml-viewer .content=${order.xmlData}></xml-viewer>` : ''}
                  </td>
                  <td>${this._statusBadge(order)}</td>
                  <td>
                    ${order.findoc ? html`
                      <strong>${order.findoc}</strong>
                      ${order.fincode ? html`<div class="details-box">${order.fincode}<br>${order.trndate}</div>` : ''}
                    ` : ''}
                  </td>
                </tr>
              `})}
            </tbody>
          </table>
        </div>
      ` : html`
        ${!this._loading ? html`<div class="has-text-centered mt-4" style="color:#999;">No orders found</div>` : ''}
      `}

      <div class="is-flex is-justify-content-space-between is-align-items-center mt-3" style="font-size:0.85rem;">
        <span class="has-text-grey">${this._total} rezultate — pagina ${this._page}/${this._totalPages}</span>
        <div class="buttons are-small">
          <button class="button is-small" ?disabled=${this._page <= 1} @click=${this._prevPage}>&larr; Prev</button>
          <button class="button is-small" ?disabled=${this._page >= this._totalPages} @click=${this._nextPage}>Next &rarr;</button>
        </div>
      </div>
    `
  }
}

customElements.define('orders-table', OrdersTable)
