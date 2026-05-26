import { docProcessProvider } from './docprocess.provider.js'
import { infiniteProvider } from './infinite.provider.js'

const REGISTRY = {
  docprocess: docProcessProvider,
  infinite: infiniteProvider
}

// Fallback while CCCEDIPROVIDER.CODE is being populated in production.
const NAME_FALLBACK = {
  'DocProcess': 'docprocess',
  'Infinite Edinet': 'infinite'
}

/**
 * Resolve a provider from a CCCEDIPROVIDER row.
 * Prefers CODE; falls back to NAME mapping.
 *
 * @param {{CODE?:string, NAME?:string}} ediProviderRow
 * @returns {import('./provider.interface.js').EdiProvider}
 */
export function getProvider(ediProviderRow) {
  const code = (ediProviderRow.CODE || NAME_FALLBACK[ediProviderRow.NAME] || '').toLowerCase()
  const provider = REGISTRY[code]
  if (!provider) {
    throw new Error(`Unknown EDI provider: CODE=${ediProviderRow.CODE} NAME=${ediProviderRow.NAME}`)
  }
  return provider
}
