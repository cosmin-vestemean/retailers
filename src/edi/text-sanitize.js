// Diacritics (ă/â/î/ș/ț), em/en dashes and arrows get corrupted (mojibake) once persisted
// through SoftOne's text/SQL pipeline (RUNSQL params, setData). Strip them before any
// write to a SoftOne-backed field (XMLERROR, MESSAGETEXT, ...) so stored text stays legible.
export function sanitizeForS1(text) {
  if (text === null || text === undefined) return text
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[—–]/g, '-')
    .replace(/[→↔]/g, '->')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}
