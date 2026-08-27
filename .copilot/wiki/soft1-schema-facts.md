# Soft1 schema facts (PetFactory, COMPANY=50)

Verified facts about the Soft1 document chain that RECADV/RETANN ingestion and reception-screen
invoicing build on. Base date of verification: 2026-07-27, with later measurements dated inline.

## Pallet-only advices on series 7111
Measured 2026-08-05, 60-day window.
- "Advice with no order number" and "advice whose every line is a pallet" are the **same set**,
  100% in both directions. Auchan: 109 merchandise advices (all with `NUM04`, all with a source
  order, 98 invoiced) + **74 pallet-only** (all `NUM04=0`, `FINDOCS=0` on every line, **0 invoiced**,
  exactly 1 line each, always `MTRL.CODE='AM.00006'` "PALET - B1208A-800*1200 Block Pallet").
  Dedeman has **none**. **Zero mixed advices** on either retailer.
- Only ONE `MTRL` matches `NAME LIKE '%PALET%'` on 7111 over 180 days, so that heuristic is safe
  (and matches the RECADV reconciler's `/palet/i` — see [recadv-xml-format.md](recadv-xml-format.md)).
  `getReceptionsData` excludes pallet-only advices with `EXISTS (... m.NAME NOT LIKE '%PALET%')`,
  which keeps a mixed advice if one ever appears.
- Consequence: an empty "Comandă" column on the reception screen was never a data gap — it was 40%
  of Auchan rows being pallet paperwork. Do not "fix" it by sourcing an order number.

## Document linking (FINDOC chain)
- CKEY 7012 -> aviz 7111 -> factura 7122/7123 + retur 9221 is linked ONLY via
  `MTRLINES.FINDOCS` (source FINDOC) + `MTRLINES.MTRLINESS` (source MTRLINES).
- `getTableFields` reports `FINDOCS`/`MTRLINESS` as **readOnly**, but that constrains only
  `setData`/web services. They ARE writable through `X.CREATEOBJ` (confirmed 2026-07-27):
  `CreateObj('SALDOC;<view>')` -> `DBINSERT` -> `FindTable('ITELINES')` -> set per line ->
  `DBPOST`. No conversion job needed.
- `FINDOCL`/`MTRLINESL` ARE editable (editor `VSELASSLINES1`) — but they are NOT a "secondary
  link", they are a different concept: **storno target** ("which document does this line reverse"),
  vs `FINDOCS` = **provenance** ("where did this line come from").
  - `ON_POST` in `S1/JS/SALDOC_EF.js` makes `FINDOCL` **mandatory on series 9221 and 7531** and caps
    qty at `sum(qty1) from MTRTRN where findoc=FINDOCL and mtrl=...`.
  - 9221 (2026): 940 lines, 0 without FINDOCL, 100% with FINDOCS, FINDOCL==FINDOCS in 99.1% -> on
    9221 it is a hand-written duplicate of the read-only link.
  - 7531 (2026): 5304 lines, only 29% have FINDOCS -> there FINDOCL is the ONLY link.
  - `MTRLINESL` is optional (764/940 on 9221) and unused by the validation.
  - **ERP gap: the qty cap is not cumulative** (never subtracts earlier returns). Corrected count
    2026-07-28: **52 cases, 16 since 2025-01-01** (the older "78/17" is wrong). All 16 recent ones
    are the SAME return document issued twice (exactly 2x shipped qty), only Supeco + REWE, never
    Dedeman/Auchan. Guard must be anti-duplicate on source-document identity, not just a cumulative
    quantity check.
  - A `7531` whose `FINDOCL` points at a `7111` is usually an unrelated commercial/expired-goods
    return, not a receipt difference. Real example `RFVQ-FC-14882`: 22 lines, each targeting a
    DIFFERENT advice. Do not treat 7531->7111 links as RECADV shortages.
  - Practical consequence: returns do NOT need the conversion mechanism — FINDOCL is writable.
- Header fields `CCCOrderId`, `CCCDispatcheId`, `CCCBillingReferenceId` are NULL in this flow.
- `FINDOC.CCCORDERDOC` = internal ref like `SOGRP 032628 / SO 105772`, NOT the EDI order number.
- **`FINDOC.NUM04` = the EDI order number.** Propagates through conversion across CKEY 7012 -> aviz
  7111 -> factura 7122/7123 -> retur 9221. Populated on 100% of conversion-sourced docs (Dedeman
  604/604, Auchan 156/156 advices, May-Jul 2026); docs without it have no `FINDOCS>0` line = non-EDI.
  Stored already normalized (`1436603`, not `01436603`). It is a **float**: no alphanumeric /
  zero-significant order numbers. On consolidated invoices the header keeps only ONE source order
  (36/800 invoices consolidate 2-3), so it is a lookup key, not the traceability path.
- FINDOC has NUM01..NUM04 only (all float). There is no NUM0/NUM05+.
- FINDOC has no `FULLTOTAL`. Use `NETAMNT` / `VATAMNT` / `SUMAMNT` (SUMAMNT = with VAT).
- 9221 return amounts are stored **positive**; the minus sign is only a presentation convention.
- Invoice line carries the ACCEPTED qty; 9221 carries only the shortfall. Both point at the same
  advice line. It is NOT "invoice in full then credit note".

## FULLYTRANSF / QTY1COV (conversion bookkeeping)
Verified 2026-08-05.
- `FINDOC.FULLYTRANSF` (Smallint, readOnly, editor `$TransState`, exposed as `SALDOC.FULLYTRANSF`)
  + per-line `MTRLINES.QTY1COV`. Values: 0=unconverted, 1=fully, 2=partial, 3=historic/cancelled.
- **S1 maintains them AUTOMATICALLY** (ExtraUpdates) the moment a new doc's lines get
  `FINDOCS`/`FINDOCL` pointing at the source — even via `X.CREATEOBJ`, even with `SOISCONV` off.
  **Never write them by hand**; doing so double-writes and breaks native behaviour.
- **They do NOT block a second independent conversion.** Measured: **2257 advices** have BOTH an
  active invoice (`FPRMS=712, ISCANCEL=0`) AND an active `9221` return referencing them via
  `FINDOCS`. Example `AEX-AE-054096` (2182006) -> invoice `FAEX-PF-39974` + return `AAEX-PET-3085`.
  So FULLYTRANSF only accumulates statistics; it is NOT a usable "already invoiced" flag.
  **For "is this advice invoiced?" always use the explicit `MTRLINES.FINDOCS` link, never the flag.**
- Cancelling a derived doc does NOT reset the source's flag: of advices whose only `9221` returns
  are cancelled, 60 stayed at `FULLYTRANSF=1`, 1 returned to 0. Hence guards should combine the flag
  with a "reality check" (does an ACTIVE `ISCANCEL=0` doc still reference the source?) rather than
  trusting the flag alone. Pattern documented in `documentatie/FULLYTRANSF_CONVERSION_GUARD.md`
  (from the sibling SmartDocs/MultiRetur project).
- **CORRECTION, verified 2026-08-27: "even via X.CREATEOBJ" above does NOT hold for a plain
  `CreateObj('SALDOC;EF')` + manual `ITELINES.FINDOCS=` insert** (the pattern `RECADV.js`
  `createInvoiceFromReception` uses). Live check on advice `FINDOC=2206364` → invoice `2208760`
  (14/14 lines linked, `FINDOCS`/`MTRLINESS` matching exactly): source `FULLYTRANSF` and every
  line's `QTY1COV` stayed **0** after `DBPOST`. The MultiRetur project's "S1 updates it
  automatically" finding was verified on its own (different) Conversie/`FINDOCL` path, not this
  one — the two document-creation mechanisms are NOT equivalent for this bookkeeping. Fix applied
  in `RECADV.js` (`markFullyTransfIfCovered`): after `DBPOST`, compute per-line coverage directly
  from `MTRLINES.FINDOCS`/`MTRLINESS` (not from `QTY1COV`, which this path never populates) and
  `X.RUNSQL('UPDATE FINDOC SET FULLYTRANSF=1 ...')` by hand only when every source line is fully
  covered. Deliberate, scoped exception to "never write it by hand" — justified because the
  automatic mechanism is proven not to fire on this path, so there is no double-write risk.

## "Is this advice invoiced?" — the correct predicate
Verified 2026-08-05.
- **Do NOT hardcode `FPRMS=712` / `SERIES=7122`** — that is Auchan only. Dedeman invoices on
  `SERIES=7123`, `FPRMS=716`. Hardcoding 712 silently reports **0 invoiced** for all of Dedeman.
- Use the document TYPE instead: `SALFPRMS.TFPRMS = 103` = invoice (both retailers).
  `TFPRMS = 154` = return advice `9221` (`FPRMS=922`). Join
  `SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY`.
- Canonical predicate:
  ```sql
  EXISTS (SELECT 1 FROM MTRLINES l
          JOIN FINDOC i ON i.FINDOC = l.FINDOC AND i.ISCANCEL = 0
          JOIN SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY
          WHERE l.FINDOCS = adv.FINDOC AND p.TFPRMS = 103)
  ```
- Measured 2026-07-01 -> 08-05, `SERIES=7111, ISCANCEL=0`:
  Dedeman 342 advices / 228 invoiced / **114 not**; Auchan 128 / 64 / **64 not**.
- `FULLYTRANSF` agrees with this predicate on **469 of 470** advices; the single mismatch is the
  documented "cancelled derived doc leaves a residual flag" case. Good cross-check, NOT a source of
  truth (it also cannot distinguish invoice from 9221 — both set it).
- Table `SALDOCSERIES` does NOT exist; series names must come from elsewhere.
- Joining `MTRLINES` with `ON (l.FINDOCS = adv.FINDOC OR l.FINDOCL = adv.FINDOC)` **times out**.
  Query the two link columns separately.
- SQL Server is **2025 (17.0)**, compat level 170 — `STRING_SPLIT` is available and works. Note
  `sys.system_objects` does NOT list `string_split`; test it by calling it, not by lookup.
- Aggregates cannot wrap subqueries (`Ole Error 80040E14`) — compute the flag in a derived table,
  then aggregate.

## Series/FPRMS map (confirmed via `SALFPRMS`, 2026-08-24)
| document | series | FPRMS | TFPRMS | SODTYPES | notes |
|---|---|---|---|---|---|
| Aviz (advice) | 7111 | 711 | 101 | 51 | SOSOURCE 1351 |
| Invoice — other clients / Auchan | 7121 / 7122 | 712 | 103 | 51 | 7121 and 7122 **share FPRMS 712** — FPRMS is NOT 1:1 with series |
| Invoice — Dedeman | 7123 | 716 | 103 | 51 | own FPRMS |
| Retur (return advice) | 9221 | 922 | 154 | 51 | |
| Retur factură | 7531 | 753 | 151 | 51,52 | |

All five share `SOSOURCE=1351` and `SODTYPES` starting with 51. `NOCONVERT=0` and `DELCONVERT=1` on
712/716/753/922 confirm Soft1's native "convert document" mechanism is enabled for all of them.

## CCCDOCUMENTES1MAPPINGS — the {SOSOURCE, FPRMS, SERIES} config table
Audited 2026-08-05.
- Real columns: `TRDR_RETAILER, TRDR_CLIENT, SOSOURCE, FPRMS, SERIES, DOCUMENT_TYPE, DIRECTION,
  AUTO_PROCESS, ACTIVE, TEST_MODE, INITIALDIRIN/OUT, XML_ROOT_PATH, HEADER_PATH, LINES_PATH`.
  There is **no `DOCTYPE`/`ISACTIVE` column** — it is `DOCUMENT_TYPE` and `ACTIVE`.
- **`DOCUMENT_TYPE` for invoices is misspelled `INVIOCE`** — systemically, on all 6 rows.
  `WHERE DOCUMENT_TYPE = 'INVOICE'` silently returns nothing.
- Values present: `ORDER`/INBOUND 9 retailers, `INVIOCE`/OUTBOUND 6, `DESADV`/OUTBOUND **1**
  (Dedeman only), `RETANNS`/INBOUND **1** (Dedeman only).
- **The table is INCOMPLETE — do not treat it as authoritative.** Dedeman 11654 is fully mapped
  (ORDER 701/7012, INVIOCE 716/7123, DESADV 711/7111, RETANNS 753/7531) but **Auchan 13248 has only
  an ORDER row**, despite demonstrably invoicing on `FPRMS=712 / SERIES=7122`. This is confirmed
  **not a real defect** — see "what actually reads it" below.
- It also contains stale config: `13249 ROMANIA HYPERMARCHE SA` (a **Carrefour** legacy entity,
  `ISACTIVE=0`, AFM 14374293) still has an active `INVIOCE` row on 712/7121. **Do not confuse `13249`
  with Auchan.** Auchan is `13248` "Auchan Romania S.A.", AFM 17233051. Carrefour is `11322`
  "Carrefour Romania S.A."; `13249` is its inactive sibling entity.
- Consequence: for "which series is an invoice?", prefer the data-driven `SALFPRMS.TFPRMS = 103`
  (complete, works for both retailers, zero config) over this table. Fix the table before relying on
  it to drive any Soft1-side gate (e.g. an `ON_AFTERPOST` series filter).

### What actually reads this table
Audited 2026-08-05 — it is ~90% documentation, ~10% mechanism.
- **The only load-bearing consumer is `src/edi/order-builder.js`**: finds by
  `{SOSOURCE, FPRMS, SERIES, TRDR_RETAILER}`, takes `[0]`, and uses its PK to fetch the child
  `CCCXMLS1MAPPINGS` field rows. **It does NOT filter on `DOCUMENT_TYPE`, `DIRECTION` or `ACTIVE`**
  — so those three columns are decorative for the live pipeline, and the `INVIOCE` typo is harmless
  today.
- `src/services/retailer/retailer.class.js` returns every row for a retailer as `S1DocumentSeries`,
  but **nothing consumes that field** (grep: 2 hits, both in that file). Dead payload.
- Also referenced by legacy `sftp.class.js` and the config UI (`doc-mappings-editor.js` +
  `xml-mapping-table.js`).
- Child-row counts reveal which rows are real: `INVIOCE` for the 5 DocProcess retailers has **66
  field rows each**; `ORDER` has 7-8 each (9 retailers, incl. Auchan 13248 = 8). Dedeman's own
  `DESADV`(44), `INVIOCE`(45) and `RETANNS`(46) rows have **0 children** — empty placeholders.
  Infinite invoice/DESADV XML is produced by the Soft1-side `G_XML_ExportDoc` path, NOT from this
  table.
- So "Auchan is missing an invoice row" is **not** a real defect: nothing would read it.
- `13249` (inactive Carrefour entity) has COMPLETE mappings (66 + 8 children). It is inert because
  lookups are by TRDR. **Do not delete it** — that would destroy real field-mapping data.
- Practical rule: do not clean this table as a chore. Only add/repair a row when something is
  actually about to read it. (2026-08-24 update: only 1 new data row was actually needed for the
  reception-screen "Facturează" button work — see [reception-screen.md](reception-screen.md).)

## CCCS1DXTRDRMTRL (retailer-specific product codes)
- Columns: MTRL, MSODTYPE, TRDR, TSODTYPE, LINENUM, CODE varchar(20), NAME, COMMENTS, UnitPack.
- **No COMPANY column** — filter on TRDR only. Covers 22 retailers.
- Auchan 13248: 749 rows / 749 distinct codes, 0 ambiguity (strict 1:1).
- Dedeman 11654: 466 rows / 465 codes; one collision `CODE=7050535` -> MTRL 34594 + 34294.

## Product matching from EDI
- Use `BuyerItemID -> CCCS1DXTRDRMTRL.CODE` for TRDR. Zero failures over 119 Auchan pairs.
- NEVER fall back to EAN/GTIN: fails 11/119 (9.2%). Two causes:
  (a) Auchan sends a sibling variant's EAN (424337, 423804, 423807, 423802, 341308);
  (b) `MTRL.CODE1` is not unique — 167 duplicate EANs in COMPANY=50.
- `ProductDescription` in the order XML is truncated to ~30 chars and drops the colour variant, so
  it cannot disambiguate either.

## Identifier normalization
- Auchan `BuyerOrderNumber` arrives zero-padded to 8 chars (`01436603` for order 1436603).
- Delivery-note advice refs (`53184/53186`) = our FINCODE minus series prefix and leading zeros,
  slash-joined (`AEX-AE-053184`). Reverse lookup needs zero-padding to 6 digits.

## Soft1 WS API for schema introspection
- `getObjectTables` / `getTableFields` work with the mcp-soft1 credentials
  (see `mcp-soft1/soft1-client.js`, appId 1001, COMPANY 50/BRANCH 1000/MODULE 0/REFID 1000).
- `SALDOC` has 51 tables; `SALDOC`->FINDOC, `ITELINES`/`SRVLINES`/`ASSLINES` all -> MTRLINES.
- Captions come back in Greek; ignore them.

## See also
- [recadv-xml-format.md](recadv-xml-format.md), [retann.md](retann.md) — the EDI flows that produce
  the 7111/7531 documents referenced here.
- [reception-screen.md](reception-screen.md) — the "Facturează" button design, built directly on
  the FINDOCS/FINDOCL and FPRMS facts in this page.
