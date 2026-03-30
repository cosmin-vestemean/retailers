import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import {
  getXmlMappings, createXmlMapping, removeXmlMappings,
  createDocMapping, removeDocMapping, getDocMappings,
} from '@/services/api.js'

/**
 * Recursive XML-to-flat-array converter.
 * Produces array of { xmlPath, value } for each leaf node.
 */
function xml2flat(obj, parent, root, result) {
  for (const key in obj) {
    if (obj[key] !== null && typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        // Recurse into first element of arrays only (it's a template)
        if (obj[key].length > 0 && typeof obj[key][0] === 'object') {
          xml2flat(obj[key][0], [...parent, key], root, result)
        }
      } else {
        xml2flat(obj[key], [...parent, key], root, result)
      }
    } else {
      const fullPath = root + '/' + (parent.length ? parent.join('/') + '/' : '') + key
      result.push({ xmlPath: fullPath, value: obj[key] ?? '' })
    }
  }
}

/** Recursively convert XML DOM element to a JS object. */
function xmlElement2json(el) {
  const obj = {}
  for (const child of el.children) {
    const name = child.tagName
    if (child.children.length > 0) {
      const sub = xmlElement2json(child)
      if (obj[name]) {
        if (!Array.isArray(obj[name])) obj[name] = [obj[name]]
        obj[name].push(sub)
      } else {
        obj[name] = sub
      }
    } else {
      if (obj[name]) {
        if (!Array.isArray(obj[name])) obj[name] = [obj[name]]
        obj[name].push(child.textContent)
      } else {
        obj[name] = child.textContent
      }
    }
  }
  return obj
}

export class XmlMappingTable extends LitElement {
  static properties = {
    trdr:       { type: String },
    docId:      { type: Number },
    doc:        { type: Object },
    _rows:      { state: true },
    _loading:   { state: true },
    _saving:    { state: true },
    _hideUnsel: { state: true },
    _hideTbl2:  { state: true },
    _hideVal:   { state: true },
    _hideObs:   { state: true },
    _search:    { state: true },
    _xmlRoot:   { state: true },
    _lineDelim: { state: true },
  }

  static styles = [sharedStyles, css`
    :host { display: block; }
    .toolbar { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; align-items: center; }
    .table-wrap { overflow-x: auto; max-height: 70vh; overflow-y: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { border: 1px solid #dbdbdb; padding: 0.3em 0.5em; vertical-align: top; }
    th { background: #e6e6e6; font-weight: 600; text-align: left; position: sticky; top: 0; z-index: 1; }
    tr:hover { background: #fafafa; }
    tr.selected-row { background: #eff5fb; }
    tr.hidden-row { display: none; }
    .pick-col { text-align: center; width: 40px; }
    .xmlpath-col { max-width: 280px; word-wrap: break-word; font-family: monospace; font-size: 0.75rem; }
    input.cell-input { width: 100%; min-width: 80px; }
    textarea.cell-sql { width: 260px; min-height: 1.5em; font-size: 0.75rem; font-family: monospace; }
    .col-hidden { display: none; }
    .file-row { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .file-row label { font-size: 0.8rem; font-weight: 600; }
    select { font-size: 0.85rem; padding: 0.3em 0.5em; }
  `]

  constructor() {
    super()
    this._rows = []
    this._loading = false
    this._saving = false
    this._hideUnsel = false
    this._hideTbl2 = true
    this._hideVal = true
    this._hideObs = true
    this._search = ''
    this._xmlRoot = 'Order'
    this._lineDelim = 'OrderLine'
  }

  updated(changed) {
    if (changed.has('docId') && this.docId) {
      this._loadMappings()
    }
  }

  async _loadMappings() {
    if (!this.docId) return
    this._loading = true
    try {
      const res = await getXmlMappings({
        CCCDOCUMENTES1MAPPINGS: this.docId,
        $sort: { XMLORDER: 1 },
      })
      this._rows = (res.data || []).map(m => ({
        xmlOrder: m.XMLORDER || 0,
        picked: true,
        mandatory: m.MANDATORY === 1,
        xmlPath: m.XMLNODE,
        s1Table1: m.S1TABLE1 || '',
        s1Field1: m.S1FIELD1 || '',
        s1Table2: m.S1TABLE2 || '',
        s1Field2: m.S1FIELD2 || '',
        sql: m.SQL || '',
        value: '',
        observatii: m.OBSERVATII || '',
        _fromDb: true,
      }))
    } catch (e) {
      this._toast('Failed to load mappings: ' + e.message, 'is-danger')
    } finally {
      this._loading = false
    }
  }

  _loadXmlFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(ev.target.result, 'text/xml')
      const mainEl = xmlDoc.getElementsByTagName(this._xmlRoot)[0]
      if (!mainEl) {
        this._toast(`Root element <${this._xmlRoot}> not found in XML`, 'is-warning')
        return
      }
      const obj = xmlElement2json(mainEl)
      // Split header vs lines
      const header = {}
      let lines = null
      for (const key in obj) {
        if (key === this._lineDelim) {
          lines = Array.isArray(obj[key]) ? obj[key][0] : obj[key]
        } else {
          header[key] = obj[key]
        }
      }
      const flatRows = []
      xml2flat(header, [], this._xmlRoot, flatRows)
      if (lines) {
        xml2flat(lines, [], this._xmlRoot + '/' + this._lineDelim, flatRows)
      }
      this._rows = flatRows.map((r, i) => ({
        xmlOrder: i + 1,
        picked: false,
        mandatory: false,
        xmlPath: r.xmlPath,
        s1Table1: '',
        s1Field1: '',
        s1Table2: '',
        s1Field2: '',
        sql: '',
        value: r.value,
        observatii: '',
        _fromDb: false,
      }))
      this._toast(`Loaded ${flatRows.length} XML nodes`, 'is-info')
    }
    reader.readAsText(file)
  }

  async _save() {
    if (!this.doc) {
      this._toast('No document selected', 'is-warning')
      return
    }
    const selected = this._rows.filter(r => r.picked)
    if (!selected.length) {
      this._toast('Select at least one row', 'is-warning')
      return
    }
    this._saving = true
    try {
      // Check if doc already exists (overwrite scenario)
      const existing = await getDocMappings({
        FPRMS: this.doc.FPRMS,
        SERIES: this.doc.SERIES,
      })
      let targetDocId = this.docId
      if (existing.data?.length && existing.data[0].CCCDOCUMENTES1MAPPINGS !== this.docId) {
        if (!confirm('Mapping with same FPRMS/SERIES exists. Overwrite?')) {
          this._saving = false
          return
        }
        await removeXmlMappings(existing.data[0].CCCDOCUMENTES1MAPPINGS)
        await removeDocMapping(existing.data[0].CCCDOCUMENTES1MAPPINGS)
      } else if (this.docId) {
        // Delete existing child mappings before re-saving
        await removeXmlMappings(this.docId)
      }

      // If docId doesn't exist yet (new doc), create it
      if (!targetDocId) {
        const newDoc = await createDocMapping({
          TRDR_RETAILER: parseInt(this.trdr),
          TRDR_CLIENT: 1,
          SOSOURCE: 1351,
          FPRMS: this.doc.FPRMS,
          SERIES: this.doc.SERIES,
          INITIALDIRIN: this.doc.INITIALDIRIN || '',
          INITIALDIROUT: this.doc.INITIALDIROUT || '',
        })
        targetDocId = newDoc.CCCDOCUMENTES1MAPPINGS
      }

      // Insert all selected rows
      for (const row of selected) {
        await createXmlMapping({
          CCCDOCUMENTES1MAPPINGS: targetDocId,
          XMLNODE: row.xmlPath,
          XMLORDER: row.xmlOrder,
          MANDATORY: row.mandatory ? 1 : 0,
          S1TABLE1: row.s1Table1,
          S1FIELD1: row.s1Field1,
          S1TABLE2: row.s1Table2 || null,
          S1FIELD2: row.s1Field2 || null,
          SQL: row.sql || null,
          OBSERVATII: row.observatii || null,
        })
      }
      this._toast(`Saved ${selected.length} mappings`, 'is-success')
    } catch (e) {
      this._toast('Save failed: ' + e.message, 'is-danger')
    } finally {
      this._saving = false
    }
  }

  _updateRow(index, field, value) {
    this._rows = this._rows.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    )
  }

  _isVisible(row) {
    if (this._hideUnsel && !row.picked) return false
    if (this._search && !row.xmlPath.toLowerCase().includes(this._search.toLowerCase())) return false
    return true
  }

  _toast(msg, type) {
    this.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: msg, type }, bubbles: true, composed: true,
    }))
  }

  render() {
    if (this._loading) return html`<div style="color:#3e8ed0;">Loading mappings...</div>`
    if (!this.docId && !this._rows.length) {
      return html`<p style="color:#999;">Select a document above or load an XML file to begin mapping.</p>`
    }

    return html`
      <div class="file-row">
        <div>
          <label>XML Root:</label>
          <select .value=${this._xmlRoot} @change=${(e) => this._xmlRoot = e.target.value}>
            <option value="Order">Order</option>
            <option value="DXInvoice">DXInvoice</option>
          </select>
        </div>
        <div>
          <label>Line delimiter:</label>
          <select .value=${this._lineDelim} @change=${(e) => this._lineDelim = e.target.value}>
            <option value="OrderLine">OrderLine</option>
            <option value="InvoiceLine">InvoiceLine</option>
          </select>
        </div>
        <div>
          <label>Load XML file:</label>
          <input type="file" accept=".xml" @change=${this._loadXmlFile} />
        </div>
      </div>

      <div class="toolbar">
        <button class="button is-small ${this._hideUnsel ? 'is-warning' : 'is-info'}"
                @click=${() => this._hideUnsel = !this._hideUnsel}>
          ${this._hideUnsel ? 'Show all rows' : 'Hide unselected'}
        </button>
        <button class="button is-small is-info" @click=${() => this._hideTbl2 = !this._hideTbl2}>
          ${this._hideTbl2 ? 'Show' : 'Hide'} Table 2
        </button>
        <button class="button is-small is-info" @click=${() => this._hideVal = !this._hideVal}>
          ${this._hideVal ? 'Show' : 'Hide'} Value
        </button>
        <button class="button is-small is-info" @click=${() => this._hideObs = !this._hideObs}>
          ${this._hideObs ? 'Show' : 'Hide'} Notes
        </button>
        <input class="input is-small" style="width:180px;" placeholder="Search nodes..."
               .value=${this._search} @input=${(e) => this._search = e.target.value} />
        <button class="button is-small is-success ${this._saving ? 'is-loading' : ''}"
                @click=${this._save} ?disabled=${this._saving}>
          Save mapping
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:50px;">Ord.</th>
              <th class="pick-col">Pick</th>
              <th class="pick-col">Req.</th>
              <th>XML Path</th>
              <th>S1 Table 1</th>
              <th>S1 Field 1</th>
              <th class=${this._hideTbl2 ? 'col-hidden' : ''}>S1 Table 2</th>
              <th class=${this._hideTbl2 ? 'col-hidden' : ''}>S1 Field 2</th>
              <th>SQL</th>
              <th class=${this._hideVal ? 'col-hidden' : ''}>Value</th>
              <th class=${this._hideObs ? 'col-hidden' : ''}>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${this._rows.map((row, i) => html`
              <tr class="${!this._isVisible(row) ? 'hidden-row' : ''} ${row.picked ? 'selected-row' : ''}">
                <td>
                  <input class="input is-small cell-input" type="number" style="width:50px;"
                         .value=${String(row.xmlOrder)}
                         @input=${(e) => this._updateRow(i, 'xmlOrder', parseInt(e.target.value) || 0)} />
                </td>
                <td class="pick-col">
                  <input type="checkbox" .checked=${row.picked}
                         @change=${(e) => this._updateRow(i, 'picked', e.target.checked)} />
                </td>
                <td class="pick-col">
                  <input type="checkbox" .checked=${row.mandatory}
                         @change=${(e) => this._updateRow(i, 'mandatory', e.target.checked)} />
                </td>
                <td class="xmlpath-col">${row.xmlPath}</td>
                <td>
                  <input class="input is-small cell-input" .value=${row.s1Table1}
                         placeholder="Table" @input=${(e) => this._updateRow(i, 's1Table1', e.target.value)} />
                </td>
                <td>
                  <input class="input is-small cell-input" .value=${row.s1Field1}
                         placeholder="Field" @input=${(e) => this._updateRow(i, 's1Field1', e.target.value)} />
                </td>
                <td class=${this._hideTbl2 ? 'col-hidden' : ''}>
                  <input class="input is-small cell-input" .value=${row.s1Table2}
                         placeholder="Table 2" @input=${(e) => this._updateRow(i, 's1Table2', e.target.value)} />
                </td>
                <td class=${this._hideTbl2 ? 'col-hidden' : ''}>
                  <input class="input is-small cell-input" .value=${row.s1Field2}
                         placeholder="Field 2" @input=${(e) => this._updateRow(i, 's1Field2', e.target.value)} />
                </td>
                <td>
                  <textarea class="textarea is-small cell-sql" rows="1" spellcheck="false"
                            .value=${row.sql}
                            @input=${(e) => this._updateRow(i, 'sql', e.target.value)}></textarea>
                </td>
                <td class=${this._hideVal ? 'col-hidden' : ''}>${row.value}</td>
                <td class=${this._hideObs ? 'col-hidden' : ''}>
                  <textarea class="textarea is-small" rows="1" style="width:180px;" spellcheck="false"
                            .value=${row.observatii}
                            @input=${(e) => this._updateRow(i, 'observatii', e.target.value)}></textarea>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `
  }
}

customElements.define('xml-mapping-table', XmlMappingTable)
