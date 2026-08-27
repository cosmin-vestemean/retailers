# SoftOne text encoding mojibake — two distinct bugs, same symptom

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

## Bug 2 (read path, different root cause): S1 object-layer errors (GETLASTERROR) — fixed 2026-08-27

Business-rule validation errors from `X.CreateObj(...).GETLASTERROR` (e.g. `RECADV.js`
`createInvoiceFromReception`) came back as `??????`/`�` garbage — **not** a `sanitizeForS1` issue
(that function only ever touches Latin diacritics, never Greek text). Root cause verified with a
raw `fetch` + hex dump against `/JS/RECADV/createInvoiceFromReception`: SoftOne's HTTP response
declares `Content-Type: application/json; charset=windows-1253`, and the JSON body bytes really
are windows-1253 (hex `d0f1dd...` decodes correctly only as windows-1253, e.g. "Πρέπει να
δοθεί ο αριθμός του παραστατικού", i.e. "the document number must be provided").

The bug is entirely on our side: the WHATWG Fetch spec's `response.text()`/`.json()` **always
UTF-8-decode regardless of the declared charset**, so any S1 endpoint returning non-ASCII in a
non-UTF-8 declared charset gets mangled by every naive `await response.json()` caller.

**Fix**: `parseS1Json()` in `src/s1-response.js` now reads `Content-Type`'s `charset=`, and for
anything other than utf-8 decodes `response.arrayBuffer()` via `new TextDecoder(charset)` instead
of `response.text()` (falls back to `.text()` if the response has no `.headers`/`.arrayBuffer`,
keeping old test mocks working, and if the charset label is unsupported). This fixes every
`parseS1Json` caller at once (`order-builder.js`, `order-sender.js`, `CCCSFTPXML.class.js`,
`recadv.class.js`, `set-document.class.js`) — same "fix at the chokepoint" pattern as
`sanitizeForS1`. Covered by `test/s1-response.test.js` using the real captured bytes.

**Caveat**: ~18 other service classes still call `response.json()` directly (not through
`parseS1Json`) and would have the same latent bug if S1 ever returns non-ASCII through them — not
fixed, out of scope unless it actually reproduces there too.
