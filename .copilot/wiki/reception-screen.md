# Reception screen (Recepții) — RECADV reconciliation and invoicing

**This is a LIVING page.** Parts of it (button B) are still mid-design — keep the "Open work"
sections honest about what is analysis-only vs. implemented, don't present unfinished design as done.

## Status overview (as of 2026-08-27)
- **Model change (score every advice line, incl. omitted ones): IMPLEMENTED** 2026-08-05.
- **Item A ("Trimite" button): DONE for DocProcess, BLOCKED for Infinite.** UI implemented;
  backend send-path bugs (transport, signing, credentials, series) fixed 2026-08-27 — see the
  dated notes in section A. Infinite sending needs a new dedicated invoice-XML builder (wrong
  schema entirely, not a field-validation issue) — full plan:
  [infinite-invoice-format.md](infinite-invoice-format.md).
- **Item B ("Facturează" button): IMPLEMENTED and verified live 2026-08-27.** See the dated note
  inside section B for the conversion-only series fix that unblocked it.
- **Item C (invoice identity column): approved, spec below, NOT yet implemented.**
- Also pending: revert an over-correction in `invoice-table.js` (see bottom).

## Model change: score every advice line (IMPLEMENTED 2026-08-05)

`src/edi/recadv-reconciler.js` now scores every shipped advice line. A line the retailer never
mentions is pushed into `lines` (and `differenceLines` when it produces a positive delta) with
`accepted: 0`, `delta: shipped`, and `omittedFromReceipt: true`; explicitly-scored lines carry
`omittedFromReceipt: false`. `missingOnReceipt` is kept, unchanged in shape (`{retailerCode,
shipped}`), as a reporting/back-compat view of the same set — the frontend (`reception-table.js`)
still renders it as-is. Status worsens to `difference` when an omitted line has `shipped > 0` (same
severity as an explicit shortage; `blocked`/`unresolved` still take precedence — see
`STATUS_SEVERITY`). Tests in `test/edi/recadv-reconciler.test.js` were updated: the old "reports
advice lines missing from the receipt without scoring them" test (asserted `CLEAN`) was replaced
with "scores an advice line the retailer omitted as a full shortage, flagged omittedFromReceipt"
(asserts `DIFFERENCE` + the new line shape); the "reports a shortage as a per-line difference"
assertion now includes `omittedFromReceipt: false`.

### Why this change was needed
**Beneficiary decision, Sorin Fliundra 2026-08-05.** Confirmed as a real defect, not a preference.
Previously `reconcileRecadv` iterated only the RECADV's accepted items; advice lines the retailer
never mentioned landed in `missingOnReceipt` and were deliberately not scored — a systematic blind
spot that would invoice the full shipped quantity for goods the retailer never received.

**Proof case**: advice `AEX-AE-053715` has 9 lines. Sorin reported TWO products rejected at
reception: line 2 `PF.00133` (7,968) and line 3 `PF.00130` (7,728). The engine reported only ONE
difference — `340171` = `PF.00130`, 7728/1392 — because `PF.00133` was absent from the RECADV
entirely and therefore never scored.

**Measured blind-spot size before the fix** (2026-08-05, session N+18, live production read-only):
across all 207 ingested RECADV documents at the time (Dedeman 167, Auchan 40), 195 receptions
(185 clean / 4 difference / 2 unresolved / 4 blocked) had **76 unscored `missingOnReceipt` advice
lines across 6 of 195 receptions (3%), totalling 10,578 shipped units invisible to the old model.**
The `AEX-AE-053715` case above went from a reported 6,336-unit shortfall to a real **14,304 units
across 2 lines** once omitted lines are scored. A second case, reception `11654|2173341` (advice
`AEX-AE-053657`, the truncated `/AE` document number), had 49 unscored lines totalling 1,248 units.

### Deliberately NOT implemented in this pass (still open)
1. **Multi-file temporal risk** — no grace period or "în curs" status was added. The reconciler has
   no date data available (`findAdvices`/`findAdviceLines` don't return dates, and `parseRecadv`
   doesn't extract `DocumentIssueDate`), so a real fix needs new plumbing, not a guess. Until then, a
   reception whose second confirming file hasn't arrived yet will show a false `difference` for the
   omitted lines. Frequency in the corpus: 4-6 of ~195 receptions (~3%).
2. Descriptions are `undefined` on omitted lines (`getAdviceLines` in `RECADV.js` doesn't select
   `MTRL.NAME`) — cosmetic only, not scored.
3. **Fold the blind-spot measurement (76 lines / 10,578 units / 6 receptions) into the beneficiary
   report/email** — re-running `reconcileRecadv()` live post-deploy shows the corrected (larger)
   shortage numbers, which the beneficiary should be told to expect.

## A. "Trimite" button in the Recepții actions column — IMPLEMENTED

Same behaviour as the Facturi tab send: `getInvoiceDom` -> `uploadInvoice` -> `markDocumentSent`,
shared via `sendInvoiceXml()` in `frontend/src/services/api.js` (both `invoice-table.js` and
`reception-table.js` call it — no duplicated ~50-line copy, per the original spec below).

- **Only render it where an invoice exists.** On „Nu" rows there is nothing to send.
- **Must reflect sent state** — `Trimite` / `Retrimite` / already-sent badge. There is **no
  duplicate guard on the invoice flow** (unlike orders, which have `duplicateGuard` in
  `order-sender.js`), so a blind button would let the operator send twice.

### BUG FOUND AND FIXED 2026-08-27: backend send-path ignored CCCEDIPROVIDER.CONNTYPE

The frontend/shared-helper part above was already implemented and matched spec — the docs here
were stale. What was actually broken (and never caught, because it was never exercised): the
backend `src/services/edi-invoices/edi-invoices.class.js` hardcoded `ssh2-sftp-client` for
**every** retailer, regardless of `CCCEDIPROVIDER.CONNTYPE`.

- **DocProcess (CONNTYPE=1, real SFTP, private key in `CCCSFTP.PRIVATEKEY`): worked by accident**
  — the hardcoded assumption happened to match reality. Measured: 125/410 invoices sent via the
  app in the last 60 days.
- **Infinite (CONNTYPE=4, plain FTP on `ftp.infinite.pl:21`, no private key): always broken.**
  The code tried an SSH2 handshake against an FTP-only port. Measured: **0/616** Infinite
  invoices ever sent via the app in 60 days — matches the earlier "0 of 521 in 60 days" finding,
  now root-caused instead of just observed.
- One more stacked bug on the Infinite path: it uploaded to raw `CCCSFTP.INITIALDIROUT`
  (`/` for Infinite) instead of the provider's real `/invoice/` subdirectory.
- **Verified read-only against both live servers** (LIST only, no writes) before fixing: both
  `CCCSFTP` rows are structurally correct (`ftp.infinite.pl` really has `/invoice/` with
  `archive/confirm/duplicate/error/logs/omit/temp` subfolders and files land directly under
  `/invoice/`; `dx.doc-process.com` `INITIALDIRIN`/`INITIALDIROUT` really are the DocProcess
  `out`/`in` folders). The bug was 100% code, not config.
- **Fix**: `edi-invoices.class.js` now resolves the transport the same way `scanner.js` does —
  `getProvider()` + `buildTransport(row, row.PROVIDER_CONNTYPE)` — and builds the remote path via
  `joinRemote(sftpRow.INITIALDIROUT, provider.remoteSubdir('invoice'))`. Added `uploadBuffer()` to
  both `SftpTransport` and `FtpTransport` (upload an in-memory XML string without touching disk;
  the existing `upload()` only took a local file path). `joinRemote` exported from `scanner.js`
  instead of duplicated.
- **The `signSmime()` part of that fix was a mistake and has been reverted.**
  `src/edi/sign-smime.js` was dead code whose doc comment claimed S/MIME is "required by Infinite
  Edinet for invoices" — never verified. Wiring it in made every Infinite upload a MIME envelope
  instead of an XML file, which Infinite rejected as "Invalid file structure". Signing is off
  again, `EDINET_P12_*` is irrelevant to this flow, and invoices are now **accepted live on both
  retailers**. Full evidence: [infinite-invoice-format.md](infinite-invoice-format.md) →
  "ROOT CAUSE, PROVEN".

### SUPERSEDED 2026-08-27: wrong invoice XML schema entirely for Infinite — see dedicated page

**`runCmd20210915.js` generates DocProcess's `DXInvoice` schema; Infinite requires its own native
`Invoice v1.0.1` schema** (confirmed against the official spec `documentatie/dedeman/
XML_INVOICE_v4.pdf` and real archived files on the live FTP, `/invoice/archive/*.xml`, which use
`InvoiceHeader`/`InvoiceParty`/`InvoiceeParty` — nothing like `DXInvoice`/`AccountingSupplierParty`).
No amount of further field-binding fixes to the legacy script would have produced a document
Infinite accepts. Full analysis, complete field spec, known data gaps, and a step-by-step
implementation plan for a **new dedicated builder** (decided: pragmatic/contained fix now, generic
data-driven engine deferred as acknowledged debt) are in
**[infinite-invoice-format.md](infinite-invoice-format.md)**. Do this in a fresh session, not a
continuation of this one.
- **Still true from the original spec, unchanged:** first real Infinite send is still a TEST, not
  a routine — validate on one invoice once the new builder ships, and check whether it lands
  in `/invoice/confirm` (accepted) vs `/invoice/error`/`/invoice/omit` (rejected) on the remote end.

## B. "Facturează" button in the Recepții actions column (analysis-only, not implemented)

Phase 1 of `Plan_implementare_receptii_EDI.md`. Creates the invoice (7122 Auchan / 7123 Dedeman)
from a clean reception, with `MTRLINES.FINDOCS`/`MTRLINESS` pointing at the 7111 advice lines.
Higher risk than A: once the button creates documents, mistakes cost a storno, not a refresh. Must
stay behind an explicit user action — never automatic.

**Analysis completed 2026-08-24 (read-only, no code written, per explicit user request).** Verified
against live production data (not just the manual doc) for both retailers. Full series/FPRMS map is
now in [soft1-schema-facts.md](soft1-schema-facts.md#seriesfprms-map-confirmed-via-salfprms-2026-08-24).

- **Verified clean 1:1 example (Auchan):** aviz `AEX-AE-054981` (FINDOC 2203231, 4 lines) ->
  invoice `FAEX1-PF-40525` (FINDOC 2205201, SERIES 7122), created 4 days later. Every line's
  MTRL/QTY1/PRICE/VAT/DISC/NETLINEVAL copied exactly; each invoice line's `FINDOCS`=2203231 and
  `MTRLINESS` = the source line's internal MTRLINES id (not LINENUM — e.g. source LINENUM 1 has
  MTRLINESS value 2). Header NETAMNT/VATAMNT/SUMAMNT/TRDBRANCH/NUM04/CCCORDERDOC copied verbatim.
- **Verified consolidation example (Dedeman):** two avize, FINDOC 2201324 (`AEX-AE-054896`,
  NETAMNT 1168.46) and FINDOC 2201404 (`AEX-AE-054904`, NETAMNT 1127.29), both TRDBRANCH 2962,
  consolidated into ONE invoice FINDOC 2205510 (`FAEXD-PF-40611`, NETAMNT 2295.75 = sum). Its 17
  lines split cleanly: lines 1-8 carry `FINDOCS=2201324`, lines 9-17 carry `FINDOCS=2201404` — full
  line-level traceability preserved even when the header keeps only ONE source's `NUM04`/
  `CCCORDERDOC` (2201324's — the second order's number is not retrievable from the invoice header,
  confirming per-line `FINDOCS` is the only complete traceability path).
- **Creation method: use `X.CreateObj('SALDOC;EF')`** — the "EF" view, matching the precedent in
  `S1/JS/AJS/runCmd20210915.js` line 36 and the fact that `S1/JS/SALDOC_EF_27072026.js` /
  `S1/JS/EFIntegrareRetailers.js` are the event-hook scripts bound to that exact view. Any future
  invoice-creation script must use this view name so the hooks below actually fire (a plain
  `CreateObj('SALDOC')` would bypass them).
- **Hooks that fire on the EF view relevant to invoice creation** (read in full, not just grepped):
  - `ON_RESTOREEVENTS` -> `preiaDateAviz()`: reads the source aviz's `TRNDATE`/`FINCODE` via
    `ITELINES.FINDOCS` and stamps `MTRDOC.CCCDispatcheDate`/`CCCDispatcheDoc` on the invoice, when
    the source doc's own `FPRMS==711` (the aviz FPRMS, same for both retailers). **Decided
    2026-08-24: extended to Dedeman** — was gated on `SALDOC.FPRMS==712` (Auchan) only; now also
    fires on `716` (Dedeman). Implemented in `S1/JS/SALDOC_EF_27072026.js`; still needs to be copied
    into the ERP's live SALDOC/EF view script before it takes effect (same manual-deploy step as
    AJS files).
  - `exportXML1()` (FPRMS==712) and `exportXMLDedeman()` (SERIES==7123 or 7033): both call
    `X.EXEC('XCMD:ClientImport,ScriptName: ..., myFindoc:' + SALDOC.FINDOC)`. These are **rich-client
    desktop macros** — almost certainly not invokable from a headless AJS web service call the way
    `X.RUNSQL`/`X.CREATEOBJ` are. **This concern turned out to be MOOT** (see "scope clarified"
    below): EDI submission goes through the separate Facturi-tab XML flow (item A), not these
    macros, so whether they fire during AJS-based creation no longer matters.
  - `ON_AFTERPOST`: no longer calls `G_FINDOC_POST` synchronously (commented out) — instead inserts
    the FINDOC id into a `CCCFINDOCPOST` table for an external background job to post to GL later.
    This table-insert is generic document-level logic (not gated by FPRMS/SERIES). **Resolved
    2026-08-24: `X.CreateObj` instantiates the same business object the UI form uses** (it is not a
    separate/lighter code path), so `ON_AFTERPOST` and the other document-level hooks fire
    identically for an AJS-created invoice and a UI-created one. No separate empirical test needed
    for this specific concern.
  - The FINDOCL-mandatory check for SERIES 9221/7531 (see
    [soft1-schema-facts.md](soft1-schema-facts.md)) is unrelated to invoicing a *clean* reception —
    it only matters once a difference/return flow is built.
- **Net conclusion for the "conform aviz -> factură" (clean-only) case:** technically a straight
  header+line copy (TRDR/TRDBRANCH/NUM04/CCCORDERDOC copied once; each line's MTRL/QTY1/PRICE/VAT
  copied 1:1 from the source line, `FINDOCS`/`MTRLINESS` set to the source FINDOC/line-id) via
  `CreateObj('SALDOC;EF')` -> `DBINSERT` -> `FindTable('ITELINES')` per line -> `DBPOST`, using
  `SERIES=7122, FPRMS=712` for Auchan and `SERIES=7123, FPRMS=716` for Dedeman. The existing
  `TFPRMS=103` predicate from `RECADV.js` remains the correct idempotency guard. Both previously-open
  hook risks are now resolved (`ON_AFTERPOST` parity confirmed, Dedeman `preiaDateAviz` implemented —
  see above); a single empirical test invoice is still recommended before this ships, but as
  confirmation rather than open-risk investigation. DocProcess retailers are explicitly out of
  scope — different flow, not analyzed.
  **SUPERSEDED 2026-08-27 — this conclusion was wrong on the numbering mechanism, confirmed by the
  first real empirical test (see below).**

### CORRECTION 2026-08-27: series 7122 is conversion-only, plain `DBINSERT` cannot create it

First live test of `createInvoiceFromReception` (advice `AEX-AE-055138`, FINDOC 2206364) failed
with a Soft1 object-layer error that was initially unreadable (see
[soft1-text-encoding-mojibake.md](soft1-text-encoding-mojibake.md) for the separate windows-1253
decoding bug that hid it). Once decoded, the real message is **"Πρέπει να δοθεί ο αριθμός του
παραστατικού"** ("the document number must be provided") — i.e. auto-numbering never fired.

Root cause, confirmed in the ERP UI (Documente vânzări -> Administrare serii document):
- Series **7122 (`FAEX1-`, "Factura cf Aviz Expeditie - Auchan-")** has **"Doar din conversie" =
  Da** on its own admin record — it is NOT a general-purpose series, it can only be produced by
  Soft1's document **Conversie** action.
- Series 7111 (`AEX-`, aviz)'s own admin record lists its `CONVERTIT IN` targets: `FAEX-`, `AAEX-`,
  `FAEXD-`, and **`7122`/`FAEX1-`** — confirming 7122 is reachable ONLY via conversion from 7111 (or
  another listed source), never as a free-standing "New" document.
- Manually confirmed in the UI: opening a brand-new sales document and picking a Serie, typing
  `7122` into the Serie picker returns **`<No data to display>`** — the series is filtered out of
  direct/manual creation entirely, matching the conversion-only flag.
- This means `X.CreateObj('SALDOC;EF')` -> `DBINSERT` -> set `SERIES=7122` by hand can never work as
  designed: Soft1 only assigns the document number (`FINCODE`) through the real conversion
  operation on the source document (matching the right-click **Conversie** menu on a 7111 row), not
  through a plain insert that merely sets `SERIES` to a conversion-only value.

**This is a genuine Pet Factory business rule** (guards against inventing a 7122 invoice with no
real source aviz), not a bug to route around silently. Two ways forward, both requiring a decision
before continuing implementation:
1. **Use Soft1's actual conversion mechanism** instead of `DBINSERT`/`SERIES=`. Not yet
   reverse-engineered in this repo — no existing AJS/SALDOC script here calls a conversion method;
   the UI's **Conversie** action is the only known-working path so far. Needs investigation into
   what business-object call the rich client issues for it (likely a dedicated conversion method on
   the SALDOC object, not a field assignment).
2. **Ask Pet Factory/Sorin to relax "Doar din conversie" on 7122** so the reception screen can create
   it directly like any other series — a deliberate policy change, not ours to decide unilaterally.

Do not attempt a workaround that fakes the conversion (e.g. forcing a `FINCODE`/number by hand) —
that would defeat the business rule's purpose (guaranteed 7111->7122 provenance) rather than
honour it.

### RESOLVED 2026-08-27: series-level flag relocated to a scoped code guard

Decision taken (not option 1 - the real `CONVERTDLG`/`XCMD` conversion mechanism was not pursued;
see `.env`/session history for the reverse-engineering notes if ever needed): **removed "Doar din
conversie" on series 7121, 7122 and 7123 entirely** (7121 = `13249` legacy/inactive entity, 7122 =
Auchan, 7123 = Dedeman — all three share the same `X.CreateObj('SALDOC;EF')` invoice-creation path
in `RECADV.js`, just with a different `series` from `CCCDOCUMENTES1MAPPINGS`), and re-implemented
the equivalent restriction as a scoped code guard in `S1/JS/SALDOC_EF_27072026.js`
`ON_SALDOC_SERIES`:
```js
if ((SALDOC.SERIES == 7121 || SALDOC.SERIES == 7122 || SALDOC.SERIES == 7123) && X.SYS.USER != 1002) {
  X.EXCEPTION('Seria ' + SALDOC.SERIES + ' se creeaza doar prin conversie din aviz sau din integrarea EDI (Pet Factory Retailers).');
}
```
`X.SYS.USER == 1002` is the `WEB` service user (`USERS` table, `CODE='WEB'`) that this repo's AJS
endpoints authenticate as — confirmed via existing precedent in `S1/JS/AJS/runCmd20210915.js`
(lines 35, 504), which already gates logic on the same user id for the same purpose. A human on
the desktop client is still blocked exactly as before (must use Conversie); only this repo's
already-guarded (idempotent, `FINDOCS`-linked) `createInvoiceFromReception` call is let through.

**Verified live 2026-08-27**: `createInvoiceFromReception({findoc: 2206364})` (advice
`AEX-AE-055138`) succeeded end-to-end — created `FINDOC=2208760`, `FINCODE=FAEX1-PF-40689`,
`SERIES=7122`, all 14/14 lines linked via `FINDOCS=2206364`, `NETAMNT`/`SUMAMNT` matching the
source advice exactly (8342.82 / 9260.53). `RECADV.js` uses `X.CreateObj('SALDOC;EF')` again (the
intermediate `EFIntegrareRetailers` form swap was a red herring - the form was never the problem).

Separately, the Greek object-layer error that made this hard to diagnose (`GETLASTERROR` text
coming back as `??????`) was a real bug in this repo's own `parseS1Json`, unrelated to the series
restriction — see [soft1-text-encoding-mojibake.md](soft1-text-encoding-mojibake.md).

### FOUND + FIXED 2026-08-27: FULLYTRANSF/QTY1COV never got set on the source advice

User flagged (correctly) that the invoice above links perfectly via `FINDOCS`/`MTRLINESS` but the
source advice's own conversion-state flag never moved. Verified live: `FINDOC=2206364` stayed
`FULLYTRANSF=0` and all 14 lines stayed `QTY1COV=0` after creating `2208760`. This contradicts the
previous wiki note ("S1 maintains them automatically, even via X.CREATEOBJ") — that fact was only
ever verified on the sibling MultiRetur project's Conversie/`FINDOCL` path, not this plain-insert
one. Full correction in
[soft1-schema-facts.md](soft1-schema-facts.md#fullytransf--qty1cov-conversion-bookkeeping--verified-2026-08-05).

**Fix**: `RECADV.js` now calls `markFullyTransfIfCovered(advFindoc)` right after a successful
`DBPOST`. It computes coverage itself (sum of `QTY1` across every active document whose lines
point `FINDOCS`/`MTRLINESS` back at each source line, compared to the source line's own `QTY1`) and
only then `X.RUNSQL`s `FINDOC.FULLYTRANSF=1` on the source. This does not touch `QTY1COV` (kept as
S1's own field, per-line, higher risk to hand-write) and is best-effort — a failure here does not
undo the already-committed invoice. Since `FULLYTRANSF` was never the reliable "is this invoiced?"
signal anyway (the `FINDOCS`/`TFPRMS=103` predicate is), this is bookkeeping hygiene, not a
correctness fix for the invoicing flow itself.

- **Scope clarified: the „Facturează" button does NOT need its own send-to-EDI step.** A newly
  created invoice simply shows up in the existing **Facturi tab** (`invoice-table.js`) next time it
  refreshes, and the operator sends it from there with the already-built `Create XML`/`Send` buttons
  (item A's flow). Verified this requires zero extra plumbing: `getInvoicesData`
  (`S1/JS/AJS/JSRetailers.js` line ~195) is a plain `FINDOC`/`MTRDOC` join filtered only by
  `sosource/fprms/series/trdr/iscancel/trndate` window (default 7-30 days) — it has no dependency on
  *how* the invoice was created, so any invoice the button inserts with the right
  `SERIES`/`FPRMS`/`TRDR` will appear automatically. Confirmed per-retailer mapping in
  `frontend/src/pages/retailer-detail.js` (`INVOICE_SERIES`): TRDR 11654 (Dedeman) -> `fprms:716,
  series:7123`; TRDR 13248 (Auchan) -> `fprms:712, series:7122`; both `manualSend:true`.
- **`CCCDOCUMENTES1MAPPINGS` vs hardcoded `INVOICE_SERIES` — recommendation: reuse the table**, with
  one caveat. Full detail already in
  [soft1-schema-facts.md](soft1-schema-facts.md#cccdocumentes1mappings--the-sosource-fprms-series-config-table).
  Summary:
  - Dedeman already has an unused invoice mapping row (id 45) since 2025-04-16. **Auchan has NO
    invoice row at all** (only the ORDER row) — confirmed this is only harmless *because* nothing
    reads it yet; it becomes a real gap the moment a consumer needs it.
  - The live admin UI/backend (`doc-mappings-editor.js` + `getDocumentMappings`/
    `createDocumentMapping`) only reads/writes `TRDR_RETAILER, TRDR_CLIENT, SOSOURCE, FPRMS, SERIES,
    INITIALDIRIN, INITIALDIROUT` — it silently ignores `DOCUMENT_TYPE`/`DIRECTION`/`ACTIVE`. **A new
    consumer must NOT trust `DOCUMENT_TYPE`** to distinguish invoice rows from order rows (typo'd,
    NULL on rows added through the current UI).
  - Correct robust filter for a new "get invoice series for retailer" consumer: JOIN to `SALFPRMS`
    and filter `SALFPRMS.TFPRMS = 103` — same canonical predicate as `RECADV.js`.
  - **Practical unblock: only 1 new data row is needed** (Auchan, `FPRMS=712, SERIES=7122,
    TRDR_RETAILER=13248`) — addable through the existing "Add Document" UI, no schema/code change.
    The `soft1-petfactory` MCP `run_sql` tool is read-only by design, so this insert needs the user
    (via UI/Database Explorer) or a one-off AJS/SQL script prepared for them to run.
  - **Decided 2026-08-24: reuse `CCCDOCUMENTES1MAPPINGS`** for invoice-series-per-retailer instead
    of the hardcoded `INVOICE_SERIES` map in `retailer-detail.js`. Implementation must still filter
    via `SALFPRMS.TFPRMS = 103` (not `DOCUMENT_TYPE`, per the caveat above) and needs the one missing
    Auchan row added first (`FPRMS=712, SERIES=7122, TRDR_RETAILER=13248`).

## C. Invoice identity in the „Facturat" column (spec, not implemented — part of A's data work)

Replace the `Da` badge with the invoice `FINCODE` + `TRNDATE`. `Nu` stays as it is today.

Requires changing `getReceptionsData` in `S1/JS/AJS/RECADV.js`:
- today the invoiced state is `CASE WHEN EXISTS (... p.TFPRMS = 103) THEN 1 ELSE 0 END`, which
  **hides cardinality**;
- **UNVERIFIED, check first:** can one 7111 advice be covered by more than one invoice (partial or
  consolidated invoicing)? If yes the column needs `FAEXD-PF-40087 +2` style, and a bare `TOP 1`
  would silently hide the rest. Measuring query (not yet run): count `DISTINCT i.FINDOC` per advice
  over `MTRLINES l ... WHERE l.FINDOCS = f.FINDOC AND p.TFPRMS = 103`.
- must also return `CCCXMLSendDate`, otherwise A's button cannot know the invoice was already sent.

## Resolved investigations

### CRITICAL BUG (found and fixed 2026-08-05): scanner silently dropped extensionless RECADV files
Full detail moved to [recadv-xml-format.md](recadv-xml-format.md#critical-bug-found-and-fixed-2026-08-05-scanner-silently-dropped-extensionless-recadv-files) —
this was the root cause behind Auchan appearing stuck at 23 receptions. Deployed and verified
2026-08-05; Auchan RECADV rows jumped 23 -> 40 same day.

### Auchan outlier AEX-AE-053715 — EXPLAINED (Sorin Fliundra, email, 2026-08-05)
Confirmed by the Soft1 „Documente Vânzări" screen for advice `AEX-AE-053715` (16/07/2026, 9 lines):
line 2 `PF.00133` (`MIAU MIAU CU MIEL...`) not delivered in full, line 3 `PF.00130`
(`MIAU MIAU CU PUI SI LEGUME...`, qty **7,728** — matches `shipped=7728` for retailer code
`340171` exactly, confirming the `CCCS1DXTRDRMTRL` mapping was correct) only partially delivered.
**Both were REJECTED AT RECEPTION for quality problems**, and Auchan issued a return advice
("aviz de retur") for the 2 products — a real commercial event the reconciler correctly flagged as
`difference` but cannot itself distinguish from a plain shortage.

**Open question, not urgent:** should the reception screen eventually distinguish
"quality-rejected with a return advice already issued" from "plain shortage awaiting shipment"?
Would need Auchan's return advice document number as an anchor — ask the beneficiary for it if
this becomes a recurring pattern worth automating. No code change planned.

**Also from the same email, FYI only:** the Dedeman invoice XML is still sent to Edinet through the
OLD manual flow (operator uploads it himself, invoice lands in SPV after 23:00) — confirms the
"0 of 521 sent via app" finding is not an anomaly, it is simply how it has always been done, and
matches the beneficiary's `manualSend` decision already implemented in `invoice-table.js`.

### F7 — live FTP coupling for RECADV: DONE 2026-08-05 (Heroku `retailers4` v132)
`EDI_ENABLE_RECADV=true` set on `retailers4`. First cycle (`CCCORDERSLOG` 93519):
`XML_DESCARCATE=27 XML_INSERATE=27 DUPLICATE=33 DO_BACKUP=27 DO_STERSE=27 ERORI=0`. Dedeman
78 -> 105 rows (files up to 2026-08-04), Auchan unchanged at 23 (later explained by the
extensionless-filename bug above), zero routing errors. Live reconciliation at that point: Dedeman
105 docs -> 99 receptions 96 clean / 3 blocked; Auchan 23 -> 23, 20 clean / 3 difference.

**New blocked case found on live data:** `AEX-AE-054181 + AEX-AE-054189`, product 7050928, shipped
24 vs accepted 48, from document numbers `7900291390` and `5017709746` — a third instance of the
duplicate document-number family problem (see [recadv-xml-format.md](recadv-xml-format.md)), now
with the `7900…` family. The `accepted > shipped` guard held.

Operational facts from this rollout, still true:
1. `EDI_DOWNLOAD_AGE_DAYS` defaults to 7 (`src/edi/scanner.js`) — the first scan only fetches files
   with `modifyTime` in the last 7 days. Anything older is never ingested unless the window is
   raised temporarily to backfill.
2. Dedup is `CCCSFTPXML.find({XMLFILENAME})` with NO retailer scope — safe, no duplicate risk.
3. `recadvEnabled()` reads `process.env` on every access (a getter) — flipping the env var is a
   genuine live config change, no deploy needed. Match is case-insensitive `=== 'true'`.
4. Both Infinite config rows (Dedeman 11654, Auchan 13248) point at the same `/recadv`, so the
   directory is LISTed twice per cycle. Harmless but doubles FTP traffic against the portal-read-flag
   account (see the portal side-effect incident in
   [recadv-xml-format.md](recadv-xml-format.md#incident-our-own-investigation-retr-calls-flip-read-in-the-edinet-portal-2026-08-05)).

**Point of no return:** from the first cycle on, LIST/RETR sets the portal „citit" flag on NEW
advices too — the portal worklist is permanently useless now, the app is the only source of truth.

**Rollback path (kept for reference, not expected to be needed):** unset/false `EDI_ENABLE_RECADV`.
Inserted rows are harmless (`INGESTED` is terminal); remove with
`DELETE FROM CCCSFTPXML WHERE EDIDOCTYPE='RECADV'` if a clean restart is wanted.

## Deploy & storage facts
- **`retailers4` auto-builds from branch `feat/edi-safety-sftp-tests`.** Do NOT `git push
  retailers4` — that triggers a second build of the same commit and Heroku warns about duplicate
  build versions. `git push origin <branch>` is enough; the release follows on its own.
- **DO Spaces `xml-edi-backup` is a transient buffer, not an archive.** The scanner deletes each
  object once the `CCCSFTPXML` insert succeeds. It should hold only `archive/retann-capture/` (5
  files, kept because RETANN is still blocked on RO-7627 and exists nowhere else in the DB) — see
  the 2026-08-13 cleanup in [recadv-xml-format.md](recadv-xml-format.md#do-bucket-accumulation-incident-2026-08-13--leftover-research-backups-not-a-production-bug).
- DO credentials can be loaded locally without exposure via
  `$env:DO_BUCKET = (heroku config:get DO_BUCKET --app retailers4)` etc.

## Other pending item
- Revert an over-correction in `invoice-table.js`: per-invoice `Send`/`Resend` must come back
  (`&& !this.manualSend` removed from both row conditions). `manualSend` should suppress **only**
  the bulk `Trimite toate`. Per-invoice send IS the manual action the beneficiary asked for.

## See also
- [infinite-invoice-format.md](infinite-invoice-format.md) — the wrong-schema finding + full
  implementation plan for Item A's remaining Infinite send work.
- [recadv-xml-format.md](recadv-xml-format.md) — the RECADV parsing/reconciliation rules this screen
  is built on.
- [soft1-schema-facts.md](soft1-schema-facts.md) — FINDOC chain, FPRMS/series map, FULLYTRANSF.
