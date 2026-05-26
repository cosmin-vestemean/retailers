/**
 * Test-mode safety: when NODE_ENV='test' or EDI_FORCE_LOCAL_HOSTS=1,
 * every transport host must resolve to a loopback address.
 *
 * This makes it physically impossible for the scanner — invoked from a test
 * harness or mocha — to dial out to production endpoints (ftp.infinite.pl,
 * dx.doc-process.com) and consume real XMLs.
 *
 * Bypass for explicit prod runs: leave NODE_ENV unset or set EDI_ALLOW_PRODUCTION_HOSTS=1.
 */
const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost'])

export function assertSafeHost(host) {
  const forceLocal =
    process.env.NODE_ENV === 'test' || process.env.EDI_FORCE_LOCAL_HOSTS === '1'
  if (!forceLocal) return
  if (process.env.EDI_ALLOW_PRODUCTION_HOSTS === '1') return
  if (!LOOPBACK.has(String(host || '').toLowerCase())) {
    throw new Error(
      `[edi-safety] refusing non-loopback host "${host}" in test mode. ` +
        'Set EDI_ALLOW_PRODUCTION_HOSTS=1 to override.'
    )
  }
}
