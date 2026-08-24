# Pet Factory retailers — LLM Wiki

Topic pages with durable "current truth" facts about this repo — each page is edited in place when
facts change, never appended to as a chronological log. See
`.github/instructions/session-memory.instructions.md` for how this fits with
`.copilot/context/current-focus.md` (short operational snapshot) and
`.copilot/context/open-threads.md` (tangential/unclear backlog).

## EDI pipeline
- [edi-pipeline-architecture.md](edi-pipeline-architecture.md) — general scanner/providers/
  transports/DO-storage architecture, status machine, guard-chain pattern, resolved incidents.
- [recadv-pipeline.md](recadv-pipeline.md) — RECADV feature architecture & status: the F1-F7
  implementation arc, current live status, config flag, resolved incidents, code pointers.
- [recadv-xml-format.md](recadv-xml-format.md) — RECADV (reception advice) real XML format,
  resolution rules, business rules, ingestion mechanics, measured clean rates.
- [retann.md](retann.md) — RETANN (unsold/expired goods return) real XML format, business rules,
  dormant staging tables, the missing-return-order-number gap. Blocked on RO-7627.

## Frontend
- [frontend-architecture.md](frontend-architecture.md) — current Lit/Vite/Tabler SPA architecture:
  file structure, routes, components, pages, service layer.
- [reception-screen.md](reception-screen.md) — **living page.** RECADV reconciliation model,
  implemented model change (score omitted lines), and the three approved-but-not-yet-implemented
  UI items (Trimite button, Facturează button, invoice-identity column).

## Soft1 ERP
- [soft1-schema-facts.md](soft1-schema-facts.md) — FINDOC document chain (aviz -> factură ->
  retur), FPRMS/series map, FULLYTRANSF bookkeeping, CCCDOCUMENTES1MAPPINGS config table, product
  matching rules.
- [soft1-text-encoding-mojibake.md](soft1-text-encoding-mojibake.md) — why Romanian diacritics/em
  dash get mangled round-tripping through SoftOne, and the `sanitizeForS1()` fix.
- [onboard-new-docprocess-retailer.md](onboard-new-docprocess-retailer.md) — runbook for wiring up
  a new DocProcess retailer, plus the "never auto-add a GLN" business rule.

## Repo/ops conventions
- [legacy-tables-cleanup.md](legacy-tables-cleanup.md) — 92 legacy Soft1 tables inventoried for
  deletion, cutover dates, do-not-touch list, deletion procedure. Awaiting beneficiary approval.
- [security-secrets.md](security-secrets.md) — secrets cleanup history, git hygiene traps,
  **rotation still not done** (open item).
- [spa-routing.md](spa-routing.md) — SPA server-side fallback routes.
- [documentatie-folder-map.md](documentatie-folder-map.md) — what's in `documentatie/`, what's
  actually gitignored there, and how to search it.
