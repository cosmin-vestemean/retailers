import { html } from 'lit'
import { LightElement } from '@/light-element.js'

/**
 * Shows batch operation progress.
 * Usage:
 *   const bp = this.querySelector('batch-progress')
 *   bp.start(total)
 *   bp.advance('Sending order X...')
 *   bp.finish('All done!')
 */
export class BatchProgress extends LightElement {
  static properties = {
    _total:    { state: true },
    _current:  { state: true },
    _message:  { state: true },
    _active:   { state: true },
    _log:      { state: true },
  }

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
