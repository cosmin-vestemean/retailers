import { LitElement, html, css } from 'lit'
import { sharedStyles } from '@/styles/shared-styles.js'
import '@/components/orders-log-table.js'

export class LogsPage extends LitElement {
  static styles = [sharedStyles, css`
    :host { display: block; }
  `]

  render() {
    return html`
      <div class="section">
        <h1 class="has-text-weight-bold mb-4" style="font-size:1.5rem;">Logs</h1>
        <orders-log-table></orders-log-table>
      </div>
    `
  }
}

customElements.define('logs-page', LogsPage)
