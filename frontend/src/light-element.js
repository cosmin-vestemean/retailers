import { LitElement } from 'lit'

/**
 * Base class that renders into the light DOM instead of Shadow DOM.
 * All components extend this so that a single global stylesheet
 * controls the visual appearance of the entire app.
 */
export class LightElement extends LitElement {
  createRenderRoot() {
    return this
  }
}
