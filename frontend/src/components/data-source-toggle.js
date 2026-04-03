import { html } from 'lit'
import { LightElement } from '@/light-element.js'

/**
 * Toggle between S1 API and Direct DB data source.
 * Fires 'source-changed' event with detail: { source: 's1' | 'direct' }
 */
export class DataSourceToggle extends LightElement {
  static properties = {
    source: { type: String, reflect: true },
  }

  constructor() {
    super()
    this.source = 's1'
  }

  _setSource(src) {
    this.source = src
    this.dispatchEvent(new CustomEvent('source-changed', {
      detail: { source: src },
      bubbles: true, composed: true,
    }))
  }

  render() {
    return html`
      <span class="label">Data:</span>
      <div class="toggle-group">
        <button class=${this.source === 's1' ? 'active' : ''} @click=${() => this._setSource('s1')}>S1 API</button>
        <button class=${this.source === 'direct' ? 'active' : ''} @click=${() => this._setSource('direct')}>Direct DB</button>
      </div>
    `
  }
}

customElements.define('data-source-toggle', DataSourceToggle)
