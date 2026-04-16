import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import {
  getInvoicesPaged, getInvoiceDom, uploadInvoice, markDocumentSent,
  downloadAperaks, getAperaks, getToken, client,
} from '@/services/api.js'
import './xml-viewer.js'
import './batch-progress.js'

export class InvoiceTable extends LightElement {
  static properties = {
    trdr:        { type: String },
    daysOlder:   { type: Number },
    sosource:    { type: Number },
    fprms:       { type: Number },
    series:      { type: Number },
    _invoices:   { state: true },
    _loading:    { state: true },
    _sending:    { state: true },
    _page:       { state: true },
    _pageSize:   { state: true },
    _total:      { state: true },
  }

  constructor() {
    super()
    this._invoices = []
    this._loading = false
    this._sending = new Set()
    this.daysOlder = 7
    this.sosource = 1351
    this.fprms = 712
    this.series = 7121
    this._page = 1
    this._pageSize = 25
    this._total = 0
  }

  connectedCallback() {
    super.connectedCallback()
    this.loadInvoices()
  }

  async loadInvoices() {
    this._loading = true
    try {
      const res = await getInvoicesPaged(this.trdr, {
        sosource: this.sosource, fprms: this.fprms,
        series: this.series, daysOlder: this.daysOlder,
        page: this._page, pageSize: this._pageSize,
      })
      if (res?.success) {
        const invoices = (res.data || []).map(r => ({
          findoc: r.findoc,
          trndate: r.trndate || '',
          fincode: r.fincode,
          sumamnt: r.sumamnt,
          sent: !!r.CCCXMLSendDate,
          sentDate: r.CCCXMLSendDate || null,
          xmlFile: r.CCCXMLFile || null,
          postfix: '',
          xmlData: null,
          aperak: null,
          _sending: false,
        }))
        // Fetch aperaks for current page only
        const aperakResults = await Promise.all(
          invoices.map(inv =>
            getAperaks({
              FINDOC: inv.findoc,
              TRDR_RETAILER: this.trdr,
              $sort: { MESSAGEDATE: -1, MESSAGETIME: -1 },
            }).catch(() => ({ data: [], total: 0 }))
          )
        )
        aperakResults.forEach((ar, i) => {
          if (ar.total > 0) invoices[i].aperak = ar.data[0]
        })
        this._invoices = invoices
        this._total = res.total || 0
      } else {
        this._toast('Failed to load invoices: ' + (res?.error || 'Unknown error'), 'is-danger')
      }
    } catch (e) {
      this._toast('Failed to load invoices: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  get _totalPages() { return Math.max(1, Math.ceil(this._total / this._pageSize)) }

  async _prevPage() {
    if (this._page > 1) { this._page--; await this.loadInvoices() }
  }

  async _nextPage() {
    if (this._page < this._totalPages) { this._page++; await this.loadInvoices() }
  }

  async _downloadAperaks() {
    this._loading = true
    try {
      await downloadAperaks(this.trdr)
      await this.loadInvoices()
      this._toast('APERAKs downloaded', 'is-success')
    } catch (e) {
      this._toast('APERAK download failed: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  async _createXml(inv, index) {
    try {
      const domObj = await getInvoiceDom({ appID: '1001', findoc: inv.findoc })
      this._invoices = this._invoices.map((item, i) =>
        i === index ? { ...item, xmlData: domObj.dom, _domObj: domObj } : item
      )
    } catch (e) {
      this._toast('Create XML failed: ' + e.message, 'is-danger')
    }
  }

  _saveXml(inv) {
    if (!inv._domObj) return
    const filename = this._getFilename(inv)
    const blob = new Blob([inv._domObj.dom], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename + '.xml'; a.click()
    URL.revokeObjectURL(url)
  }

  _getFilename(inv) {
    if (!inv._domObj) return inv.fincode
    let filename = inv._domObj.filename
    if (inv.postfix) {
      const parts = filename.split('_')
      if (parts.length >= 4) {
        filename = parts[0] + '_' + parts[1] + inv.postfix + '_' + parts[2] + '_' + parts[3]
      }
    }
    return filename
  }

  async _sendInvoice(inv, index, override = false) {
    if (inv.sent && !override) {
      this._toast('Invoice already sent', 'is-warning')
      return
    }
    this._sending = new Set([...this._sending, index])
    this._invoices = this._invoices.map((item, i) =>
      i === index ? { ...item, _sending: true } : item
    )

    try {
      // Get DOM if not cached
      let domObj = inv._domObj
      if (!domObj) {
        domObj = await getInvoiceDom({ appID: '1001', findoc: inv.findoc })
      }
      if (domObj.trimis && !override) {
        this._toast(`Invoice ${domObj.filename} already sent`, 'is-warning')
        return
      }

      const filename = this._getFilename({ ...inv, _domObj: domObj })

      // Upload via SFTP
      const res = await uploadInvoice(inv.findoc, domObj.dom, filename, this.trdr)
      if (res?.success) {
        // Mark as sent in S1
        await markDocumentSent(inv.findoc, filename)
        this._invoices = this._invoices.map((item, i) =>
          i === index ? {
            ...item,
            sent: true,
            sentDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            _sending: false,
            _domObj: domObj,
            xmlData: domObj.dom,
          } : item
        )
        this._toast(`Invoice ${filename} sent`, 'is-success')
      } else {
        throw new Error('Upload failed')
      }
    } catch (e) {
      this._toast('Send failed: ' + e.message, 'is-danger')
    } finally {
      this._sending = new Set([...this._sending].filter(i => i !== index))
      this._invoices = this._invoices.map((item, i) =>
        i === index ? { ...item, _sending: false } : item
      )
    }
  }

  async _markAlreadySent(inv, index) {
    try {
      await markDocumentSent(inv.findoc, 'Already sent by other means')
      this._invoices = this._invoices.map((item, i) =>
        i === index ? {
          ...item,
          sent: true,
          sentDate: 'Manual',
        } : item
      )
      this._toast('Marked as sent', 'is-success')
    } catch (e) {
      this._toast('Mark failed: ' + e.message, 'is-danger')
    }
  }

  async _sendAllUnsent() {
    const unsent = this._invoices
      .map((inv, i) => ({ inv, i }))
      .filter(({ inv }) => !inv.sent)

    if (!unsent.length) return
    const bp = this.querySelector('batch-progress')
    bp.start(unsent.length)

    for (const { inv, i } of unsent) {
      bp.advance(`Sending ${inv.fincode}...`)
      await this._sendInvoice(inv, i)
    }
    bp.finish('All invoices processed')
    await this.loadInvoices()
  }

  _toggleAperak(e) {
    const body = e.currentTarget.nextElementSibling
    body.classList.toggle('open')
  }

  _toast(msg, type) {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: msg, type }, bubbles: true, composed: true,
    }))
  }

  get _unsentCount() {
    return this._invoices.filter(i => !i.sent).length
  }

  _renderAperak(aperak) {
    if (!aperak) return html`<span style="color:#999;font-size:0.8rem;">—</span>`
    const resp = aperak.DOCUMENTRESPONSE?.toLowerCase()
    const isOk = resp === 'acceptat' || resp === 'receptionat'
    const color = isOk ? 'text-bg-success' : 'text-bg-danger'
    const detail = (aperak.DOCUMENTDETAIL || '')
      .replace('Status', '<br>Status')
      .replace('Mesaj', '<br>Mesaj')
      .replace('Nume fisier', '<br>Nume fisier')
    const dateStr = aperak.MESSAGEDATE
      ? aperak.MESSAGEDATE.split('T')[0] + ' ' + (aperak.MESSAGETIME?.split('T')[1]?.split('.')[0] || '')
      : ''

    return html`
      <div class="card card-sm ${isOk ? '' : 'border-danger'}" style="margin:0;">
        <div class="card-header aperak-header" @click=${this._toggleAperak} style="padding:0.3em 0.5em; cursor:pointer;">
          <span>${aperak.DOCUMENTRESPONSE} ${aperak.DOCUMENTREFERENCE || ''}</span>
        </div>
        <div class="aperak-body" style="padding:0.5em;" .innerHTML=${detail}></div>
      </div>
      ${dateStr ? html`<div style="font-size:0.75rem;color:var(--tblr-secondary);margin-top:0.2em;">${dateStr}</div>` : ''}
    `
  }

  render() {
    return html`
      <div class="toolbar">
        <button class="btn btn-info btn-sm ${this._loading ? 'btn-loading' : ''}"
                @click=${this.loadInvoices} ?disabled=${this._loading}>
          Refresh
        </button>
        <label style="font-size:0.85rem; display:inline-flex; align-items:center; gap:0.3rem;">
          <input type="number" class="form-control form-control-sm" style="width:60px;"
                 .value=${String(this.daysOlder)} min="1" max="90"
                 @change=${(e) => { this.daysOlder = parseInt(e.target.value) || 7; this._page = 1; this.loadInvoices() }} />
          zile
        </label>
        <button class="btn btn-primary btn-sm" @click=${this._downloadAperaks} ?disabled=${this._loading}>
          Download APERAKs
        </button>
        ${this._unsentCount > 0 ? html`
          <button class="btn btn-success btn-sm" @click=${this._sendAllUnsent}>
            Trimite toate (${this._unsentCount})
          </button>
        ` : ''}
      </div>

      <batch-progress></batch-progress>

      ${this._loading && !this._invoices.length ? html`
        <div class="text-center mt-3" style="font-size:1.2rem; color:var(--tblr-primary);">Loading invoices...</div>
      ` : ''}

      ${this._invoices.length ? html`
        <div class="table-wrap">
          <table class="table table-hover table-vcenter">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fincode</th>
                <th>Amount</th>
                <th>Actions</th>
                <th>Sent</th>
                <th>APERAK</th>
              </tr>
            </thead>
            <tbody>
              ${this._invoices.map((inv, i) => html`
                <tr>
                  <td>${inv.trndate}</td>
                  <td>
                    ${inv.fincode}
                    <input type="text" class="form-control form-control-sm postfix-input ms-1"
                           placeholder="postfix"
                           .value=${inv.postfix}
                           @input=${(e) => {
                             this._invoices = this._invoices.map((item, idx) =>
                               idx === i ? { ...item, postfix: e.target.value } : item
                             )
                           }} />
                  </td>
                  <td>${inv.sumamnt}</td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-info"
                              @click=${() => this._createXml(inv, i)}>Create XML</button>
                      ${inv.xmlData ? html`
                        <button class="btn btn-sm btn-primary"
                                @click=${() => this._saveXml(inv)}>Save XML</button>
                      ` : ''}
                      <button class="btn btn-sm btn-success"
                              ?disabled=${inv._sending}
                              @click=${() => this._sendInvoice(inv, i)}>
                        ${inv._sending ? 'Sending...' : 'Send'}
                      </button>
                      ${inv.sent ? html`
                        <button class="btn btn-sm btn-warning"
                                @click=${() => this._sendInvoice(inv, i, true)}>Resend</button>
                      ` : ''}
                    </div>
                    ${inv.xmlData ? html`<xml-viewer .content=${inv.xmlData}></xml-viewer>` : ''}
                  </td>
                  <td>
                    ${inv.sent ? html`
                      <span class="badge badge-sent">Sent</span>
                      <div style="font-size:0.75rem;color:var(--tblr-secondary);margin-top:0.2em;">${inv.sentDate}</div>
                    ` : html`
                      <label style="font-size:0.8rem; cursor:pointer;">
                        <input type="checkbox" @change=${(e) => {
                          if (e.target.checked && confirm('Mark invoice as sent by other means?')) {
                            this._markAlreadySent(inv, i)
                          } else { e.target.checked = false }
                        }} />
                        Already sent
                      </label>
                    `}
                  </td>
                  <td>${this._renderAperak(inv.aperak)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      ` : html`
        ${!this._loading ? html`<div class="text-center mt-3" style="color:#999;">No invoices found</div>` : ''}
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

customElements.define('invoice-table', InvoiceTable)
