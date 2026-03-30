import { LitElement, html, css } from 'lit'

/**
 * Toggle between S1 API and Direct DB data source.
 * Fires 'source-changed' event with detail: { source: 's1' | 'direct' }
 */
export class DataSourceToggle extends LitElement {
  static properties = {
    source: { type: String, reflect: true },
  }

  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 0.5rem; }
    .toggle-group {
      display: inline-flex; border: 1px solid #dbdbdb; border-radius: 4px; overflow: hidden;
    }
    button {
      padding: 0.35em 0.75em; border: none; background: #fff; cursor: pointer;
      font-size: 0.8rem; color: #666; transition: all 0.15s;
    }
    button + button { border-left: 1px solid #dbdbdb; }
    button.active { background: #3e8ed0; color: #fff; }
    button:hover:not(.active) { background: #f5f5f5; }
    .label { font-size: 0.8rem; color: #888; }
  `

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
