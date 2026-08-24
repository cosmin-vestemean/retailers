# Legacy tables cleanup (awaiting beneficiary approval)

Inventory and deletion plan for the Soft1-side tables that fed the pre-cutover (pre-2026-06)
EDI integration path, now measurably dead. **No `DROP` has been executed — this is a plan awaiting
beneficiary approval**, tracked as `open-threads.md` entry `legacy-tables-cleanup-approval`.

Full source document (Romanian, beneficiary-facing):
`documentatie/Fluxuri complete EDInet Auchan-Dedeman/Tabele_vechi_candidate_la_stergere.md`.

## Why these tables are dead

The legacy Soft1-side shred/import path stopped dead at the 2026-06-09 pipeline cutover (see
[edi-pipeline-architecture.md](edi-pipeline-architecture.md#resolved-incidents-do-not-re-diagnose)):
- `A_TMP_AUCHAN_DOCUMENT` ran at 38-77 documents/month for 17 months, dropped to 9 in June 2026,
  and produced nothing after **2026-06-05**.
- The Dedeman equivalent stopped on **2026-06-09 16:22** — the exact moment the new scanner took
  over live traffic.

92 legacy tables (~284 MB total) were inventoried and tiered by row count, last-data date, code
references, and SQL dependencies.

## Rules for any future cleanup pass

- **Every `A_TMP_*` table is referenced by one or more `G_*` views/procs** — these must be dropped
  together, never the table alone (a lingering view over a dropped table is its own kind of mess).
- **Do not touch, under any circumstances:**
  - `G_XML_ExportDoc` and its three callees — still live, confirmed by a real invoice export as
    recently as 2026-07-28.
  - `A_IKA_ORDER` / `A_IKA_ORDERDETAIL`
  - `CCCDOCPROCDANTEXML*`
  - `CCCEDIPROVIDER`
- **Before dropping anything:**
  1. Script every `G_*` object being removed into `S1/SQL/legacy/` (so the DDL survives even after
     the live objects are gone).
  2. Export `CCCEDIGLNMAPPINGS` (207 GLN -> TRDR rows) — may still be worth keeping independent of
     the rest of the legacy layer.
  3. Prefer `sp_rename ... 'ZZ_DEL_<name>'` over an immediate `DROP`, and wait about a month before
     the actual drop — cheap reversibility for a low-priority, low-risk cleanup.
- Get **explicit beneficiary approval** before renaming/dropping anything — this is scoped and
  tiered, not executed.

## Related: dormant RETANN/RECADV staging tables

A subset of the legacy inventory — `A_IKA_RETANN` / `A_IKA_RETANNDETAIL` (0 rows), eleven
`A_TMP_DEDEMAN_RETANN_*` shredded-XML tables (0 rows, modelled on spec v4.0 fields that don't
exist in real payloads), and `A_TMP_EXPERT_RECADV` (1185 rows for a third-party client, Remarkt,
not Auchan/Dedeman — still trickles a few files a year, never imported) — is a **never-fed**
design, not a stopped one. Full detail (schema, feeding views `G_DEDEMAN_Retann_*`, and the
decision of whether to reuse or replace it) is in
[retann.md](retann.md#prior-art-already-in-the-db-all-dormant-discovered-2026-07-28) — don't
duplicate it here, this page only notes it belongs to the same tiered inventory document.

## Status

Open, low priority, awaiting beneficiary approval (`open-threads.md`:
`legacy-tables-cleanup-approval`). No schema change has been made.

## See also
- [retann.md](retann.md) — the dormant staging tables in full detail.
- [soft1-schema-facts.md](soft1-schema-facts.md) — the live schema this cleanup must not disturb.
