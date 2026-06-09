import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import {
  getDoStorageObject,
  getDoStorageStatus,
  listDoStorageObjects,
  removeDoStorageObject,
  retryDoStorageObject
} from '@/services/api.js'

const PREFIXES = [
  { value: 'retry/', label: 'Retry' },
  { value: 'incoming/', label: 'Incoming temporar' },
  { value: '', label: 'Toate' }
]

export class DoStoragePage extends LightElement {
  static properties = {
    _status: { state: true },
    _objects: { state: true },
    _prefix: { state: true },
    _selected: { state: true },
    _xml: { state: true },
    _loading: { state: true },
    _workingKey: { state: true },
    _error: { state: true }
  }

  constructor() {
    super()
    this._status = null
    this._objects = []
    this._prefix = 'retry/'
    this._selected = null
    this._xml = ''
    this._loading = false
    this._workingKey = ''
    this._error = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this._refresh()
  }

  async _refresh() {
    this._loading = true
    this._error = ''
    try {
      const [status, list] = await Promise.all([
        getDoStorageStatus(),
        listDoStorageObjects({ prefix: this._prefix, limit: 100 })
      ])
      this._status = status
      this._objects = list.data || []
    } catch (error) {
      this._error = error.message
    } finally {
      this._loading = false
    }
  }

  async _viewObject(key) {
    this._workingKey = key
    this._error = ''
    try {
      const object = await getDoStorageObject(key)
      this._selected = object
      this._xml = object.body || ''
    } catch (error) {
      this._error = error.message
    } finally {
      this._workingKey = ''
    }
  }

  async _retryObject(key) {
    this._workingKey = key
    this._error = ''
    try {
      await retryDoStorageObject(key)
      await this._refresh()
      if (this._selected?.key === key) {
        this._selected = null
        this._xml = ''
      }
    } catch (error) {
      this._error = error.message
    } finally {
      this._workingKey = ''
    }
  }

  async _deleteObject(key) {
    if (!window.confirm('Ștergi obiectul din DigitalOcean Spaces?')) return
    this._workingKey = key
    this._error = ''
    try {
      await removeDoStorageObject(key)
      await this._refresh()
      if (this._selected?.key === key) {
        this._selected = null
        this._xml = ''
      }
    } catch (error) {
      this._error = error.message
    } finally {
      this._workingKey = ''
    }
  }

  _formatSize(size) {
    if (!size) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  _metadataEntries() {
    return Object.entries(this._selected?.metadata || {})
  }

  render() {
    return html`
      <div class="container-xl py-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <h1 class="fw-bold mb-1" style="font-size:1.5rem;">DigitalOcean Spaces</h1>
            <p class="text-secondary mb-0">XML-uri păstrate doar când salvarea în S1 nu a reușit.</p>
          </div>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click=${this._refresh} ?disabled=${this._loading}>
            ${this._loading ? 'Se încarcă...' : 'Reîncarcă'}
          </button>
        </div>

        ${this._error ? html`<div class="alert alert-danger py-2 px-3 small">${this._error}</div>` : ''}

        <div class="row g-3 mb-4">
          <div class="col-12 col-lg-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h2 class="h6 mb-3">Status bucket</h2>
                ${this._status ? html`
                  <dl class="row small mb-0">
                    <dt class="col-4">Bucket</dt><dd class="col-8">${this._status.bucket || '-'}</dd>
                    <dt class="col-4">Endpoint</dt><dd class="col-8 text-break">${this._status.endpoint || '-'}</dd>
                    <dt class="col-4">Regiune</dt><dd class="col-8">${this._status.region || '-'}</dd>
                    <dt class="col-4">Acces</dt>
                    <dd class="col-8">
                      <span class="badge ${this._status.accessible ? 'text-bg-success' : 'text-bg-danger'}">
                        ${this._status.accessible ? 'OK' : 'Eroare'}
                      </span>
                    </dd>
                  </dl>
                ` : html`<p class="text-secondary small mb-0">Status indisponibil.</p>`}
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-8">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <div class="d-flex flex-wrap gap-3 align-items-end justify-content-between mb-3">
                  <div>
                    <label class="form-label small">Prefix</label>
                    <select class="form-select form-select-sm" .value=${this._prefix} @change=${(event) => { this._prefix = event.target.value; this._refresh() }}>
                      ${PREFIXES.map((item) => html`<option value=${item.value}>${item.label}</option>`)}
                    </select>
                  </div>
                  <span class="text-secondary small">${this._objects.length} obiecte</span>
                </div>

                <div class="table-responsive border rounded-3">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Cheie</th>
                        <th class="text-end">Mărime</th>
                        <th>Modificat</th>
                        <th class="text-end">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${this._objects.length === 0 ? html`
                        <tr><td colspan="4" class="text-center text-secondary py-4">Nu există obiecte pentru prefixul selectat.</td></tr>
                      ` : this._objects.map((item) => html`
                        <tr>
                          <td class="text-break small">${item.key}</td>
                          <td class="text-end small">${this._formatSize(item.size)}</td>
                          <td class="small">${item.lastModified || '-'}</td>
                          <td class="text-end">
                            <div class="btn-list justify-content-end flex-nowrap">
                              <button class="btn btn-sm btn-outline-secondary" type="button" @click=${() => this._viewObject(item.key)} ?disabled=${this._workingKey === item.key}>Vezi</button>
                              ${item.key.startsWith('retry/') ? html`
                                <button class="btn btn-sm btn-info" type="button" @click=${() => this._retryObject(item.key)} ?disabled=${this._workingKey === item.key}>Retry</button>
                              ` : ''}
                              <button class="btn btn-sm btn-outline-danger" type="button" @click=${() => this._deleteObject(item.key)} ?disabled=${this._workingKey === item.key}>Șterge</button>
                            </div>
                          </td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${this._selected ? html`
          <div class="card shadow-sm border-0">
            <div class="card-header bg-body-tertiary border-0">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <h2 class="h6 mb-0 text-break">${this._selected.key}</h2>
                <button class="btn btn-sm btn-outline-secondary" type="button" @click=${() => { this._selected = null; this._xml = '' }}>Închide</button>
              </div>
            </div>
            <div class="card-body">
              ${this._metadataEntries().length ? html`
                <div class="row g-2 mb-3 small">
                  ${this._metadataEntries().map(([key, value]) => html`
                    <div class="col-12 col-md-6 col-xl-4"><strong>${key}:</strong> <span class="text-break">${value}</span></div>
                  `)}
                </div>
              ` : ''}
              <pre class="border rounded-3 p-3 bg-body-tertiary small" style="max-height: 520px; overflow:auto;"><code>${this._xml}</code></pre>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }
}

customElements.define('do-storage-page', DoStoragePage)