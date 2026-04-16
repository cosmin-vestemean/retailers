import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import {
  getDocMappings, createDocMapping, removeDocMapping,
  removeXmlMappings,
} from '@/services/api.js'

export class DocMappingsEditor extends LightElement {
  static properties = {
    trdr:     { type: String },
    _docs:    { state: true },
    _loading: { state: true },
    _selectedId: { state: true },
  }


  constructor() {
    super()
    this._docs = []
    this._loading = false
    this._selectedId = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadDocs()
  }

  async _loadDocs() {
    this._loading = true
    try {
      const res = await getDocMappings({ TRDR_RETAILER: parseInt(this.trdr) })
      this._docs = res.data || []
    } catch (e) {
      this._toast('Failed to load documents: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  _selectDoc(doc) {
    this._selectedId = doc.CCCDOCUMENTES1MAPPINGS
    this.dispatchEvent(new CustomEvent('doc-selected', {
      detail: { docId: doc.CCCDOCUMENTES1MAPPINGS, doc },
      bubbles: true, composed: true,
    }))
  }

  async _addDoc() {
    const fprms = this.querySelector('#newFprms')?.value
    const series = this.querySelector('#newSeries')?.value
    const dirIn = this.querySelector('#newDirIn')?.value || ''
    const dirOut = this.querySelector('#newDirOut')?.value || ''
    if (!fprms || !series) {
      this._toast('FPRMS and SERIES are required', 'is-warning')
      return
    }
    try {
      await createDocMapping({
        TRDR_RETAILER: parseInt(this.trdr),
        TRDR_CLIENT: 1,
        SOSOURCE: 1351,
        FPRMS: parseInt(fprms),
        SERIES: parseInt(series),
        INITIALDIRIN: dirIn,
        INITIALDIROUT: dirOut,
      })
      await this._loadDocs()
      this._toast('Document mapping added', 'is-success')
    } catch (e) {
      this._toast('Add failed: ' + e.message, 'is-danger')
    }
  }

  async _deleteDoc(doc) {
    if (!confirm(`Delete document mapping FPRMS=${doc.FPRMS}, SERIES=${doc.SERIES} and all its XML mappings?`)) return
    try {
      await removeXmlMappings(doc.CCCDOCUMENTES1MAPPINGS)
      await removeDocMapping(doc.CCCDOCUMENTES1MAPPINGS)
      if (this._selectedId === doc.CCCDOCUMENTES1MAPPINGS) this._selectedId = null
      await this._loadDocs()
      this._toast('Document mapping deleted', 'is-success')
    } catch (e) {
      this._toast('Delete failed: ' + e.message, 'is-danger')
    }
  }

  _toast(msg, type) {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: msg, type }, bubbles: true, composed: true,
    }))
  }

  render() {
    if (this._loading) return html`<div style="color:var(--tblr-primary);">Loading documents...</div>`

    return html`
      <table class="table table-hover table-vcenter">
        <thead>
          <tr>
            <th>FPRMS</th>
            <th>SERIES</th>
            <th>Dir IN</th>
            <th>Dir OUT</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this._docs.map(doc => html`
            <tr class=${this._selectedId === doc.CCCDOCUMENTES1MAPPINGS ? 'selected' : ''}
                @click=${() => this._selectDoc(doc)}>
              <td>${doc.FPRMS}</td>
              <td>${doc.SERIES}</td>
              <td>${doc.INITIALDIRIN || ''}</td>
              <td>${doc.INITIALDIROUT || ''}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-sm btn-info"
                          @click=${(e) => { e.stopPropagation(); this._selectDoc(doc) }}>Load</button>
                  <button class="btn btn-sm btn-danger"
                          @click=${(e) => { e.stopPropagation(); this._deleteDoc(doc) }}>Delete</button>
                </div>
              </td>
            </tr>
          `)}
          ${!this._docs.length ? html`
            <tr><td colspan="5" class="text-center text-secondary">No document mappings</td></tr>
          ` : ''}
        </tbody>
      </table>

      <div class="new-row">
        <input id="newFprms" class="form-control form-control-sm" type="number" placeholder="FPRMS" />
        <input id="newSeries" class="form-control form-control-sm" type="number" placeholder="SERIES" />
        <input id="newDirIn" class="form-control form-control-sm" type="text" placeholder="Dir IN" style="width:160px;" />
        <input id="newDirOut" class="form-control form-control-sm" type="text" placeholder="Dir OUT" style="width:160px;" />
        <button class="btn btn-sm btn-success" @click=${this._addDoc}>Add Document</button>
      </div>
    `
  }
}

customElements.define('doc-mappings-editor', DocMappingsEditor)
