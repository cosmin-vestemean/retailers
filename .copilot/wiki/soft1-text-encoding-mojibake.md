# SoftOne text persistence mangles non-ASCII chars (fixed 2026-08-10)

## Symptom
Text stored via SoftOne (`XMLERROR` on `CCCSFTPXML`, `MESSAGETEXT` on `CCCORDERSLOG`) comes back
with "�" or dropped/substituted characters — em dash "—" became "�", "ț" became "?", "ă" got
silently stripped to "a" ("către" -> "catre"). Only affects text that round-trips through S1
(RUNSQL params / setData); frontend-only literal strings (never persisted) render fine since they
never leave the Node<->browser UTF-8 path.

## Root cause
SoftOne's text/SQL layer (Greek-market ERP, several endpoints documented as ISO-8859-7) does not
reliably round-trip Unicode outside its own codepage — em dash, arrows, and Romanian comma-below
diacritics (ș U+0219 / ț U+021B) get corrupted or dropped somewhere in RUNSQL param binding or the
request body parsing on the ERP side. This is an ERP-side limitation, not something fixable from
this repo's AJS/Node code without a deeper base64 round-trip (not attempted — too invasive for the
payoff).

## Fix
Added `sanitizeForS1()` in `src/edi/text-sanitize.js` (NFD-normalize + strip combining diacritics +
fold em/en dash to "-", arrows to "->", curly quotes to straight). Applied at the two SoftOne write
choke points, not scattered across call sites:
- `src/services/CCCSFTPXML/CCCSFTPXML.class.js` `patch()` — sanitizes `XMLERROR`.
- `src/services/orders-log/orders-log.class.js` `create()` — sanitizes `MESSAGETEXT`.

This covers every current and future caller (order-builder.js, order-sender.js, scanner.js, legacy
sftp.class.js) without needing per-message changes. Message-building code (e.g.
`formatMappingErrorMessage` in order-builder.js) keeps writing proper Romanian text with
diacritics/em dash — sanitization happens only at the persistence boundary.

## Caveat
Only fixes NEW log/error rows going forward. Already-corrupted historical rows in
`CCCSFTPXML.XMLERROR` / `CCCORDERSLOG.MESSAGETEXT` stay garbled until overwritten naturally (no
retroactive cleanup was requested/done).
