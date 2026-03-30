import { LitElement, html, css } from 'lit'

/**
 * Displays formatted XML with syntax highlighting.
 * Usage: <xml-viewer .content=${xmlString}></xml-viewer>
 */
export class XmlViewer extends LitElement {
  static properties = {
    content: { type: String },
    _expanded: { state: true },
  }

  static styles = css`
    :host { display: block; }
    pre {
      background: #1e1e1e; color: #d4d4d4; padding: 1rem;
      border-radius: 6px; overflow: auto; max-height: 400px;
      font-size: 0.8rem; line-height: 1.5; font-family: 'Consolas', 'Monaco', monospace;
      margin: 0; white-space: pre-wrap; word-break: break-all;
    }
    .tag-name { color: #569cd6; }
    .attr-name { color: #9cdcfe; }
    .attr-value { color: #ce9178; }
    .bracket { color: #808080; }
    .text-content { color: #d4d4d4; }
    .toggle {
      background: transparent; border: 1px solid #dbdbdb; border-radius: 4px;
      padding: 0.25em 0.5em; cursor: pointer; font-size: 0.75rem; color: #666;
      margin-bottom: 0.25rem;
    }
    .toggle:hover { border-color: #999; }
  `

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
    return formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;(\/?[\w:-]+)/g, '<span class="bracket">&lt;</span><span class="tag-name">$1</span>')
      .replace(/&gt;/g, '<span class="bracket">&gt;</span>')
      .replace(/([\w:-]+)=(&quot;|")(.*?)(\2)/g,
        '<span class="attr-name">$1</span>=<span class="attr-value">"$3"</span>')
  }

  render() {
    if (!this.content) return html``
    return html`
      <button class="toggle" @click=${() => this._expanded = !this._expanded}>
        ${this._expanded ? '▼ Hide XML' : '▶ Show XML'}
      </button>
      ${this._expanded ? html`
        <pre .innerHTML=${this._highlightXml(this.content)}></pre>
      ` : ''}
    `
  }
}

customElements.define('xml-viewer', XmlViewer)
