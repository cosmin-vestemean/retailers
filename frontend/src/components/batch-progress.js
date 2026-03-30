import { LitElement, html, css } from 'lit'

/**
 * Shows batch operation progress.
 * Usage:
 *   const bp = this.shadowRoot.querySelector('batch-progress')
 *   bp.start(total)
 *   bp.advance('Sending order X...')
 *   bp.finish('All done!')
 */
export class BatchProgress extends LitElement {
  static properties = {
    _total:    { state: true },
    _current:  { state: true },
    _message:  { state: true },
    _active:   { state: true },
    _log:      { state: true },
  }

  static styles = css`
    :host { display: block; }
    .wrapper { background: #f5f5f5; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; }
    .bar-container {
      background: #dbdbdb; border-radius: 4px; height: 20px; overflow: hidden;
      margin-bottom: 0.5rem;
    }
    .bar {
      background: #3e8ed0; height: 100%; border-radius: 4px;
      transition: width 0.3s ease;
    }
    .bar.done { background: #48c78e; }
    .message { font-size: 0.85rem; color: #666; }
    .log { max-height: 120px; overflow: auto; font-size: 0.8rem; color: #555; margin-top: 0.5rem; }
    .log div { padding: 0.1rem 0; border-bottom: 1px solid #eee; }
  `

  constructor() {
    super()
    this._total = 0
    this._current = 0
    this._message = ''
    this._active = false
    this._log = []
  }

  get percent() {
    return this._total ? Math.round((this._current / this._total) * 100) : 0
  }

  start(total) {
    this._total = total
    this._current = 0
    this._message = `0 / ${total}`
    this._active = true
    this._log = []
  }

  advance(msg) {
    this._current++
    this._message = msg || `${this._current} / ${this._total}`
    this._log = [...this._log, msg]
  }

  finish(msg) {
    this._message = msg || 'Complete!'
    this._active = false
  }

  render() {
    if (!this._active && this._total === 0) return html``
    const done = !this._active && this._current >= this._total
    return html`
      <div class="wrapper">
        <div class="bar-container">
          <div class="bar ${done ? 'done' : ''}" style="width:${this.percent}%"></div>
        </div>
        <div class="message">${this._message}</div>
        ${this._log.length ? html`
          <div class="log">${this._log.map(l => html`<div>${l}</div>`)}</div>
        ` : ''}
      </div>
    `
  }
}

customElements.define('batch-progress', BatchProgress)
