const DEFAULT_S1_BASE_URL = 'https://petfactory.oncloud.gr/s1services'

export function resolveS1BaseUrl(url) {
  const raw = url || process.env.S1_BASE_URL || DEFAULT_S1_BASE_URL
  return String(raw).replace(/\/+$/, '')
}

export function buildS1Url(pathname = '', baseUrl) {
  const base = resolveS1BaseUrl(baseUrl)
  if (!pathname) return base
  return `${base}/${String(pathname).replace(/^\/+/, '')}`
}