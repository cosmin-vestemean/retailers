function normalizeOptions(optionsOrUrl, maybeApp) {
  if (typeof optionsOrUrl === 'string' || optionsOrUrl == null) {
    return { url: optionsOrUrl, app: maybeApp }
  }
  return optionsOrUrl
}

export function resolveS1BaseUrl(optionsOrUrl, maybeApp) {
  const { url, app } = normalizeOptions(optionsOrUrl, maybeApp)
  const raw = url || app?.get?.('s1BaseUrl') || process.env.S1_BASE_URL
  if (!raw) {
    throw new Error('S1 base URL is not configured. Set S1_BASE_URL or app config s1BaseUrl.')
  }
  return String(raw).replace(/\/+$/, '')
}

export function buildS1Url(pathname = '', optionsOrUrl, maybeApp) {
  const base = resolveS1BaseUrl(optionsOrUrl, maybeApp)
  if (!pathname) return base
  return `${base}/${String(pathname).replace(/^\/+/, '')}`
}