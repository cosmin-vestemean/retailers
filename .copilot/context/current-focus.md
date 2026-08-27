# Current Focus

## Last Updated
- 2026-08-27 (session: reception screen Item A — "Trimite" button. Fixed transport/signing/
  credentials bugs, discovered `runCmd20210915.js` generates the wrong invoice XML schema for
  Infinite retailers, specced the fix, implemented it (`InfiniteInvoice.js` builder), deployed it.
  Sent 6 test invoices; **all 6 were REJECTED by Infinite** ("Invalid file structure" in the
  EDInet web portal — the FTP-level ack looked clean for all of them, that signal is NOT
  reliable). Root cause found + fixed: `RECADV.js`'s `createInvoiceFromReception` never copied
  `SALDOC.DATE01`, leaving `<OrderParty><BuyerOrderDate>` empty on every Infinite invoice it
  creates. Needs redeploy + resend + a fresh portal check before this can be called done. Also
  added post-upload FTP verification + `sendInvoice` logging to `edi-invoices.class.js` (not yet
  deployed — needs `git push`). `npm test` 101 passing.
  See [infinite-invoice-format.md](../wiki/infinite-invoice-format.md).)

## Current Goal
RECADV ingestion/reconciliation is **live in production** on `retailers4` since 2026-08-05.
Active work is finishing the Recepții screen's remaining approved UI items — see
[reception-screen.md](../wiki/reception-screen.md).
- **Item B ("Facturează")**: DONE, verified live. See Confirmed Decisions below and the wiki
  page section B ("RESOLVED 2026-08-27") for the full fix chain.
- **Item A ("Trimite")**: UI was already implemented. Backend send-path bugs (transport ignoring
  `CONNTYPE`, dead S/MIME signing code, missing `S1_USERNAME`/`S1_PASSWORD`/`EDINET_P12_*`
  config, missing 7122/7123 series recognition in the legacy invoice binder) are all fixed —
  DocProcess sending is confirmed working (125/410 sent in 60d). **Infinite's schema builder is
  written, deployed, and structurally correct (confirmed by direct diff against a real historic
  archived invoice) — but NOT YET actually accepted by Infinite (2026-08-27).**
  `runCmd20210915.js` built DocProcess's `DXInvoice` schema; Infinite needs its own native
  `Invoice v1.0.1` schema, ported field-for-field from the two proven `SOIMPORT` scripts
  (`AR_ORIGINAL_INVOICE` Auchan, `ExpFactDedeman_ButonNew` Dedeman) into a new
  `S1/JS/AJS/InfiniteInvoice.js` AJS module (deployed to the ERP, `SellerTel` sourced from
  `COMPANY.PHONE1` only per user, `PostalCode` relaxed to non-blocking after finding 84% of real
  branches have no ZIP). `get-invoice-dom.class.js` routes to it by looking up the retailer's
  `CCCSFTP` provider (`provider.code === 'infinite'`), logs pre-validation failures to
  `orders-log` (`OPERATION:'buildInvoiceXml'`), falls back to the legacy DocProcess endpoint
  otherwise.
  **Sent 6 real Auchan invoices through the live app — all 6 rejected by Infinite**
  (`FAEX1-PF-40689/90/93/94/95/96`): the EDInet **web portal** shows "Error: Document processing.
  Invalid file structure." for each. The FTP-level `MessageAcknowledgement` (empty
  `AcknowledgementNote`, moved to `/invoice/archive/`) looked clean for all of them — **that was
  wrongly reported earlier in this session as "definitive proof of acceptance"; it only confirms
  transport-level receipt, not real validation.** Root cause, found by diffing our actual sent
  XML against a genuinely-successful real historic Dedeman invoice: `<OrderParty>
  <BuyerOrderDate>` was empty on every one of the 6 (verified: `SALDOC.DATE01` was `NULL` on all
  6 created invoices even though their source avize's own `DATE01` was populated in every case).
  **Fixed**: `S1/JS/AJS/RECADV.js`'s `createInvoiceFromReception` now also copies `DATE01` from
  the source aviz (it already copied `NUM04`/`TRDBRANCH`/`CCCORDERDOC` but never this field).
  **Not yet done**: redeploy `RECADV.js`, one-time `DATE01` backfill for the 6 existing test
  invoices (real source dates known, SQL in the wiki page), resend, and check the **EDInet
  portal** (not just FTP) for a clean result.
  Also added (per user request, **not yet deployed — needs `git push`**): `edi-invoices.class.js`
  now verifies the file is actually listed on the FTP after upload before reporting success, and
  logs every send outcome to `orders-log` (`OPERATION:'sendInvoice'`) — previously only XML-build
  failures were logged, not the actual send. `npm test` 101 passing
  (`get-invoice-dom.test.js` + new `edi-invoices.test.js`).
  **Idea for later, not implemented** (noted per user 2026-08-27): poll Infinite's
  `/invoice/logs/ok|err/` for `MessageAcknowledgement` files and surface them in the app,
  symmetric to the DocProcess APERAK flow — see wiki page's "Live verification" section for the
  full directory-layout discovery and what building this would take.
  Full detail: [infinite-invoice-format.md](../wiki/infinite-invoice-format.md).
  The generic outbound XML-generation engine idea (mirroring `order-builder.js`'s inbound one)
  stays de-prioritized for Infinite (closed set of 2 retailers, hardcoded branches per the scope
  directive) — only relevant if DocProcess-side mapping work is ever scheduled.
- **Item C (invoice identity column)**: approved, spec written, not yet implemented.
Active area: nothing pending here until the new session picks up
[infinite-invoice-format.md](../wiki/infinite-invoice-format.md) or Item C starts.

## Relevant Files
- `S1/JS/AJS/RECADV.js` — `createInvoiceFromReception` (`X.CreateObj('SALDOC;EF')`).
- `S1/JS/SALDOC_EF_27072026.js` — `ON_SALDOC_SERIES` guard (7121/7122/7123, `X.SYS.USER==1002`).
- `src/s1-response.js` — `parseS1Json` charset-aware decoding.
- `src/services/recadv/recadv.class.js` — `create()` + `createInvoice` operation logging.
- `frontend/src/components/{reception-table,orders-log-table}.js` — button + Logs UI.
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
