# Current Focus

## Last Updated
- 2026-08-27 (session: reception screen Item A — "Trimite" button send-path bug found and
  fixed. UI was already implemented; the backend send was silently broken for Infinite.)

## Current Goal
RECADV ingestion/reconciliation is **live in production** on `retailers4` since 2026-08-05.
Active work is finishing the Recepții screen's remaining approved UI items — see
[reception-screen.md](../wiki/reception-screen.md).
- **Item B ("Facturează")**: DONE, verified live. See Confirmed Decisions below and the wiki
  page section B ("RESOLVED 2026-08-27") for the full fix chain.
- **Item A ("Trimite")**: UI (`reception-table.js`) was already implemented, sharing
  `sendInvoiceXml()` with the Facturi tab — contradicting the stale "not yet implemented" spec
  note. Found and fixed a real backend bug instead: `edi-invoices.class.js` hardcoded an SFTP
  client for every retailer, ignoring `CCCEDIPROVIDER.CONNTYPE`. DocProcess (CONNTYPE=1, SFTP)
  worked (125/410 invoices sent via app in 60d); Infinite (CONNTYPE=4, plain FTP on
  `ftp.infinite.pl:21`) always failed — confirmed 0/616 Infinite invoices ever sent via app.
  Fixed 2026-08-27: `edi-invoices.class.js` now resolves the transport via `buildTransport()`/
  `getProvider()` (same as `scanner.js`), uses `provider.remoteSubdir('invoice')` for the
  correct remote dir, and signs the XML with `signSmime()` (was dead code) for Infinite before
  upload. Verified read-only against live `ftp.infinite.pl` and `dx.doc-process.com`: both
  CCCSFTP rows are structurally correct (host/port/dirs match reality) — the bug was code-only.
  **Not yet done: `EDINET_P12_BASE64`/`EDINET_P12_PASSWORD` are not set anywhere (checked Heroku
  config on `retailers4` — absent)**, so Infinite sends will fail closed with a clear "S/MIME
  signing failed" error until that PKCS#12 keystore is provisioned. DocProcess unaffected.
- **Item C (invoice identity column)**: approved, spec written, not yet implemented.
Active area: all files below are deployed and working; nothing pending here until Item A's
remaining P12-provisioning step or Item C starts.

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
Implement Item A ("Trimite" button + invoice identity column) per
[reception-screen.md](../wiki/reception-screen.md).

## See also — wiki
[reception-screen.md](../wiki/reception-screen.md) · [recadv-pipeline.md](../wiki/recadv-pipeline.md) ·
[recadv-xml-format.md](../wiki/recadv-xml-format.md) · [retann.md](../wiki/retann.md) ·
[soft1-schema-facts.md](../wiki/soft1-schema-facts.md) · [soft1-text-encoding-mojibake.md](../wiki/soft1-text-encoding-mojibake.md) ·
[edi-pipeline-architecture.md](../wiki/edi-pipeline-architecture.md) · [frontend-architecture.md](../wiki/frontend-architecture.md) ·
[legacy-tables-cleanup.md](../wiki/legacy-tables-cleanup.md) · [security-secrets.md](../wiki/security-secrets.md) ·
[onboard-new-docprocess-retailer.md](../wiki/onboard-new-docprocess-retailer.md) · [graphify-workflow.md](../wiki/graphify-workflow.md) ·
[spa-routing.md](../wiki/spa-routing.md) · [documentatie-folder-map.md](../wiki/documentatie-folder-map.md)

Full session-by-session history (pre-2026-08-24): [`CHANGELOG.md`](./CHANGELOG.md).
