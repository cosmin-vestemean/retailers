# Current Focus

## Last Updated
- 2026-08-27 (session: Infinite invoice send-path, reception screen Item A — "Trimite" button).
  Built the native Infinite `<Invoice Version="1.0.1">` XML schema (`InfiniteInvoice.js`), wired
  routing/logging, sent 6 real test invoices — **all 6 were rejected** by the Infinite EDInet web
  portal ("Invalid file structure"), even though the FTP-level `MessageAcknowledgement` looked
  clean (that signal is **not reliable** — the portal is the only authoritative source). Root
  cause #1: `RECADV.js` never copied `SALDOC.DATE01` onto created invoices, leaving
  `<OrderParty><BuyerOrderDate>` empty — fixed + redeployed, confirmed live (`DATE01` now
  populated on all 6 test FINDOCs). A second, deeper bug was also found (`X.GETSQLDATASET`'s WS
  bridge corrupts a nested null-date SQL expression into a stray control byte) — an attempted fix
  regressed live and was **reverted**; the revert was redeployed but **not yet re-tested**.
  **Testing is not finished — next session's first step is to resend the 6 test invoices and
  check the EDInet portal.** Full technical detail, root-cause evidence, and the exact next-step
  checklist: [infinite-invoice-format.md](../wiki/infinite-invoice-format.md) ("Live verification"
  section). `npm test` 101 passing.

## Current Goal
RECADV ingestion/reconciliation is **live in production** on `retailers4` since 2026-08-05.
Active work is finishing the Recepții screen's remaining approved UI items — see
[reception-screen.md](../wiki/reception-screen.md).
- **Item B ("Facturează")**: DONE, verified live. See Confirmed Decisions below and the wiki
  page section B ("RESOLVED 2026-08-27") for the full fix chain. **Follow-up fixed same day**:
  `RECADV.js` now also hand-sets the source advice's `FINDOC.FULLYTRANSF=1` after invoicing
  (`markFullyTransfIfCovered`) — S1's native bookkeeping does not fire on this plain-insert path
  (only ever verified on a different project's Conversie path). **Deployed to ERP by user
  2026-08-27** (redeployed `RECADV.js` into Advanced JavaScript Editor). The 7 pre-existing
  advices already invoiced before this fix (2202772, 2203286, 2204418, 2204576, 2204698, 2205048,
  2206364) were backfilled by hand with a verified SQL `UPDATE` (each confirmed fully covered
  first). **Not yet re-verified**: create/check one NEW invoice via the button and confirm the
  source advice's `FULLYTRANSF` flips to 1 automatically post-deploy. Detail: wiki page section B,
  "FOUND + FIXED 2026-08-27".
- **Item A ("Trimite")**: UI was already implemented. Backend send-path bugs (transport ignoring
  `CONNTYPE`, dead S/MIME signing code, missing `S1_USERNAME`/`S1_PASSWORD`/`EDINET_P12_*`
  config, missing 7122/7123 series recognition in the legacy invoice binder) are all fixed —
  DocProcess sending is confirmed working (125/410 sent in 60d). **Infinite's schema builder is
  written, deployed, structurally correct (confirmed by direct diff against a real historic
  archived invoice) — but genuine end-to-end acceptance by Infinite is NOT YET confirmed
  (2026-08-27), and this is the single open item blocking Item A.**

  **PRECISE CURRENT STATE (read this before doing anything else on this item):**
  1. `S1/JS/AJS/RECADV.js` `createInvoiceFromReception`: now copies `DATE01` from the source
     aviz (previously copied `NUM04`/`TRDBRANCH`/`CCCORDERDOC` but not this field, leaving
     `<OrderParty><BuyerOrderDate>` empty on every Infinite invoice). **Redeployed to ERP,
     confirmed live** — `DATE01` is now populated on all 6 test FINDOCs
     (2208760/2208761/2209180/2209181/2209182/2209183, i.e. `FAEX1-PF-40689/90/93/94/95/96`).
  2. `S1/JS/AJS/InfiniteInvoice.js`: a SEPARATE, deeper bug was found mid-session —
     `X.GETSQLDATASET`'s web-service bridge corrupts a nested `isnull(replace(convert(...)))`
     SQL expression built on a NULL date into a stray control byte (renders as `?` in a text
     viewer), confirmed by direct reproduction via `mcp_s1-api_s1_query_dataset`. An attempted
     fix (select the raw date column, format via `X.FORMATDATE` in JS) was deployed and
     **regressed live** — every date field came back empty on every invoice, even ones with a
     confirmed non-null underlying value. **Reverted** back to the original SQL-side
     `CONVERT`/`ISNULL` string formatting (safe now that `DATE01`/`DELIVDATE` are fixed at the
     source — the corruption only triggers on an actually-NULL date). The reverted file has just
     been redeployed to the ERP (user confirmed) but **has not been re-tested yet**.
  3. **Next step, first thing in a fresh session**: click "Retrimite" on all 6 test invoices again
     (Auchan retailer page, Recepții tab: `FAEX1-PF-40689/90/93/94/95/96`). The versions currently
     sitting in Infinite's `/invoice/archive/` for these 6 were sent **during the broken
     `fmtDate`/regressed window** — they are stale and not representative of the current
     (reverted) code, so a fresh resend is required. Then check the **EDInet web portal**
     (this repo/session has no credentials for it — ask the user to check directly and share the
     result) for a genuinely clean "processed" outcome, not just the FTP
     `MessageAcknowledgement`/`archive` move (proven unreliable as a success signal this session).
     Only when the portal itself shows success is Item A genuinely done.
  4. **Do not reattempt the raw-date-column + `X.FORMATDATE` pattern** without first proving in
     isolation that `X.FORMATDATE` works on a field read from an ad-hoc `X.GETSQLDATASET`
     dataset (as opposed to a real object-bound field like `SALDOC.TRNDATE`, where this pattern is
     already known to work elsewhere in the codebase) — see `/memories/debugging.md` for the full
     writeup of this dead end.

  Also added (per user request, **written but NOT yet deployed — needs `git push`**):
  `edi-invoices.class.js` now verifies the file is actually listed on the FTP after upload before
  reporting success, and logs every send outcome to `orders-log` (`OPERATION:'sendInvoice'`) —
  previously only XML-build validation failures were logged, not the actual send.
  Covered by `test/services/get-invoice-dom/get-invoice-dom.test.js` +
  `test/services/edi-invoices/edi-invoices.test.js`; `npm test` 101 passing.
  **Idea for later, not implemented** (noted per user 2026-08-27): poll Infinite's
  `/invoice/logs/ok|err/` for `MessageAcknowledgement` files and surface them in the app,
  symmetric to the DocProcess APERAK flow — see wiki page's "Live verification" section for the
  full directory-layout discovery and what building this would take.
  Full detail: [infinite-invoice-format.md](../wiki/infinite-invoice-format.md).
  The generic outbound XML-generation engine idea (mirroring `order-builder.js`'s inbound one)
  stays de-prioritized for Infinite (closed set of 2 retailers, hardcoded branches per the scope
  directive) — only relevant if DocProcess-side mapping work is ever scheduled.
- **Item C (invoice identity column)**: approved, spec written, not yet implemented.
Active area: **resume [infinite-invoice-format.md](../wiki/infinite-invoice-format.md) — resend
the 6 test invoices and check the EDInet portal** (see step 3 above). Item C starts only after
Item A is confirmed genuinely working end to end.

## Relevant Files
- `S1/JS/AJS/InfiniteInvoice.js` — native Infinite invoice XML builder (Auchan/Dedeman only).
- `S1/JS/AJS/RECADV.js` — `createInvoiceFromReception` (`X.CreateObj('SALDOC;EF')`), now also
  copies `DATE01`.
- `S1/JS/SALDOC_EF_27072026.js` — `ON_SALDOC_SERIES` guard (7121/7122/7123, `X.SYS.USER==1002`).
- `src/services/get-invoice-dom/get-invoice-dom.class.js` — routes Infinite vs DocProcess.
- `src/services/edi-invoices/edi-invoices.class.js` — upload + post-upload FTP verification +
  `sendInvoice` logging (written, not yet deployed).
- `src/s1-response.js` — `parseS1Json` charset-aware decoding.
- `src/services/recadv/recadv.class.js` — `create()` + `createInvoice` operation logging.
- `frontend/src/components/{reception-table,orders-log-table,invoice-table}.js` — button + Logs UI.
- `package.json` — `heroku-postbuild` (frontend now builds fresh on every Heroku deploy).

## Confirmed Decisions
- `CCCDOCUMENTES1MAPPINGS` needed a real Auchan `INVIOCE` row (id 54) — added.
- `parseS1Json` now respects the response's declared charset instead of always assuming UTF-8 —
  fixes Greek `GETLASTERROR` text being unreadable. See
  [soft1-text-encoding-mojibake.md](../wiki/soft1-text-encoding-mojibake.md).
- Root blocker was series-level "Doar din conversie" on 7121/7122/7123. Removed the flag, moved
  the restriction into `ON_SALDOC_SERIES` scoped to `X.SYS.USER!=1002` (the WEB service user) —
  humans still must convert; only this repo's guarded flow may create directly.
- Invoice-creation logging reuses `CCCORDERSLOG`/`orders-log` with a new `createInvoice` operation
  (no new table) — visible on the Logs screen, filterable per retailer.
- `frontend/package-lock.json` is no longer committed (Windows-generated lockfile broke Heroku's
  Linux build via the rolldown/vite native-binding npm bug) — `heroku-postbuild` resolves fresh.

## Open Questions
- RETANN blocked on Infinite ticket RO-7627 — [retann.md](../wiki/retann.md).
- Legacy Soft1 table cleanup awaiting beneficiary approval —
  [legacy-tables-cleanup.md](../wiki/legacy-tables-cleanup.md).
- Soft1 web-service password/RSA key rotation still pending —
  [security-secrets.md](../wiki/security-secrets.md).
- retailers1 decommissioning: Faza 0-1 done (dynos scaled to 0), grace period until ~2026-09-07/21,
  Faza 2 (destroy) + Faza 3 (firewall) pending — `documentatie/retailers1-shutdown-runbook.md`.

## Next Step
Start a fresh session on
[infinite-invoice-format.md](../wiki/infinite-invoice-format.md) — build the dedicated Infinite
invoice XML builder per its step-by-step plan. Item C ("Trimite" invoice identity column) is the
other pending small item — [reception-screen.md](../wiki/reception-screen.md).

## See also — wiki
[reception-screen.md](../wiki/reception-screen.md) · [infinite-invoice-format.md](../wiki/infinite-invoice-format.md) ·
[recadv-pipeline.md](../wiki/recadv-pipeline.md) ·
[recadv-xml-format.md](../wiki/recadv-xml-format.md) · [retann.md](../wiki/retann.md) ·
[soft1-schema-facts.md](../wiki/soft1-schema-facts.md) · [soft1-text-encoding-mojibake.md](../wiki/soft1-text-encoding-mojibake.md) ·
[edi-pipeline-architecture.md](../wiki/edi-pipeline-architecture.md) · [frontend-architecture.md](../wiki/frontend-architecture.md) ·
[legacy-tables-cleanup.md](../wiki/legacy-tables-cleanup.md) · [security-secrets.md](../wiki/security-secrets.md) ·
[onboard-new-docprocess-retailer.md](../wiki/onboard-new-docprocess-retailer.md) · [graphify-workflow.md](../wiki/graphify-workflow.md) ·
[spa-routing.md](../wiki/spa-routing.md) · [documentatie-folder-map.md](../wiki/documentatie-folder-map.md)

Full session-by-session history (pre-2026-08-24): [`CHANGELOG.md`](./CHANGELOG.md).
