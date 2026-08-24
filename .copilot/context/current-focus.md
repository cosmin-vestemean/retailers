# Current Focus

## Last Updated

- 2026-08-24 (session C: trimmed this file from a ~400-line chronological log to a short
  operational pointer, as part of the LLM Wiki migration. Full session-by-session history moved
  to [`CHANGELOG.md`](./CHANGELOG.md) verbatim (nothing lost). Durable facts now live in
  `.copilot/wiki/*.md` topic pages, linked below instead of repeated inline. See
  `.copilot/context/wiki-migration-plan.md` for the migration's own status.)

## Current Goal

RECADV (reception advice) ingestion and reconciliation are **live in production** on `retailers4`
since 2026-08-05 (F1-F7 complete). The active work is finishing the Recepții screen's remaining
approved-but-not-implemented UI items. Full status, code map and specs:
[reception-screen.md](../wiki/reception-screen.md), [recadv-pipeline.md](../wiki/recadv-pipeline.md).

- **Item B ("Facturează" button)** — creates the invoice from a clean reception. Analysis-only
  completed 2026-08-24 (DB flow, `EF` view, hooks all verified live); not yet implemented. One
  decision blocks it — see Open Questions.
- **Item A ("Trimite" button)** and **Item C (invoice identity column)** — approved, spec written,
  not yet implemented. Item A should be done first (small, and validates the never-exercised
  Infinite SFTP send path).
- The reconciler's model change (score every advice line, including ones the retailer omits) is
  implemented and pushed but **not yet deployed** — see Next Step.
- **retailers1 decommissioning (2026-08-10)** — analysis concluded the legacy app (build from
  `main`) can be shut down completely: cutover to retailers4 happened 2026-06-09, retailers4 has
  zero dependencies on it. Code cleanup (Fixie SOCKS tunnel, `outbound-ip` service, dead
  `mssql` config + deps) is on this branch; the phased Heroku shutdown steps are in
  [`documentatie/retailers1-shutdown-runbook.md`](../../documentatie/retailers1-shutdown-runbook.md).
  Execution (scale-down → grace period → destroy → firewall de-whitelist) is pending.

## Active Area

- Soft1 AJS: `S1/JS/AJS/RECADV.js` (5 functions, deployed to ERP).
- Backend: `src/edi/recadv-reconciler.js`, `src/services/recadv/`.
- Frontend: `frontend/src/components/reception-table.js`, `frontend/src/pages/retailer-detail.js`.

## Open Questions

- **Item B config source**: reuse `CCCDOCUMENTES1MAPPINGS` for invoice-series-per-retailer
  (recommended) or keep the hardcoded `INVOICE_SERIES` map in `retailer-detail.js`? Detail in
  [reception-screen.md](../wiki/reception-screen.md#b-facturează-button-in-the-recepții-actions-column-analysis-only-not-implemented).
  Awaiting user decision.
- Does `ON_AFTERPOST`/`CCCFINDOCPOST` GL-posting fire the same way for an AJS-created invoice as a
  UI-created one? Not yet empirically tested — needed before item B ships.
- Does Dedeman need an equivalent to Auchan's `preiaDateAviz()`? Unclear if this is a gap or
  intentional (see [reception-screen.md](../wiki/reception-screen.md)).
- RETANN stays blocked on Infinite ticket RO-7627 (return order number missing from the XML) —
  see [retann.md](../wiki/retann.md). Nothing to do until it lands.
- Legacy Soft1 table cleanup (92 tables, ~284 MB) is scoped and tiered, awaiting beneficiary
  approval — see [legacy-tables-cleanup.md](../wiki/legacy-tables-cleanup.md).
- Soft1 web-service password + RSA key rotation is still not done — see
  [security-secrets.md](../wiki/security-secrets.md). Open since session N+5b, unrelated to RECADV.
- `DOAR AVIZ` (Dedeman surplus-order handling, options A/B/C) remains an open beneficiary decision,
  reframed as a phase-3 item and no longer blocking. Detection design and options are preserved in
  [`CHANGELOG.md`](./CHANGELOG.md) (2026-07-27/28 entries) if revived.

## Next Step

1. Deploy the reconciler model change (committed+pushed, session N+19) and re-run reconciliation
   live; report the corrected (larger) shortage numbers to the beneficiary as "what changed".
2. Implement Item A ("Trimite" button in Recepții).
3. Get the Item B config-source decision from the user, then implement Item B per
   [reception-screen.md](../wiki/reception-screen.md).

## See also — wiki

- [reception-screen.md](../wiki/reception-screen.md) — Recepții tab status, buttons A/B/C spec.
- [recadv-pipeline.md](../wiki/recadv-pipeline.md) — RECADV feature architecture & code pointers.
- [recadv-xml-format.md](../wiki/recadv-xml-format.md) — RECADV XML format & business rules.
- [retann.md](../wiki/retann.md) — RETANN format, business rules, RO-7627 blocker.
- [soft1-schema-facts.md](../wiki/soft1-schema-facts.md) — FINDOC chain, FPRMS/series map.
- [edi-pipeline-architecture.md](../wiki/edi-pipeline-architecture.md) — general EDI pipeline.
- [frontend-architecture.md](../wiki/frontend-architecture.md) — SPA structure.
- [legacy-tables-cleanup.md](../wiki/legacy-tables-cleanup.md) — pending table cleanup.
- [security-secrets.md](../wiki/security-secrets.md) — secrets hygiene, rotation status.
- [onboard-new-docprocess-retailer.md](../wiki/onboard-new-docprocess-retailer.md) — retailer onboarding runbook.
- [soft1-text-encoding-mojibake.md](../wiki/soft1-text-encoding-mojibake.md), [spa-routing.md](../wiki/spa-routing.md),
  [documentatie-folder-map.md](../wiki/documentatie-folder-map.md) — smaller reference pages.

Full session-by-session history (pre-2026-08-24): [`CHANGELOG.md`](./CHANGELOG.md).
