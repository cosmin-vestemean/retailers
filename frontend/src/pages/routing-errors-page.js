import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import '@/components/xml-viewer.js'
import { getRoutingErrors, removeRoutingError, resolveRoutingError } from '@/services/api.js'

function parseRouting(row) {
  try {
    const parsed = JSON.parse(row.JSONDATA || '{}')
    return parsed.routing || {}
  } catch {
    return {}
  }
}

function value(text, fallback = '—') {
  const normalized = String(text || '').trim()
  return normalized || fallback
}

export class RoutingErrorsPage extends LightElement {
  static properties = {
    _rows: { state: true },
    _loading: { state: true },
    _workingId: { state: true },
    _error: { state: true },
    _expandedId: { state: true }
  }

  constructor() {
    super()
    this._rows = []
    this._loading = false
    this._workingId = 0
    this._error = ''
    this._expandedId = 0
  }

  connectedCallback() {
    super.connectedCallback()
    this._load()
  }

  async _load() {
    this._loading = true
    this._error = ''
    try {
      const result = await getRoutingErrors({ limit: 100 })
      this._rows = result.data || []
    } catch (error) {
      this._error = error.message
    } finally {
      this._loading = false
    }
  }

  async _resolve(row) {
    this._workingId = row.CCCSFTPXML
    this._error = ''
    try {
      const result = await resolveRoutingError(row.CCCSFTPXML)
      if (result?.success === false) {
        this._error = result.error || 'Rutarea nu a putut fi rezolvată'
      }
      await this._load()
    } catch (error) {
      this._error = error.message
    } finally {
      this._workingId = 0
    }
  }

  async _delete(row) {
    const filename = value(row.XMLFILENAME, 'acest XML')
    const routing = parseRouting(row)
    const orderId = value(routing.orderId, 'fără număr de comandă')
    if (!window.confirm(`Ștergerea este definitivă și elimină XML-ul din lista erorilor de rutare. Continui?`)) return
    if (!window.confirm(`Confirmi ștergerea XML-ului ${filename} pentru comanda ${orderId}?`)) return
    this._workingId = row.CCCSFTPXML
    this._error = ''
    try {
      await removeRoutingError(row.CCCSFTPXML)
      await this._load()
    } catch (error) {
      this._error = error.message
    } finally {
      this._workingId = 0
    }
  }

  async _copy(text) {
    const gln = String(text || '').trim()
    if (!gln) return
    try {
      await navigator.clipboard.writeText(gln)
    } catch {
      this._error = 'Nu am putut copia GLN-ul în clipboard'
    }
  }

  _renderItemsPreview(routing) {
    const items = routing.itemsPreview || []
    if (!items.length) return html`<span class="text-body-secondary">—</span>`
    return html`
      <div class="small">
        ${items.slice(0, 3).map((item) => html`
          <div class="text-nowrap">
            <span class="fw-semibold">${value(item.buyerItemId)}</span>
            <span class="text-body-secondary">${value(item.name, '')}</span>
            <span class="text-body-secondary">${value(item.quantity, '')}${item.unit ? ' ' + item.unit : ''}</span>
          </div>
        `)}
      </div>
    `
  }

  _renderRows() {
    if (this._loading) return html`<tr><td colspan="10" class="text-center py-4 text-body-secondary">Se încarcă…</td></tr>`
    if (!this._rows.length) return html`<tr><td colspan="10" class="text-center py-4 text-body-secondary">Nu există erori de rutare.</td></tr>`
    return this._rows.map((row) => {
      const routing = parseRouting(row)
      const deliveryGln = routing.routingGln || routing.delivery?.gln || routing.buyer?.gln
      const working = this._workingId === row.CCCSFTPXML
      const expanded = this._expandedId === row.CCCSFTPXML
      return html`
        <tr>
          <td class="text-nowrap">${value(row.XMLDATE)}</td>
          <td>
            <div class="fw-semibold">${value(routing.orderId)}</div>
            <div class="small text-body-secondary text-break">${value(row.XMLFILENAME)}</div>
          </td>
          <td>
            <div>${value(routing.buyer?.name)}</div>
            <button class="btn btn-link btn-sm p-0" @click=${() => this._copy(routing.buyer?.gln)}>${value(routing.buyer?.gln)}</button>
          </td>
          <td>
            <div>${value(routing.delivery?.name)}</div>
            <button class="btn btn-link btn-sm p-0" @click=${() => this._copy(deliveryGln)}>${value(deliveryGln)}</button>
          </td>
          <td>${value(routing.delivery?.city || routing.buyer?.city)}</td>
          <td class="text-nowrap">${value(routing.requestedDeliveryStart || routing.actualDeliveryDate)}</td>
          <td>${value(routing.totals?.lineCount)}</td>
          <td>${this._renderItemsPreview(routing)}</td>
          <td class="text-danger small">${value(row.XMLERROR)}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-primary me-1" ?disabled=${working} @click=${() => this._resolve(row)}>
              ${working ? 'Se verifică…' : 'Reprocesează'}
            </button>
            <button class="btn btn-sm btn-outline-secondary me-1" @click=${() => this._expandedId = expanded ? 0 : row.CCCSFTPXML}>
              XML
            </button>
            <button class="btn btn-sm btn-outline-danger" ?disabled=${working} @click=${() => this._delete(row)}>
              Șterge
            </button>
          </td>
        </tr>
        ${expanded ? html`
          <tr>
            <td colspan="10"><xml-viewer .content=${row.XMLDATA || ''}></xml-viewer></td>
          </tr>
        ` : null}
      `
    })
  }

  render() {
    return html`
      <div class="container-xl py-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h1 class="h3 mb-1">Erori rutare</h1>
            <div class="text-body-secondary">XML-uri DocProcess primite, dar fără retailer rezolvat după GLN.</div>
          </div>
          <button class="btn btn-outline-primary" ?disabled=${this._loading} @click=${this._load}>Refresh</button>
        </div>

        ${this._error ? html`<div class="alert alert-danger">${this._error}</div>` : null}

        <div class="table-responsive bg-white border rounded">
          <table class="table table-vcenter table-hover mb-0">
            <thead>
              <tr>
                <th>Data</th>
                <th>Comandă</th>
                <th>Buyer</th>
                <th>Livrare</th>
                <th>Oraș</th>
                <th>Data livrare</th>
                <th>Linii</th>
                <th>Primele articole</th>
                <th>Eroare</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>${this._renderRows()}</tbody>
          </table>
        </div>
      </div>
    `
  }
}

customElements.define('routing-errors-page', RoutingErrorsPage)