export const SCANNER_DISABLED_REASON = 'ENABLE_SFTP_SCANNER=false'

export function isScannerEnabled(env = process.env) {
  return String(env.ENABLE_SFTP_SCANNER ?? 'false').toLowerCase() === 'true'
}

export function getEdiScannerMode(env = process.env) {
  return String(env.EDI_SCANNER ?? 'new').toLowerCase()
}

export function disabledEdiScanStats() {
  return {
    providers: 0,
    downloaded: 0,
    inserted: 0,
    duplicates: 0,
    processed: 0,
    failed: 0,
    errors: [],
    disabled: true,
    reason: SCANNER_DISABLED_REASON
  }
}

export function disabledScanControlResult() {
  return {
    started: false,
    disabled: true,
    reason: SCANNER_DISABLED_REASON
  }
}