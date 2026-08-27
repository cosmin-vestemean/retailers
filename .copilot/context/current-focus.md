# Current Focus

## Last Updated
- 2026-08-27 (session: reception screen Item A — "Trimite" button. Fixed transport/signing/
  credentials bugs, then discovered the real blocker: `runCmd20210915.js` generates the wrong
  invoice XML schema entirely for Infinite retailers. Full handoff plan written for a fresh
  session — see [infinite-invoice-format.md](../wiki/infinite-invoice-format.md).)

## Current Goal
RECADV ingestion/reconciliation is **live in production** on `retailers4` since 2026-08-05.
Active work is finishing the Recepții screen's remaining approved UI items — see
[reception-screen.md](../wiki/reception-screen.md).
- **Item B ("Facturează")**: DONE, verified live. See Confirmed Decisions below and the wiki
  page section B ("RESOLVED 2026-08-27") for the full fix chain.
- **Item A ("Trimite")**: UI was already implemented. Backend send-path bugs (transport ignoring
  `CONNTYPE`, dead S/MIME signing code, missing `S1_USERNAME`/`S1_PASSWORD`/`EDINET_P12_*`
  config, missing 7122/7123 series recognition in the legacy invoice binder) are all fixed —
  DocProcess sending is confirmed working (125/410 sent in 60d). **Infinite sending is still
  blocked on a bigger problem, not yet started: `runCmd20210915.js` builds DocProcess's
  `DXInvoice` schema, but Infinite requires its own native `Invoice v1.0.1` schema** (confirmed
  against the official spec PDF and real archived files on the live FTP). A dedicated new
  builder is needed — full field-by-field spec, known data gaps, and a step-by-step
  implementation plan are written up in
  [infinite-invoice-format.md](../wiki/infinite-invoice-format.md). **Do this in a fresh session**
  (per user request 2026-08-27) rather than continuing in an already-long one.
  Acknowledged as expedient-not-ideal: the correct long-term fix is a generic outbound
  XML-generation engine (mirroring `order-builder.js`'s inbound one) — recorded as deferred
  debt in that same wiki page, not forgotten.
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
