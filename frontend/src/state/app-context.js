/**
 * Application-wide reactive state using Lit Context.
 *
 * Provides:
 *  - currentUser  (object | null)
 *  - token        (string | null)
 *  - currentTrdr  (string | null) — selected retailer TRDR
 *  - dataSource   ('s1' | 'direct')
 */
import { createContext } from '@lit/context'

// ---- Context keys ----

export const userContext = createContext('user')
export const tokenContext = createContext('token')
export const trdrContext = createContext('trdr')
export const dataSourceContext = createContext('dataSource')

// ---- Retailer static data ----

export const RETAILERS = [
  { trdr: '11639', name: 'eMAG',       logo: 'https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg' },
  { trdr: '12349', name: 'Kaufland',   logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Kaufland_201x_logo.svg' },
  { trdr: '78631', name: 'Supeco',     logo: 'https://www.supeco.ro/wp-content/uploads/2018/07/Asset-1.svg' },
  { trdr: '11322', name: 'Carrefour',  logo: 'https://cdn-static.carrefour.ro/unified/assets/images/dist/logo/default/carrefour.png' },
  { trdr: '12664', name: 'Metro',      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Logo_METRO.svg' },
  { trdr: '38804', name: 'Mega Image', logo: 'https://static.mega-image.ro/static/next/images/logo_header_mega-image.svg' },
  { trdr: '11654', name: 'Dedeman',    logo: 'https://cdn.dedeman.ro/static/version1718221031/frontend/Dedeman/white/ro_RO/images/logo.svg' },
]
