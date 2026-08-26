# Reception screen (Recepții) — RECADV reconciliation and invoicing

**This is a LIVING page.** Parts of it (button B) are still mid-design — keep the "Open work"
sections honest about what is analysis-only vs. implemented, don't present unfinished design as done.

## Status overview (as of 2026-08-24)
- **Model change (score every advice line, incl. omitted ones): IMPLEMENTED** 2026-08-05.
- **Item A ("Trimite" button): approved by beneficiary, spec below, NOT yet implemented.**
- **Item B ("Facturează" button): approved, analysis-only completed 2026-08-24, config-source
  decision made (reuse `CCCDOCUMENTES1MAPPINGS`), NOT yet implemented.**
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

## A. "Trimite" button in the Recepții actions column (spec, not implemented)

Same behaviour as the Facturi tab send: `getInvoiceDom` -> `uploadInvoice` -> `markDocumentSent`.

- **Only render it where an invoice exists.** On „Nu" rows there is nothing to send.
- **Must reflect sent state** — `Trimite` / `Retrimite` / already-sent badge. There is **no
  duplicate guard on the invoice flow** (unlike orders, which have `duplicateGuard` in
  `order-sender.js`), so a blind button would let the operator send twice.
- **Do NOT copy `invoice-table._sendInvoice`** (~50 lines: DOM fetch, upload, mark sent, per-row
  state, error paths). Extract a shared helper (e.g. `frontend/src/services/invoice-send.js`) and
  have both `invoice-table.js` and `reception-table.js` call it, or the two copies will drift.
- **First click is a TEST, not a routine.** The SFTP path to Infinite has never run in production:
  0 of 521 Dedeman+Auchan invoices in 60 days have `CCCXMLSendDate` set. Validate on one invoice and
  diff the generated XML against what the operator uploads by hand before trusting it.

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
- [recadv-xml-format.md](recadv-xml-format.md) — the RECADV parsing/reconciliation rules this screen
  is built on.
- [soft1-schema-facts.md](soft1-schema-facts.md) — FINDOC chain, FPRMS/series map, FULLYTRANSF.
