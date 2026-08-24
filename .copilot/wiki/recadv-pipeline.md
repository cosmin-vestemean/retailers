# RECADV pipeline — feature architecture & status

Current-state summary of the RECADV (reception advice confirmation) feature: how it's built, what
stage it's in, and where the code lives. For the real XML format and business rules see
[recadv-xml-format.md](recadv-xml-format.md); for the reception screen UI and its buttons see
[reception-screen.md](reception-screen.md). This page is the middle layer: pipeline code
structure and rollout status, condensed from the implementation arc (originally phases F1-F7).

## Status: LIVE

RECADV ingestion and reconciliation run in production on `retailers4` since 2026-08-05
(`EDI_ENABLE_RECADV=true`), scanning every 5 minutes alongside orders/APERAK. The Recepții tab is
in daily use by the beneficiary. The end-to-end chain is proven live: reconciliation said
"conform" -> the operator invoiced an advice manually -> the screen flipped it to Facturat.

## Implementation arc (F1-F7), condensed

1. **F1 — parser.** `infiniteProvider.parseRecadv(xml)` in
   `src/edi/providers/infinite.provider.js`. Returns `{ documentNumber, buyerGln, trdr, orders,
   adviceRaw, adviceSuffixes, adviceTruncated, items, numberOfItems, numberOfDocuments, raw }`.
   `trdr` resolves via a `RETAILER_GLNS` map (GLN -> TRDR), separate from `RETAILER_PREFIXES` used
   for filename-prefix routing on `orders`/`retann` — RECADV filenames are purely numeric and
   route by GLN instead. Format details in
   [recadv-xml-format.md](recadv-xml-format.md).
2. **F2 — reconciliation engine.** `src/edi/recadv-reconciler.js`, exports
   `reconcileRecadv({ documents, lookup })`. Soft1 access is **injected** as a narrow two-method
   `lookup` seam (`findAdvices({trdr,suffixes,orders})`, `findAdviceLines({findocs})`), so the
   module is fully offline-testable and builds no SQL itself. Every value is validated as numeric
   before reaching `lookup`. Statuses `clean > difference > unresolved > blocked` (fail-closed
   precedence — `blocked`/`unresolved` win). Per-reception shape: `status`, `resolvedBy`, `files`,
   `advices`, `lines` (`shipped`/`accepted`/`delta`/`omittedFromReceipt`), `blockedLines`,
   `differenceLines`, `unresolvedLines`, `missingOnReceipt`, `gtinMismatches`, `palletLines`.
   `delta = shipped - accepted`: positive is a real shortage, negative is physically impossible
   (duplicate-document-number-family case, see below) and routes to a human.
3. **F3 — ingestion, deliberately parked behind a flag.** `docTypes` on `infiniteProvider` is a
   **getter gated on `EDI_ENABLE_RECADV`** (only the literal string `'true'`), so merging the code
   didn't instantly start `LIST`/`RETR` on `/recadv` — that FTP access is exactly what had set the
   Edinet portal's read-flag once before (see incident below). Scanner exports `insertRecadvRow`,
   terminal status `INGESTED` (never becomes a Soft1 order — `processPendingOrders` explicitly
   filters `doctype:'ORDERS'`). `do-retry.js` got a `RECADV` branch (`retryRecadvObject`) so a
   failed insert doesn't park forever.
4. **F4 — Soft1 read layer.** `S1/JS/AJS/RECADV.js`, 5 functions: `getAdvicesByCode`,
   `getAdvicesByOrder`, `getAdviceLines`, `getReceptionsData`, `getRecadvDocuments`. Implements the
   reconciler's `lookup` seam plus the paginated screen data source. ES5,
   `//Cod specific S1 - AJS`. **Every `STRING_SPLIT` list parameter must be the first-appearing
   placeholder, wrapped `CAST(:1 AS VARCHAR(MAX))`** — Soft1 binds by order of appearance in the
   SQL text, not by `:N`, and infers `int` for an all-digit string otherwise. Invoiced-state
   predicate is `SALFPRMS.TFPRMS = 103` (see [soft1-schema-facts.md](soft1-schema-facts.md)),
   never `FPRMS=712` (that's Auchan-only; Dedeman invoices on `FPRMS=716`).
5. **F5 — Feathers proxy.** `src/services/recadv/{recadv.class.js,recadv.service.js}`. Assembles
   the reconciler's `lookup` from the AJS endpoints (deduped by `FINDOC`), runs `reconcileRecadv`,
   merges per-reception status onto the **paginated advice list from `getReceptionsData`** (that
   list, not the reconciler's own grouping, is the screen's data source — advices with no matching
   reception get `status:'not_received'`).
6. **F6 — UI.** `frontend/src/components/reception-table.js`, wired into
   `frontend/src/pages/retailer-detail.js` as a **Recepții** tab between Comenzi and Facturi,
   gated to `RECADV_RETAILERS = ['11654','13248']` (Dedeman, Auchan). Full button/column spec in
   [reception-screen.md](reception-screen.md).
7. **F7 — live FTP coupling.** `EDI_ENABLE_RECADV=true` flipped on `retailers4` 2026-08-05
   (Heroku v132). One-line config change, not a deploy, by design (see F3). This is the
   **point of no return** for the Edinet portal read-flag (see incident below).

## Config

- `EDI_ENABLE_RECADV` — literal string `'true'` (case-insensitive) enables RECADV in
  `infiniteProvider.docTypes`. Currently **on** on `retailers4`. Unset/false rolls back cleanly —
  `INGESTED` rows are inert; `DELETE FROM CCCSFTPXML WHERE EDIDOCTYPE='RECADV'` for a clean reset.
- `EDI_DOWNLOAD_AGE_DAYS` (default 7) — first scan after enabling only fetches files modified in
  that window; older files need a temporary bump or manual seeding
  (`scripts/seed-recadv-corpus.mjs`, idempotent by filename, no FTP access).

## Resolved incidents (do not re-diagnose)

- **Edinet portal read-flag incident (2026-08-05), closed.** The beneficiary's Edinet portal
  worklist started showing every receipt advice as "citit", because research `RETR`/`LIST` calls
  against the **production** Infinite account (21/27/28 July, before F7 was ever live) tripped a
  portal-side seen-flag — `RETR` itself is non-consuming (proven twice), the flag is a separate
  side effect of FTP access. Production code was innocent at the time. Since F7 shipped, the
  scanner touches the account by design and the Recepții screen is now the replacement worklist —
  the portal's own worklist is permanently not useful anymore, which was the point of building this.
- **Extensionless-filename ingestion bug (2026-08-05), fixed and deployed same day.** Real
  Infinite `/recadv` filenames are **bare numeric IDs with no extension**; `isXmlLikeFile()`
  required `.xml`/`.confirm` and silently dropped ~85-88 of 115 live files — effectively 100% of
  Auchan's traffic (a short-lived Dedeman rename to `DEDEMAN_RECADV_*.xml` masked the same bug for
  Dedeman). Fixed by making the extension check docType-aware in `src/edi/scanner.js`: `orders`/
  `aperak` still require `.xml`/`.confirm`; `recadv`/`retann` accept anything except `.zip`/`.tmp`/
  `.log`. Verified live: Auchan RECADV rows 23 -> 40 same day. **Do not re-tighten this filter**
  without re-verifying real filenames first.
- **Shared-directory guard (2026-08-05).** Both Infinite config rows (Dedeman, Auchan) point at
  the same `/recadv` directory, so an unfiltered doc type was being `LIST`ed twice per cycle on
  the one account whose access sets the portal read-flag. Fixed: the scanner skips a repeat
  `LIST` only when `filenamePrefixes` is empty for that doc type — `/orders` still scans per
  prefix (contract locked by `test/edi/provider-contract.test.js`).
- **Model change — score every advice line, including omitted ones (2026-08-05).** Full detail
  in [reception-screen.md](reception-screen.md#model-change-score-every-advice-line-implemented-2026-08-05)
  — cross-linked here only because it changed the reconciler's own output shape
  (`omittedFromReceipt` flag). Do not duplicate the write-up; that page owns it.

## Known ongoing pattern (not a bug, needs an external answer)

**Duplicate document-number families.** Infinite re-sends the same advice under two document
numbers from different families (`5017…` plus one of `4600…`/`2200…`/`5900…`/`1285…`/`7900…`).
Summing both reports yields `accepted > shipped`, physically impossible, so the hard guard blocks
and routes to a human rather than auto-generating a `9221`. Confirmed recurring, not a corpus
artefact — open question asked of Infinite via the beneficiary, unanswered as of 2026-08-24. See
`open-threads.md` entry `edinet-duplicate-document-number-families` for the running tally of cases.

## Remaining open item

**Multi-file temporal risk**, deliberately deferred: a reception confirmed by more than one RECADV
file over several days will show a false full-shortage for lines the *first* file omits, until the
second file arrives and the model has no date data yet to add a grace period
(`findAdvices`/`findAdviceLines`/`parseRecadv` carry no dates — needs new plumbing, not a guess).
Measured frequency: 4-6 of ~195 receptions (~3%). Full detail in
[reception-screen.md](reception-screen.md).

## RETANN — separate flow, still blocked

RETANN (return-goods notices) uses the same transport/scanner plumbing but is **not enabled**
pending Infinite ticket RO-7627 (order number missing from the XML). See
[retann.md](retann.md) for the full business/format writeup — do not duplicate it here.

## Code pointers
- `src/edi/providers/infinite.provider.js` — `parseRecadv`, `RETAILER_GLNS`, `docTypes` getter.
- `src/edi/recadv-reconciler.js` — reconciliation engine, `lookup` contract.
- `src/edi/scanner.js` — `insertRecadvRow`, `isXmlLikeFile(fileName, docType)`.
- `src/edi/do-retry.js` — `retryRecadvObject` branch.
- `S1/JS/AJS/RECADV.js` — the 5 Soft1-side endpoints (must be copied into ERP AJS after any edit).
- `src/services/recadv/{recadv.class.js,recadv.service.js}` — Feathers proxy.
- `frontend/src/components/reception-table.js`, `frontend/src/pages/retailer-detail.js` — UI.
- `scripts/seed-recadv-corpus.mjs` — no-FTP seeding tool for testing before/around F7.

## See also
- [recadv-xml-format.md](recadv-xml-format.md) — XML format, resolution rule, business rules.
- [reception-screen.md](reception-screen.md) — UI spec, buttons A/B/C, live measurements.
- [edi-pipeline-architecture.md](edi-pipeline-architecture.md) — the general pipeline this feature
  is built on.
- [retann.md](retann.md) — the sibling, still-blocked return-flow feature.
