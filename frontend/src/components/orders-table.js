import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import {
  downloadAndStoreOrders, getOrdersPaged,
  lookupFindoc, sendStoredOrder, client,
} from '@/services/api.js'
import './xml-viewer.js'
import './batch-progress.js'

function isDuplicateGuardMessage(message) {
  return /^Duplicate NUM04 guard:/i.test(String(message || ''))
}

// Structured mapping errors (MTRL/TRDBRANCH not found in SoftOne) are remediable by fixing
// the mapping data in the ERP, then retrying the send. Any other error (technical/platform:
// JSON, FTP, routing, other exceptions) is not fixable from this UI.
function isRemediatedMappingError(message) {
  return /\[(MTRL_NOTFOUND|TRDBRANCH_NOTFOUND)\]/.test(String(message || ''))
}

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
    this._showSent = false
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
      const res = await getOrdersPaged(this.trdr, {
        page: this._page,
        pageSize: this._pageSize,
        includeSent: this._showSent,
      })
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
      status: this._normalizeStatus(o),
      error: o.XMLERROR || null,
      xmlStatus: o.XMLSTATUS || '',
      fincode: null,
      trndate: null,
      _raw: o,
    }
  }

  _normalizeStatus(o) {
    if (o.FINDOC && o.FINDOC !== 0) return 'sent'
    if (o.XMLSTATUS === 'MANUAL') return 'manual'
    if (o.XMLSTATUS === 'ERROR') return 'error'
    return 'pending'
  }

  _visibleError(order) {
    if (order.status === 'sent' && isDuplicateGuardMessage(order.error)) return null
    return order.error
  }

  _isMappingError(order) {
    return isRemediatedMappingError(order.error)
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
        const errMsg = response.errors?.map((e, i) => `${i + 1}. ${this._formatSendError(e)}`).join('\n')
          || response.message || 'Unknown error'
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
      orderId: order.orderId,
      manual: order.status === 'manual'
    })
  }

  _formatSendError(e) {
    if (e?.type === 'MTRL_NOTFOUND' || e?.type === 'TRDBRANCH_NOTFOUND') {
      const desc = e.xmlDescription ? ` (${e.xmlDescription})` : ''
      return `[${e.type}] cod retailer "${e.xmlValue}"${desc} nu este mapat la ${e.field} — ${e.remedyLocation}`
    }
    return e?.message || String(e)
  }

  _sendButtonLabel(order, index) {
    if (this._sending.has(index)) return 'Sending...'
    if (order.status === 'manual') return 'Send manual'
    if (order.status === 'error') return 'Retrimite'
    return 'Send'
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

  async _toggleShowSent(e) {
    this._showSent = e.target.checked
    this._page = 1
    await this.loadOrders()
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
      sent: html`<span class="badge badge-ok">Sent</span>`,
      pending: html`<span class="badge badge-pending">Pending</span>`,
      manual: html`<span class="badge text-bg-warning">Manual</span>`,
      sending: html`<span class="badge badge-sending">Sending...</span>`,
      error: html`<span class="badge badge-error">Error</span>`,
    }
    return map[order.status] || ''
  }

  get _filteredOrders() {
    return this._orders
  }

  get _pendingCount() {
    return this._orders.filter(o => o.status === 'pending').length
  }

  render() {
    const showSentLabel = 'Arată trimise'
    const showSentId = `show-sent-switch-${this.trdr || 'default'}`

    return html`
      <div class="toolbar">
        <button class="btn btn-primary btn-sm ${this._loading ? 'btn-loading' : ''}"
                @click=${this._downloadOrders} ?disabled=${this._loading}>
          Preluare comenzi
        </button>
        <button class="btn btn-info btn-sm" @click=${this.loadOrders} ?disabled=${this._loading}>
          Refresh
        </button>
        ${this._pendingCount > 0 ? html`
          <button class="btn btn-success btn-sm" @click=${this._sendAllPending}>
            Trimite toate (${this._pendingCount})
          </button>
        ` : ''}
        <div class="form-check form-switch form-check-reverse ms-auto mb-0">
          <input
            id="${showSentId}"
            class="form-check-input"
            type="checkbox"
            role="switch"
            .checked=${this._showSent}
            aria-checked=${this._showSent ? 'true' : 'false'}
            @change=${this._toggleShowSent}
          />
          <label class="form-check-label small" for="${showSentId}">${showSentLabel}</label>
        </div>
      </div>

      <batch-progress></batch-progress>

      ${this._loading && !this._orders.length ? html`
        <div class="text-center mt-3" style="font-size:1.2rem; color:var(--tblr-primary);">
          Loading orders...
        </div>
      ` : ''}

      ${this._filteredOrders.length ? html`
        <div class="table-wrap">
          <table class="table table-hover table-vcenter">
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
                const visibleError = this._visibleError(order)
                return html`
                <tr>
                  <td>${new Date(order.date).toLocaleString()}</td>
                  <td>
                    ${order.filename}
                    ${order.orderId ? html`<br><span class="badge text-bg-secondary">${order.orderId}</span>` : ''}
                  </td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-info" @click=${() => this._saveXml(order)}>Save</button>
                      <button class="btn btn-sm btn-primary" @click=${() => this._copyXml(order)}>Copy</button>
                      ${order.status === 'pending' || order.status === 'manual' || (order.status === 'error' && this._isMappingError(order)) ? html`
                        <button class="btn btn-sm btn-success"
                                ?disabled=${this._sending.has(realIndex)}
                                @click=${() => this._sendOrder(order, realIndex)}>
                          ${this._sendButtonLabel(order, realIndex)}
                        </button>
                      ` : ''}
                      ${order.status === 'pending' || order.status === 'manual' || order.status === 'error' ? html`
                        <button class="btn btn-sm btn-danger" @click=${() => this._deleteOrder(order, realIndex)}>Delete</button>
                      ` : ''}
                      ${order.status === 'sent' && !order.fincode ? html`
                        <button class="btn btn-sm" @click=${() => this._lookupFindoc(order, realIndex)}>Lookup</button>
                      ` : ''}
                    </div>
                    ${visibleError ? html`
                      <div class="error-box ${this._isMappingError(order) ? 'error-box-mapping' : 'error-box-technical'}"
                           title=${this._isMappingError(order)
                             ? 'Eroare de mapare — corectați maparea în ERP, apoi apăsați Retrimite'
                             : 'Eroare tehnică — necesită investigare, nu poate fi corectată din această interfață'}>
                        ${visibleError}
                      </div>
                    ` : ''}
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
        ${!this._loading ? html`<div class="text-center text-secondary mt-3">No orders found</div>` : ''}
      `}

      <div class="d-flex justify-content-between align-items-center mt-3" style="font-size:0.85rem;">
        <span class="text-secondary">${this._total} rezultate — pagina ${this._page}/${this._totalPages}</span>
        <div class="btn-list">
          <button class="btn btn-sm" ?disabled=${this._page <= 1} @click=${this._prevPage}>&larr; Prev</button>
          <button class="btn btn-sm" ?disabled=${this._page >= this._totalPages} @click=${this._nextPage}>Next &rarr;</button>
        </div>
      </div>
    `
  }
}

customElements.define('orders-table', OrdersTable)
