import { html } from 'lit'
import { LightElement } from '@/light-element.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

/**
 * Displays formatted XML with syntax highlighting.
 * Usage: <xml-viewer .content=${xmlString}></xml-viewer>
 */
export class XmlViewer extends LightElement {
  static properties = {
    content: { type: String },
    _expanded: { state: true },
  }

  constructor() {
    super()
    this.content = ''
    this._expanded = false
  }

  _formatXml(xml) {
    if (!xml) return ''
    let formatted = ''
    let indent = ''
    const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/g)

    for (const part of parts) {
      if (!part.trim()) continue
      if (part.startsWith('</')) {
        indent = indent.slice(2)
        formatted += indent + part + '\n'
      } else if (part.startsWith('<') && part.endsWith('/>')) {
        formatted += indent + part + '\n'
      } else if (part.startsWith('<') && !part.startsWith('<?')) {
        formatted += indent + part + '\n'
        if (!part.includes('</')) indent += '  '
      } else if (part.startsWith('<?')) {
        formatted += part + '\n'
      } else {
        formatted += indent + part + '\n'
      }
    }
    return formatted.trim()
  }

  _highlightXml(xml) {
    const formatted = this._formatXml(xml)
    // Escape HTML entities first
    const escaped = formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    // Now colorize on the escaped string
    return escaped
      // Opening/closing tags:  &lt;tagName  or  &lt;/tagName
      .replace(/&lt;(\/?)([\w:-]+)/g,
        '<span class="bracket">&lt;$1</span><span class="tag-name">$2</span>')
      // Closing bracket &gt; and self-closing /&gt;
      .replace(/\/&gt;/g, '<span class="bracket">/&gt;</span>')
      .replace(/&gt;/g, '<span class="bracket">&gt;</span>')
      // Attributes:  name=&quot;value&quot;
      .replace(/([\w:-]+)=&quot;([^&]*?)&quot;/g,
        '<span class="attr-name">$1</span>=<span class="attr-value">&quot;$2&quot;</span>')
  }

  render() {
    if (!this.content) return html``
    return html`
      <button class="toggle" @click=${() => this._expanded = !this._expanded}>
        ${this._expanded ? '▼ Hide XML' : '▶ Show XML'}
      </button>
      ${this._expanded ? html`
        <pre>${unsafeHTML(this._highlightXml(this.content))}</pre>
      ` : ''}
    `
  }
}

customElements.define('xml-viewer', XmlViewer)
