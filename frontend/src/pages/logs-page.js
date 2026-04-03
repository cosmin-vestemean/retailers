import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import '@/components/orders-log-table.js'

export class LogsPage extends LightElement {

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
