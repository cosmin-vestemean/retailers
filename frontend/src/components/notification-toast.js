import { LitElement, html, css } from 'lit'

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
export class NotificationToast extends LitElement {
  static properties = {
    _toasts: { state: true },
  }

  static styles = css`
    :host {
      position: fixed; top: 1rem; right: 1rem; z-index: 10000;
      display: flex; flex-direction: column; gap: 0.5rem;
      pointer-events: none; max-width: 400px;
    }
    .toast {
      pointer-events: auto;
      padding: 0.85rem 2.5rem 0.85rem 1rem;
      border-radius: 6px; font-size: 0.95rem;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
      animation: slideIn 0.35s ease-out;
      position: relative;
    }
    .toast.removing { animation: slideOut 0.3s ease-in forwards; }
    .close {
      position: absolute; top: 0.5rem; right: 0.5rem;
      background: transparent; border: none; cursor: pointer;
      font-size: 1.1rem; line-height: 1; color: inherit; opacity: 0.7;
    }
    .close:hover { opacity: 1; }

    .is-info    { background: #eff5fb; color: #296fa8; }
    .is-success { background: #effaf5; color: #257953; }
    .is-warning { background: #fffaeb; color: #946c00; }
    .is-danger  { background: #feecf0; color: #cc0f35; }

    @keyframes slideIn  { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `

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
