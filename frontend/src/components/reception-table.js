import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { getReceptionsPaged, createReceptionInvoice, sendInvoiceXml, client } from '@/services/api.js'
import './xml-viewer.js'

const STATUS_LABEL = {
  clean: 'Conform',
  difference: 'Diferență',
  unresolved: 'Nerezolvat',
  blocked: 'Blocat',
  not_received: 'Neprimit'
}

const STATUS_BADGE_CLASS = {
  clean: 'bg-success',
  difference: 'bg-warning text-dark',
  unresolved: 'bg-secondary',
  blocked: 'bg-danger',
  not_received: 'bg-light text-muted'
}

const STATUS_EXPLANATION = {
  clean: 'Toate liniile acceptate de retailer coincid cu cele expediate pe avizul 7111. Nicio acțiune necesară.',
  difference: 'Retailerul a acceptat mai puțin decât am expediat pe una sau mai multe linii, sau nu a confirmat deloc o linie expediată (caz în care apare cu acceptat 0). Cauze posibile: recepție parțială, produs respins la recepție (retur emis de retailer) sau un fișier RECADV care încă nu a sosit pentru restul cantității.',
  unresolved: 'Retailerul a confirmat un cod de produs care nu apare pe avizul de expediere (7111) căutat. Verificați maparea de cod retailer -> Soft1 (CCCS1DXTRDRMTRL) sau dacă avizul corect a fost identificat.',
  blocked: 'Cantitatea acceptată raportată de retailer este MAI MARE decât cea expediată — fizic imposibil, deci nu poate fi doar o lipsă. Cauza confirmată cel mai des: aceeași avizare a primit două fișiere RECADV din familii diferite de numere de document (ex. o serie 5017... și o serie 7900...), fiecare raportând independent cantitatea totală acceptată, iar sistemul le-a însumat pe amândouă. Recepția este blocată deliberat de la facturare automată — necesită verificare manuală în Soft1 înainte de a factura.',
  not_received: 'Nu a sosit încă niciun fișier RECADV de la retailer pentru acest aviz.'
}

export class ReceptionTable extends LightElement {
  static properties = {
    trdr:        { type: String },
    daysOlder:   { type: Number },
    _receptions: { state: true },
    _loading:    { state: true },
    _page:       { state: true },
    _pageSize:   { state: true },
    _total:      { state: true },
    _expanded:   { state: true },
    _xmlByFile:  { state: true },
    _search:     { state: true },
    _infoStatus: { state: true },
    _invoicing:  { state: true },
    _sending:    { state: true },
  }

  constructor() {
    super()
    this._receptions = []
    this._loading = false
    this.daysOlder = 30
    this._page = 1
    this._pageSize = 25
    this._total = 0
    this._expanded = new Set()
    this._xmlByFile = new Map()
    this._search = ''
    this._infoStatus = null
    this._invoicing = new Set()
    this._sending = new Set()
  }

  connectedCallback() {
    super.connectedCallback()
    this.loadReceptions()
  }

  updated(changedProps) {
    if (changedProps.has('trdr') && this.trdr) {
      this._page = 1
      this.loadReceptions()
    }
  }

  async loadReceptions() {
    this._loading = true
    try {
      const res = await getReceptionsPaged(this.trdr, {
        page: this._page, pageSize: this._pageSize, daysOlder: this.daysOlder, search: this._search
      })
      if (res?.success) {
        this._receptions = res.data || []
        this._total = res.total || 0
      } else {
        this._toast('Failed to load receptions: ' + (res?.error || 'Unknown error'), 'is-danger')
      }
    } catch (e) {
      this._toast('Failed to load receptions: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  async _runSearch() {
    this._page = 1
    await this.loadReceptions()
  }

  async _clearSearch() {
    if (!this._search) return
    this._search = ''
    this._page = 1
    await this.loadReceptions()
  }

  get _totalPages() { return Math.max(1, Math.ceil(this._total / this._pageSize)) }

  async _prevPage() {
    if (this._page > 1) { this._page--; await this.loadReceptions() }
  }

  async _nextPage() {
    if (this._page < this._totalPages) { this._page++; await this.loadReceptions() }
  }

  _toggleDetail(findoc) {
    const expanded = new Set(this._expanded)
    if (expanded.has(findoc)) expanded.delete(findoc)
    else expanded.add(findoc)
    this._expanded = expanded
  }

  async _viewXml(file) {
    if (this._xmlByFile.has(file)) {
      this._toggleXml(file)
      return
    }
    try {
      const res = await client.service('CCCSFTPXML').find({
        query: { TRDR_RETAILER: parseInt(this.trdr, 10), XMLFILENAME: file, $limit: 1 }
      })
      const xml = res?.data?.[0]?.XMLDATA || 'XML not found'
      const xmlByFile = new Map(this._xmlByFile)
      xmlByFile.set(file, xml)
      this._xmlByFile = xmlByFile
      this._toggleXml(file)
    } catch (e) {
      this._toast('View XML failed: ' + e.message, 'is-danger')
    }
  }

  _toggleXml(file) {
    this._toggleDetail(`xml:${file}`)
  }

  _showStatusInfo(status) {
    this._infoStatus = status
  }

  _closeStatusInfo() {
    this._infoStatus = null
  }

  async _createInvoice(row) {
    const findoc = row.FINDOC
    this._invoicing = new Set([...this._invoicing, findoc])
    try {
      const res = await createReceptionInvoice(findoc)
      if (res?.success) {
        this._receptions = this._receptions.map((r) => r.FINDOC === findoc ? {
          ...r,
          INVOICE_FINDOC: res.findoc,
          INVOICE_FINCODE: res.fincode,
          INVOICE_TRNDATE: res.trndate,
          INVOICE_COUNT: (r.INVOICE_COUNT || 0) + 1,
        } : r)
        this._toast(`Factură ${res.fincode} creată`, 'is-success')
      } else {
        this._toast('Facturare eșuată: ' + (res?.error || 'Eroare necunoscută'), 'is-danger')
      }
    } catch (e) {
      this._toast('Facturare eșuată: ' + e.message, 'is-danger')
    } finally {
      this._invoicing = new Set([...this._invoicing].filter((f) => f !== findoc))
    }
  }

  async _sendInvoice(row, override = false) {
    const invoiceFindoc = row.INVOICE_FINDOC
    if (!invoiceFindoc) return
    this._sending = new Set([...this._sending, invoiceFindoc])
    try {
      const res = await sendInvoiceXml(invoiceFindoc, this.trdr, { override })
      if (res.alreadySent) {
        this._toast(`Factura ${res.filename} a fost deja trimisă`, 'is-warning')
        return
      }
      if (!res.success) throw new Error(res.error || 'Trimitere eșuată')
      this._receptions = this._receptions.map((r) => r.FINDOC === row.FINDOC ? {
        ...r,
        INVOICE_SENT_DATE: res.sentDate || r.INVOICE_SENT_DATE,
      } : r)
      this._toast(`Factură ${res.filename} trimisă`, 'is-success')
    } catch (e) {
      this._toast('Trimitere eșuată: ' + e.message, 'is-danger')
    } finally {
      this._sending = new Set([...this._sending].filter((f) => f !== invoiceFindoc))
    }
  }

  _toast(msg, type) {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: msg, type }, bubbles: true, composed: true,
    }))
  }

  _renderLines(reception) {
    const lines = reception.lines || []
    if (!lines.length) return html`<div class="text-secondary small">Nicio linie de comparat.</div>`
    return html`
      <table class="table table-sm table-bordered mb-2">
        <thead>
          <tr><th>Cod retailer</th><th>Cod Soft1</th><th>Descriere</th><th>Expediat</th><th>Acceptat</th><th>Diferență</th></tr>
        </thead>
        <tbody>
          ${lines.map((l) => html`
            <tr class="${l.delta < 0 ? 'table-danger' : l.delta > 0 ? 'table-warning' : ''}">
              <td>${l.buyerItemId}</td>
              <td>${l.mtrlCode || ''}</td>
              <td>${l.description || ''}</td>
              <td>${l.shipped}</td>
              <td>${l.accepted}</td>
              <td>${l.delta}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `
  }

  _renderDetail(row) {
    const reception = row.reconciliation
    if (!reception || reception.status === 'not_received') {
      return html`<div class="text-secondary small">Niciun RECADV primit încă pentru acest aviz.</div>`
    }
    return html`
      ${this._renderLines(reception)}
      ${reception.unresolvedLines?.length ? html`
        <div class="small text-secondary">Produse acceptate absente de pe aviz: ${reception.unresolvedLines.map((l) => l.buyerItemId).join(', ')}</div>
      ` : ''}
      ${reception.missingOnReceipt?.length ? html`
        <div class="small text-secondary">Linii expediate lipsă din recepție: ${reception.missingOnReceipt.map((l) => l.retailerCode).join(', ')}</div>
      ` : ''}
      ${reception.gtinMismatches?.length ? html`
        <div class="small text-secondary">GTIN neconcordant (avertisment): ${reception.gtinMismatches.map((m) => m.buyerItemId).join(', ')}</div>
      ` : ''}
    `
  }

  render() {
    return html`
      <div class="toolbar">
        <button class="btn btn-info btn-sm ${this._loading ? 'btn-loading' : ''}"
                @click=${this.loadReceptions} ?disabled=${this._loading}>
          Refresh
        </button>
        <label class="invoice-days-filter">
          <input type="number" class="form-control form-control-sm invoice-days-input"
                 .value=${String(this.daysOlder)} min="1" max="90"
                 @change=${(e) => { this.daysOlder = parseInt(e.target.value) || 30; this._page = 1; this.loadReceptions() }} />
          zile
        </label>
        <div class="position-relative" style="width:260px;align-self:center;">
          <input type="text" class="form-control form-control-sm" style="padding-right:1.75rem;"
                 placeholder="Cod S1, cod retailer, comandă sau aviz..."
                 .value=${this._search}
                 @input=${(e) => { this._search = e.target.value }}
                 @keyup=${(e) => { if (e.key === 'Enter') this._runSearch() }} />
          ${this._search ? html`
            <button type="button" class="btn-close position-absolute top-50 end-0 translate-middle-y me-2"
                    style="font-size:0.6rem;" title="Șterge căutarea" @click=${this._clearSearch}></button>
          ` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" @click=${this._runSearch} ?disabled=${this._loading}>
          Caută
        </button>
      </div>

      ${this._loading && !this._receptions.length ? html`
        <div class="text-center mt-3">Loading receptions...</div>
      ` : ''}

      ${this._receptions.length ? html`
        <div class="table-wrap">
          <table class="table table-hover table-vcenter">
            <thead>
              <tr>
                <th>Dată</th>
                <th>Aviz</th>
                <th>Comandă</th>
                <th>Document EDI</th>
                <th>Linii</th>
                <th>Status reconciliere</th>
                <th>Facturat</th>
                <th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              ${this._receptions.map((row) => {
                const reception = row.reconciliation || { status: 'not_received' }
                const findoc = row.FINDOC
                const isOpen = this._expanded.has(findoc)
                const files = reception.files || []
                return html`
                  <tr>
                    <td>${row.TRNDATE}</td>
                    <td>${row.FINCODE}</td>
                    <td>${row.NUM04 || ''}</td>
                    <td>${(reception.documentNumbers || []).join(', ') || '—'}</td>
                    <td>${reception.lines?.length ?? '—'}</td>
                    <td>
                      <span class="badge ${STATUS_BADGE_CLASS[reception.status] || 'bg-light text-muted'}">
                        ${STATUS_LABEL[reception.status] || reception.status}
                        <button type="button" class="status-info-icon" title="Vezi explicații" @click=${() => this._showStatusInfo(reception.status)}>i</button>
                      </span>
                    </td>
                    <td>
                      ${row.INVOICE_FINCODE ? html`
                        <span class="badge bg-success">${row.INVOICE_FINCODE} - ${row.INVOICE_TRNDATE}</span>
                        ${row.INVOICE_COUNT > 1 ? html`<span class="badge bg-secondary ms-1">+${row.INVOICE_COUNT - 1}</span>` : ''}
                        ${row.INVOICE_SENT_DATE ? html`
                          <button class="btn btn-sm btn-warning ms-1" title=${row.INVOICE_SENT_DATE}
                                  ?disabled=${this._sending.has(row.INVOICE_FINDOC)}
                                  @click=${() => this._sendInvoice(row, true)}>
                            ${this._sending.has(row.INVOICE_FINDOC) ? 'Se trimite...' : 'Retrimite'}
                          </button>
                        ` : html`
                          <button class="btn btn-sm btn-primary ms-1"
                                  ?disabled=${this._sending.has(row.INVOICE_FINDOC)}
                                  @click=${() => this._sendInvoice(row)}>
                            ${this._sending.has(row.INVOICE_FINDOC) ? 'Se trimite...' : 'Trimite'}
                          </button>
                        `}
                      ` : reception.status === 'clean' ? html`
                        <button class="btn btn-sm btn-success" ?disabled=${this._invoicing.has(findoc)}
                                @click=${() => this._createInvoice(row)}>
                          ${this._invoicing.has(findoc) ? 'Se facturează...' : 'Facturează'}
                        </button>
                      ` : html`<span class="badge bg-light text-muted">Nu</span>`}
                    </td>
                    <td>
                      <div class="actions">
                        ${files.map((file) => html`
                          <button class="btn btn-sm btn-outline-secondary" @click=${() => this._viewXml(file)}>Vezi XML</button>
                        `)}
                        <button class="btn btn-sm btn-info" @click=${() => this._toggleDetail(findoc)}>
                          ${isOpen ? 'Ascunde diferențe' : 'Vezi diferențe'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  ${isOpen ? html`
                    <tr>
                      <td colspan="8">${this._renderDetail(row)}</td>
                    </tr>
                  ` : ''}
                  ${files.map((file) => this._expanded.has(`xml:${file}`) ? html`
                    <tr>
                      <td colspan="8"><xml-viewer .content=${this._xmlByFile.get(file) || ''}></xml-viewer></td>
                    </tr>
                  ` : '')}
                `
              })}
            </tbody>
          </table>
        </div>
      ` : html`
        ${!this._loading ? html`<div class="text-center text-secondary mt-3">No receptions found</div>` : ''}
      `}

      <div class="d-flex justify-content-between align-items-center mt-3 invoice-pagination-row">
        <span class="text-secondary">${this._total} rezultate — pagina ${this._page}/${this._totalPages}</span>
        <div class="btn-list">
          <button class="btn btn-sm" ?disabled=${this._page <= 1} @click=${this._prevPage}>&larr; Prev</button>
          <button class="btn btn-sm" ?disabled=${this._page >= this._totalPages} @click=${this._nextPage}>Next &rarr;</button>
        </div>
      </div>

      ${this._infoStatus ? html`
        <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this._closeStatusInfo() }}>
          <div class="modal-box">
            <div class="modal-head">
              <span>
                <span class="badge ${STATUS_BADGE_CLASS[this._infoStatus] || 'bg-light text-muted'} me-2">${STATUS_LABEL[this._infoStatus] || this._infoStatus}</span>
                Ce înseamnă acest status?
              </span>
              <button class="modal-close-btn" @click=${this._closeStatusInfo}>&times;</button>
            </div>
            <div class="modal-body">
              <p>${STATUS_EXPLANATION[this._infoStatus] || 'Fără explicație disponibilă pentru acest status.'}</p>
            </div>
          </div>
        </div>
      ` : ''}
    `
  }
}

customElements.define('reception-table', ReceptionTable)
