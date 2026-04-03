import { html } from 'lit'
import { LightElement } from '@/light-element.js'

/**
 * Usage:
 *   const toast = document.querySelector('notification-toast')
 *   toast.show('Mesaj trimis!', 'is-success')   // is-info | is-success | is-warning | is-danger
 *
 * Or from any Lit component:
 *   this.dispatchEvent(new CustomEvent('show-toast', {
 *     detail: { message: 'Done!', type: 'is-success' },
 *     bubbles: true, composed: true,
 *   }))
 *
 * <app-shell> listens for 'show-toast' and forwards to this component.
 */
export class NotificationToast extends LightElement {
  static properties = {
    _toasts: { state: true },
  }

  constructor() {
    super()
    this._toasts = []
    this._id = 0
  }

  show(message, type = 'is-info', duration = 5000) {
    const id = ++this._id
    this._toasts = [...this._toasts, { id, message, type }]

    setTimeout(() => this._remove(id), duration)
  }

  _remove(id) {
    // Mark as removing for exit animation
    this._toasts = this._toasts.map(t =>
      t.id === id ? { ...t, removing: true } : t
    )
    // Actually remove after animation
    setTimeout(() => {
      this._toasts = this._toasts.filter(t => t.id !== id)
    }, 300)
  }

  render() {
    return html`
      ${this._toasts.map(t => html`
        <div class="toast ${t.type} ${t.removing ? 'removing' : ''}">
          <button class="close" @click=${() => this._remove(t.id)}>&times;</button>
          ${t.message}
        </div>
      `)}
    `
  }
}

customElements.define('notification-toast', NotificationToast)
