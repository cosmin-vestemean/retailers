import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import {
  getOrders, getOrdersDirect, downloadAndStoreOrders,
  getDataset, getDataset1, sendOrderToS1, getToken, client,
} from '@/services/api.js'
import './xml-viewer.js'
import './batch-progress.js'

function getValFromXML(xml, node) {
  const dom = new DOMParser().parseFromString(xml, 'text/xml')
  const iterator = dom.evaluate(node, dom.documentElement, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
  const results = []
  let n = iterator.iterateNext()
  while (n) { results.push(n.textContent); n = iterator.iterateNext() }
  return results
}

export class OrdersTable extends LitElement {
  static properties = {
    trdr:       { type: String },
    dataSource: { type: String },
    _orders:    { state: true },
    _loading:   { state: true },
    _sending:   { state: true },
    _showSent:  { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .toolbar { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border: 1px solid #dbdbdb; padding: 0.5em 0.75em; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; text-align: left; position: sticky; top: 0; }
    tr:hover { background: #fafafa; }
    tr.sent { opacity: 0.6; }
    .badge { display: inline-block; padding: 0.15em 0.5em; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge.ok { background: #48c78e; color: #fff; }
    .badge.pending { background: #ffe08a; color: rgba(0,0,0,.7); }
    .badge.error { background: #f14668; color: #fff; }
    .badge.sending { background: #3e8ed0; color: #fff; }
    .actions { display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .error-box { background: #feecf0; border-radius: 4px; padding: 0.5em; margin-top: 0.5em; font-size: 0.8rem; color: #cc0f35; max-height: 150px; overflow: auto; }
    .details-box { font-size: 0.8rem; margin-top: 0.3em; color: #666; }
    .hidden { display: none; }
  `]

  constructor() {
    super()
    this._orders = []
    this._loading = false
    this._sending = new Set()
    this._showSent = true
  }

  connectedCallback() {
    super.connectedCallback()
    this.loadOrders()
  }

  async loadOrders() {
    this._loading = true
    try {
      if (this.dataSource === 'direct') {
        const res = await getOrdersDirect(this.trdr)
        this._orders = (res.data || []).map(o => this._normalizeDirectOrder(o))
      } else {
        try {
          const res = await getOrders(this.trdr)
          if (res?.success && res.rows) {
            this._orders = res.rows.map(o => this._normalizeS1Order(o))
          } else {
            throw new Error('S1 API returned no data')
          }
        } catch {
          // Fallback to direct
          const res = await getOrdersDirect(this.trdr)
          this._orders = (res.data || []).map(o => this._normalizeDirectOrder(o))
          this._toast('Orders loaded via Direct DB fallback', 'is-warning')
        }
      }
    } catch (e) {
      this._toast('Failed to load orders: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  _normalizeDirectOrder(o) {
    return {
      id: o.CCCSFTPXML,
      date: o.XMLDATE,
      filename: o.XMLFILENAME || '',
      xmlData: o.XMLDATA || '',
      findoc: o.FINDOC || null,
      orderId: o.XMLDATA ? (getValFromXML(o.XMLDATA, '/Order/ID')[0] || '') : '',
      status: o.FINDOC ? 'sent' : 'pending',
      error: null,
      fincode: null,
      trndate: null,
      _raw: o,
    }
  }

  _normalizeS1Order(o) {
    return {
      id: o.CCCSFTPXML || o.cccsftpxml,
      date: o.XMLDATE || o.xmldate,
      filename: o.XMLFILENAME || o.xmlfilename || '',
      xmlData: o.XMLDATA || o.xmldata || '',
      findoc: o.FINDOC || o.findoc || null,
      orderId: (o.XMLDATA || o.xmldata) ? (getValFromXML(o.XMLDATA || o.xmldata, '/Order/ID')[0] || '') : '',
      status: (o.FINDOC || o.findoc) ? 'sent' : 'pending',
      error: null,
      fincode: o.FINCODE || o.fincode || null,
      trndate: o.TRNDATE || o.trndate || null,
      _raw: o,
    }
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
    // Get retailer client config
    const configRes = await client.service('CCCRETAILERSCLIENTS').find({ query: { TRDR_CLIENT: 1 } })
    const token = await getToken()

    // Get document mappings  
    const mapRes = await client.service('CCCDOCUMENTES1MAPPINGS').find({
      query: { SOSOURCE: 1351, FPRMS: 701, SERIES: 7012, TRDR_RETAILER: parseInt(this.trdr) }
    })
    const mappingId = mapRes.data[0].CCCDOCUMENTES1MAPPINGS

    // Get field mappings
    const fieldsRes = await client.service('CCCXMLS1MAPPINGS').find({
      query: { CCCDOCUMENTES1MAPPINGS: mappingId }
    })
    const mappings = fieldsRes.data

    // Build JSON order
    const jsonOrder = {
      service: 'setData', clientID: token, appId: 1001,
      OBJECT: 'SALDOC', FORM: 'EFIntegrareRetailers',
    }

    // Group by S1TABLE1
    const tables = {}
    mappings.forEach(m => { if (!tables[m.S1TABLE1]) tables[m.S1TABLE1] = [] })

    const errors = []
    for (const m of mappings) {
      const xmlVals = getValFromXML(order.xmlData, m.XMLNODE)
      for (const xmlVal of xmlVals) {
        let val = xmlVal
        if (m.SQL) {
          const sqlQuery = m.SQL.replace('{value}', xmlVal)
          const res = await getDataset(sqlQuery)
          if (res.data) { val = res.data }
          else { errors.push({ key: m.S1FIELD1, value: xmlVal, sql: m.SQL }); continue }
        }
        tables[m.S1TABLE1].push({ [m.S1FIELD1]: val })
      }
    }

    if (errors.length) return { success: false, errors }

    // Restructure ITELINES — merge field arrays into row objects
    if (tables.ITELINES) {
      const fieldNames = [...new Set(tables.ITELINES.map(o => Object.keys(o)[0]))]
      const arrays = {}
      fieldNames.forEach(f => arrays[f] = [])
      tables.ITELINES.forEach(o => { for (const k in o) arrays[k].push(o[k]) })
      tables.ITELINES = []
      for (let i = 0; i < arrays[fieldNames[0]].length; i++) {
        const row = {}
        fieldNames.forEach(f => row[f] = arrays[f][i])
        tables.ITELINES.push(row)
      }
    }

    // Merge non-ITELINES tables into single objects
    for (const t in tables) {
      if (t !== 'ITELINES') {
        const merged = {}
        tables[t].forEach(o => { for (const k in o) merged[k] = o[k] })
        tables[t] = [merged]
      }
    }

    // Add series and retailer
    if (tables.SALDOC?.[0]) {
      tables.SALDOC[0].SERIES = 7012
      tables.SALDOC[0].TRDR = parseInt(this.trdr)
    }

    jsonOrder.DATA = tables

    // Send to S1
    const setRes = await client.service('setDocument').create(jsonOrder)
    if (setRes.success) {
      // Update CCCSFTPXML with FINDOC
      await client.service('CCCSFTPXML').patch(
        null,
        { FINDOC: parseInt(setRes.id) },
        { query: { XMLFILENAME: order.filename, TRDR_RETAILER: parseInt(this.trdr) } }
      )
      return { success: true, id: setRes.id, message: `Order sent, FINDOC: ${setRes.id}` }
    }
    return { success: false, message: setRes.error || 'S1 setDocument failed' }
  }

  async _sendAllPending() {
    const pendingIndices = this._orders
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => o.status === 'pending')
      .map(({ i }) => i)

    if (!pendingIndices.length) return
    const bp = this.shadowRoot.querySelector('batch-progress')
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
    const sql = `SELECT a.FINDOC, a.FINCODE, FORMAT(a.TRNDATE, 'dd.MM.yyyy') TRNDATE FROM findoc a INNER JOIN salfprms b ON a.fprms=b.fprms WHERE a.sosource=1351 AND a.trdr=${parseInt(this.trdr)} AND a.num04='${order.orderId}' AND a.TRNDATE > DATEADD(day, -30, GETDATE()) AND b.tfprms=201`
    const res = await getDataset1(sql)
    if (res.success && res.data?.length) {
      const d = res.data[0]
      this._orders[index].fincode = d.FINCODE
      this._orders[index].trndate = d.TRNDATE
      this._orders[index].findoc = d.FINDOC
      this._orders[index].status = 'sent'
      // Also patch CCCSFTPXML
      await client.service('CCCSFTPXML').patch(
        null,
        { FINDOC: parseInt(d.FINDOC) },
        { query: { XMLFILENAME: order.filename, TRDR_RETAILER: parseInt(this.trdr) } }
      )
      this.requestUpdate()
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
        <button class="button is-primary ${this._loading ? 'is-loading' : ''}"
                @click=${this._downloadOrders} ?disabled=${this._loading}>
          Preluare comenzi
        </button>
        <button class="button is-info" @click=${this.loadOrders} ?disabled=${this._loading}>
          Refresh
        </button>
        ${this._pendingCount > 0 ? html`
          <button class="button is-success" @click=${this._sendAllPending}>
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
    `
  }
}

customElements.define('orders-table', OrdersTable)
