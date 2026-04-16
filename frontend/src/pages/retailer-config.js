import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { RETAILERS } from '@/state/app-context.js'
import '@/components/connection-settings.js'
import '@/components/doc-mappings-editor.js'
import '@/components/xml-mapping-table.js'

export class RetailerConfig extends LightElement {
  static properties = {
    trdr: { type: String },
    _tab: { state: true },
    _selectedDocId: { state: true },
    _selectedDoc:   { state: true },
  }

  constructor() {
    super()
    this._tab = 'connection'
    this._selectedDocId = null
    this._selectedDoc = null
  }

  get retailer() {
    return RETAILERS.find(r => r.trdr === this.trdr)
  }

  _onDocSelected(e) {
    this._selectedDocId = e.detail.docId
    this._selectedDoc = e.detail.doc
  }

  render() {
    const r = this.retailer
    if (!r) return html`<div class="container-xl py-4"><p>Retailer not found.</p></div>`

    return html`
      <div class="container-xl py-4">
        <div class="header">
          <img src="${r.logo}" alt="${r.name}" />
          <h1 class="fw-bold" style="font-size:1.5rem;">Config &mdash; ${r.name}</h1>
          <span class="badge bg-info">TRDR ${r.trdr}</span>
          <a href="/retailer/${r.trdr}" class="btn btn-sm ms-3">&larr; Back</a>
        </div>

        <ul class="nav nav-tabs mb-3 mt-3">
          <li class="nav-item">
            <a class="nav-link ${this._tab === 'connection' ? 'active' : ''}"
               href="#" @click=${(e) => { e.preventDefault(); this._tab = 'connection' }}>Conexiune</a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${this._tab === 'documents' ? 'active' : ''}"
               href="#" @click=${(e) => { e.preventDefault(); this._tab = 'documents' }}>Documente asociate</a>
          </li>
        </ul>

        ${this._tab === 'connection' ? html`
          <connection-settings .trdr=${this.trdr}></connection-settings>
        ` : html`
          <h3>Document Mappings</h3>
          <doc-mappings-editor .trdr=${this.trdr}
                               @doc-selected=${this._onDocSelected}></doc-mappings-editor>

          <h3>XML → S1 Mapping ${this._selectedDocId ? html`<span style="font-weight:normal;color:#999;">(Doc ID: ${this._selectedDocId})</span>` : ''}</h3>
          <xml-mapping-table .trdr=${this.trdr}
                             .docId=${this._selectedDocId}
                             .doc=${this._selectedDoc}></xml-mapping-table>
        `}
      </div>
    `
  }
}

customElements.define('retailer-config', RetailerConfig)
