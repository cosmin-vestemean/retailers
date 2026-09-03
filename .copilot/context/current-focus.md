# Current Focus

## Last Updated
- 2026-08-27 (later session: Infinite invoice send-path — **RESOLVED**). Item A ("Trimite") is
  **done and verified live: invoices are accepted by Infinite EDInet for BOTH Auchan and
  Dedeman.** Root cause of the 100% rejection rate was **not** the XML: `edi-invoices.class.js`
  had S/MIME signing wired in earlier the same day, so the file landing on Infinite's FTP began
  with `Content-Type: multipart/signed` instead of `<?xml`. Proven by pulling an accepted file
  (button-generated, 16 225 B, starts `<?xml`) and a rejected one (ours, 18 072 B, starts
  `Content-Type:`) off `/invoice/archive/` with the project's own `FtpTransport`. Signing removed;
  `sign-smime.js` kept in the repo for the day Infinite switches the relation to `Key storage`.
  Along the way three genuine but non-fatal defects were fixed (`DATE01` and `CCCSELLERID` never
  copied in `RECADV.js`; `SellerTel` read `PHONE1` instead of `PHONE2`), and one wrong "fix" of
  mine was retracted (`BuyerOrderDate` is `xsd:dateTime` — the `T00:00:00` form was correct all
  along). Full narrative, XSD findings and method lessons:
  [infinite-invoice-format.md](../wiki/infinite-invoice-format.md). `npm test` 101 passing.

## Previous Update
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
- **Item A ("Trimite")**: **DONE — verified live 2026-08-27, invoices accepted by Infinite EDInet
  for both Auchan and Dedeman.** All backend send-path bugs are fixed: transport now honours
  `CONNTYPE`, uploads go to the provider's real `/invoice/` subdir, `S1_USERNAME`/`S1_PASSWORD`
  config added, 7122/7123 recognized by the legacy binder, and `InfiniteInvoice.js` builds the
  native `Invoice v1.0.1` schema. DocProcess sending also confirmed working (125/410 in 60d).

  The long rejection streak was caused by **S/MIME signing**, wired in the same day on the
  strength of an unverified code comment: it made the uploaded file a MIME envelope
  (`Content-Type: multipart/signed`) instead of an XML document. Removed. `sign-smime.js` stays in
  the repo for the day Infinite switches the relation from `Not sign` to `Key storage` — if that
  happens, align the digest to `SHA1withRSA` and add the missing `MIME-Version: 1.0` header first,
  and **only on written confirmation from Infinite**.

  Genuine defects fixed along the way (real, but none of them caused the rejections): `RECADV.js`
  `createInvoiceFromReception` never copied `DATE01` or `CCCSELLERID` from the source aviz; the
  header query read `COMPANY.PHONE1` where both proven scripts read `PHONE2`. One retracted
  mistake of mine: `BuyerOrderDate` is `xsd:dateTime`, so the `T00:00:00` form was correct all
  along — do not "normalize" it to a plain date.

  Two reusable lessons, both expensive: (1) the FTP `MessageAcknowledgement` and the move into
  `/invoice/archive/` are **not** acceptance signals — only the EDInet portal is; (2) when a
  document is rejected as malformed, **read the first bytes of the artefact actually uploaded**
  before auditing the content that produced it.

  **Idea for later, not implemented**: poll Infinite's `/invoice/logs/ok|err/` for
  `MessageAcknowledgement` files and surface them in the app, symmetric to the DocProcess APERAK
  flow — but recalibrated now that "ok" is known to mean "received and parsed", not "accepted".
  Full detail: [infinite-invoice-format.md](../wiki/infinite-invoice-format.md).
  The generic outbound XML-generation engine idea (mirroring `order-builder.js`'s inbound one)
  stays de-prioritized for Infinite (closed set of 2 retailers, hardcoded branches per the scope
  directive) — only relevant if DocProcess-side mapping work is ever scheduled.
- **Item C (invoice identity column)**: approved, spec written, not yet implemented.
Active area: **Item C is the only remaining approved Recepții item** —
[reception-screen.md](../wiki/reception-screen.md).

## Relevant Files
- `S1/JS/AJS/InfiniteInvoice.js` — native Infinite invoice XML builder (Auchan/Dedeman only).
- `S1/JS/AJS/RECADV.js` — `createInvoiceFromReception` (`X.CreateObj('SALDOC;EF')`), now also
  copies `DATE01` and `CCCSELLERID`.
- `S1/JS/SALDOC_EF_27072026.js` — `ON_SALDOC_SERIES` guard (7121/7122/7123, `X.SYS.USER==1002`).
- `src/services/get-invoice-dom/get-invoice-dom.class.js` — routes Infinite vs DocProcess.
- `src/services/edi-invoices/edi-invoices.class.js` — upload (plain XML, no signing) +
  post-upload FTP verification + `sendInvoice` logging.
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
Item C ("Trimite" invoice identity column) is the last approved Recepții item —
[reception-screen.md](../wiki/reception-screen.md). Two small follow-ups also worth closing:
re-verify that a NEW invoice created via the "Facturează" button flips the source advice's
`FULLYTRANSF` to 1 automatically post-deploy, and delete the stray root-level file
`documentatieFAEX1-PF-40689_2026-08-27.xml` accidentally committed in `66e59c42` (a missing path
separator — the intended copy is already in `documentatie/Fluxuri complete EDInet Auchan-Dedeman/`).

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
