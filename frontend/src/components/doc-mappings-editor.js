import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import {
  getDocMappings, createDocMapping, removeDocMapping,
  removeXmlMappings,
} from '@/services/api.js'

export class DocMappingsEditor extends LitElement {
  static properties = {
    trdr:     { type: String },
    _docs:    { state: true },
    _loading: { state: true },
    _selectedId: { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .toolbar { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border: 1px solid #dbdbdb; padding: 0.4em 0.6em; vertical-align: middle; }
    th { background: #f5f5f5; font-weight: 600; text-align: left; }
    tr:hover { background: #fafafa; cursor: pointer; }
    tr.selected { background: #eff5fb; }
    .actions { display: flex; gap: 0.25rem; }
    .new-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-top: 0.75rem; }
    .new-row input { width: 120px; }
  `]

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
    const fprms = this.shadowRoot.querySelector('#newFprms')?.value
    const series = this.shadowRoot.querySelector('#newSeries')?.value
    const dirIn = this.shadowRoot.querySelector('#newDirIn')?.value || ''
    const dirOut = this.shadowRoot.querySelector('#newDirOut')?.value || ''
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
    if (this._loading) return html`<div style="color:#3e8ed0;">Loading documents...</div>`

    return html`
      <table>
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
                  <button class="button is-small is-info"
                          @click=${(e) => { e.stopPropagation(); this._selectDoc(doc) }}>Load</button>
                  <button class="button is-small is-danger"
                          @click=${(e) => { e.stopPropagation(); this._deleteDoc(doc) }}>Delete</button>
                </div>
              </td>
            </tr>
          `)}
          ${!this._docs.length ? html`
            <tr><td colspan="5" style="text-align:center; color:#999;">No document mappings</td></tr>
          ` : ''}
        </tbody>
      </table>

      <div class="new-row">
        <input id="newFprms" class="input is-small" type="number" placeholder="FPRMS" />
        <input id="newSeries" class="input is-small" type="number" placeholder="SERIES" />
        <input id="newDirIn" class="input is-small" type="text" placeholder="Dir IN" style="width:160px;" />
        <input id="newDirOut" class="input is-small" type="text" placeholder="Dir OUT" style="width:160px;" />
        <button class="button is-small is-success" @click=${this._addDoc}>Add Document</button>
      </div>
    `
  }
}

customElements.define('doc-mappings-editor', DocMappingsEditor)
