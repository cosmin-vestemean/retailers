# RETANN (Infinite/EDInet) — unsold/expired goods returns

Real, measured format and business rules for RETANN, based on all 5 files captured 2026-07-28.

Corpus: `documentatie/infinite_samples/retann/*.xml` (5 files, mtimes 2026-07-20..24, git-ignored —
see [documentatie-folder-map.md](documentatie-folder-map.md)).
DO backup: `archive/retann-capture/infinite/unresolved/RETANN/<date>/<name>.xml`.
Capture: `node scripts/fetch-recadv-sample.mjs --dir /retann --all`. Inspect: `scripts/inspect-retann.mjs`.

## What RETANN actually is
Unsold/expired goods returned from stores — a PARALLEL flow, not a continuation of RECADV.
Small quantities of assorted articles, all `QuantityReturned` negative.
Both retailers send it (Dedeman 4 files, Auchan 1).

## Delivered schema DIFFERS from the v4.0 spec
| | spec v4.0 | reality (5/5) |
|---|---|---|
| root | `<Retann>` | `<Document><Retann>` (same envelope as RECADV) |
| party id | `ILN` | `GLN` |
| header | `RetannNumber` / `IssueDate` | `DocumentNumber` / `DocumentIssueDate` |
| UoM tag | `UnitOfMeassure` | **`UnitOfMeasure`** — ONE `s`, unlike RECADV's two |
| addresses | grouped in `AddressDetails` | flat fields |

29 distinct tags, identical in all 5 files — format is stable, just not the documented one.

## Absent 0/5 (spec said mandatory/dependent)
`RetannRefDoc`, `OrderAtBuyerParty/DocID`, `DesadvParty/DocID`, `UnitNetPrice`,
`MonetaryNetValue`, `QuantityOrdered`, `OriginalItemNumber`.

**=> RETANN cannot be linked to a 7111 advice or to a RECADV. No document reference exists at all.**
Conceptually correct anyway: expired stock spans many old deliveries; the return is a new
commercial transaction, not a delivery correction. Anchor on `buyer GLN + shipTo GLN + BuyerItemID`.

## What resolves
- `BuyerItemID -> CCCS1DXTRDRMTRL.CODE`: **13/13**.
- `ShipToParty/GLN -> TRDBRANCH.CCCS1DXGLN`: **4/4**, BUT each GLN returns TWO rows under different
  `TRDR` (e.g. `5940475841065` -> TRDR 11654 and 15244). **Must filter by the TRDR resolved from
  `BuyerParty/GLN`**, otherwise the fail-closed rule blocks valid documents.

## FTP layout / scanner facts
- Real dir is **`/retann/`**, singular. The 2012 "EDInet Connector" manual documents `/retanns/`;
  the plural directory does not exist on the live account.
- **RETANN filenames are purely numeric** (`636912442.xml`), like RECADV — the `AUCHAN_`/`DEDEMAN_`
  prefix filter used for `/orders/` matches nothing there. Route by GLN, not by filename.
- Scanner gate: each provider declares `docTypes`; `retann` is deliberately absent from
  `infiniteProvider.docTypes` until RO-7627, so the production cron never LISTs `/retann`.
  `filenamePrefixes` is only a filter (`[]` = no filter, safe only with a dedicated `remoteSubdir`).

## Parser notes
- Same product can repeat on multiple lines in one file (`637393663`: Auchan `17916` at -10 and -6)
  — aggregate per product inside the file too.
- `SellerItemID` empty on all Auchan lines and some Dedeman ones — never a key.
- No reason code / reason description at all: the return reason is not transmitted.
- `NumberOfItems` correct 5/5, `NumberOfDocuments` = 1 in 5/5.

## Consequences
- RECADV rules do NOT apply: no per-advice aggregation, no `accepted > shipped` guard.
- **PV hypothesis is dead**: neither RECADV nor RETANN carries a PV number or reason text.

## Business rules (beneficiary manual, Sorin Fliundra, 2026-07-24)
Source: `Manual_flux_retur_auchan_dedeman.docx`. Validated by the author on 2 real cases (Auchan
retur `4497049` -> invoice `RFVQ-FC-14864`; Dedeman retur `6100352505` -> `RFVQ-FC-14867`, both
2026-07-12), and independently confirmed against production data below.

- **Series = `7531` (`RFVQ-`, "Retur Factura vanzari (QV)"), COMMON to all retailers** — no per-client
  series, unlike the advice-based 7121/7122/7123.
- **Price = taken from the LAST dispatch advice to that branch containing the product.** If that
  advice does not cover the whole returned quantity, split the product across MULTIPLE invoice
  lines, walking backwards advice by advice, each line at its own source advice's price. A line's
  quantity may never exceed what is still available on its source advice. Every line must reference
  its source advice (via `MTRLINES.FINDOCL`/`MTRLINESL`, writable via `X.CREATEOBJ`). This is
  FIFO-backwards allocation on paper — see the production-data caveat below.
- **Invoice the branch from `ShipToParty/GLN`** ("Transfer catre beneficiar"), never `BuyerParty/GLN`
  (central HQ). Branch GLN also lands in the invoice's `Contul` field and in Nume/Adresa/Localitate
  livrare.
- **Match products on `BuyerItemID`** ("cod la client") for BOTH retailers on this flow — no
  per-retailer rule, unlike the reception flow.

## GAP the manual exposes: the return order number is not in the XML
The manual requires invoice field `Comanda` = "Numarul de ordine de retur" (Auchan `4497049`,
Dedeman `6100352505`). **That number is NOT in the delivered FTP XML.** The payload carries only
`RetannHeader/DocumentNumber`, which is the Edinet internal id (manual example: RETANN `503498` /
`5017612837`). So the field the invoice keys on is visible in the Edinet web portal but absent from
the file we parse.

**Storage is NOT the constraint** — schema for a link already exists (see next section). The
constraint is **data availability**: the value simply does not arrive over FTP. Re-scope the
question to the beneficiary as "where do we source the return order number, if not from the file?",
not "where do we store it?".

## Prior art already in the DB (all dormant, discovered 2026-07-28)
- **`A_IKA_RETANN` + `A_IKA_RETANNDETAIL` — 0 rows.** A staging pair designed for exactly this flow,
  with the columns we thought were missing: `Retann` (Edinet doc no), **`COMANDARETUR`** (return
  order no), **`AVIZ`** (source advice), `ILNBUYER`, `ILNSHIPTO`, `NUM04`, `FINDOC`, `FINCODE`,
  `IMPORTED`, `filename`, `CCCS1DXID`, `Id_Guid`, `SellerID`, `TRDR`, `TRDBRANCH`, `SERIES`,
  `WHOUSE`. Someone designed this pipeline and never fed it.
- **`A_TMP_DEDEMAN_RETANN_*` (11 shredded-XML tables) — all 0 rows.** Built against spec v4.0: they
  include `_DESADVPARTY` and `_ORDERATBUYERPARTY`, precisely the elements absent 0/5 in real
  payloads. Independent corroboration that an earlier attempt was designed against the spec and
  never ran.
- **`A_TMP_EXPERT_RECADV` — 1185 rows, `_Imported=0` and `_FinDoc=0` on ALL of them.** 631 files are
  RECADV for **Remarkt Magazine S.R.L.** (GLN `5940475747008`), not Auchan/Dedeman. Dormant
  leftovers from a previous integrator; nothing was ever posted to a document.
- Existing `CCCS1DX*` naming family: `CCCS1DXGLN` on `TRDR`/`TRDBRANCH`/`BRANCH`/`COMPANY`/`MTRDOC`,
  `CCCS1DXID` on `TRDR`/`MTRL`/`MTRDOC`. Follow this convention for any new column.

**Recommended link design:** store RETANN as a `CCCSFTPXML` row with `EDIDOCTYPE='RETANN'` (the
column already exists) and patch it with the created `FINDOC` — this reuses the existing status
machine, DO backup, retry loop and UI at zero schema cost. Add a single reverse-lookup column on
`FINDOC` (e.g. `CCCS1DXRETANNDOC varchar(35)`) only if idempotency needs to be enforced from the
document side.

## `DocumentNumber` is one Edinet-wide sequence per retailer, not a doc-type id
Dedeman RETANN `5017658004` (07-20) sits in the same run as Dedeman RECADV `5017657475` (07-20);
the manual's 07-12 Dedeman RETANN is `5017612837`. Corpus families per buyer GLN:
Dedeman `5017…` 73/78 + `4600…` 2, `2200…` 1, `5900…` 1, `7900…` 1; Auchan `1285…` 8, `97xx…` 15.
=> in RECADV, a `5017…` and a `4600…` file describing the same advice are the same physical event
re-sent under a second sequence — duplicates, not splits. Reinforces the `accepted > shipped` hard
guard in [recadv-xml-format.md](recadv-xml-format.md).

## DB verification of the manual's 2 examples (production, read-only, 2026-07-28)
Both invoices exist and reconcile to the cent. `RFVQ-FC-14864` = `FINDOC 2170614`, TRDR 13248
(Auchan), `TRDBRANCH 1377` = AUCHAN BRASOV VEST 036, GLN `5940475172183`; `RFVQ-FC-14867` = `FINDOC
2170620`, TRDR 11654, `TRDBRANCH 8350` = MEDIAS 20, GLN `5949111999801`. Both `SERIES=7531`,
`SOSOURCE=1351`, `FPRMS=753`, `TRNDATE=2026-07-12`. All 3 lines match the manual's EAN / qty /
price / value exactly (9.10 x 52, 7.87 x 13, 11.03 x 1); `SUMAMNT` 638.82 and 12.24 include VAT 11%.

**Confirmed rules**
- `Comanda` = **`FINDOC.NUM04`** (`4497049` / `6100352505`). Careful: `NUM04` is a **float**, so
  Auchan's leading zero (`04497049`) is lost.
- Branch identity lives in `FINDOC.TRDBRANCH` -> `TRDBRANCH.CCCS1DXGLN`. (`MTRDOC.SHIPPINGADDR`
  actually holds the HQ address on both invoices; the printed form resolves the branch from
  `TRDBRANCH`.)
- Every line references its source advice and the source line's `PRICE` is copied verbatim (3/3).

**Corrections to the manual and to earlier notes**
1. The per-line link is **`MTRLINES.FINDOCL` / `MTRLINESL`**, NOT `FINDOCS`/`MTRLINESS`. Invariant:
   **1738/1738 lines** on all 260 return invoices since 2026-01-01 have `FINDOCL > 0`, always a
   `7111`.
2. The source advice is picked at **client (TRDR) level, not branch level.** The manual says
   "ultimul aviz catre acea filiala"; in reality none of the 3 example lines points to an advice for
   the returning branch: Auchan -> Campus AMBIENT (3438) and CAMPUS Deva CALAN (4545) while the
   return is Brasov Vest; Dedeman -> ALBA IULIA 66 (2964) while the return is Medias 20. For Auchan
   this is structurally unavoidable (we only ever ship to campuses/DCs, never to stores).
3. Not strictly "the last advice" either. For the Dedeman product, 6 advices dated 2026-07-10 all
   carried it at 11.03 and the one chosen was not the highest `FINDOC`; for Auchan the chosen advice
   was the 2nd-latest (03-27) though the latest (03-30) had enough quantity. Among equal-priced
   candidates the pick looks operator-arbitrary. The **price tier** is what matters (it had just
   moved 7.28 -> 9.10).
4. **Nothing in Soft1 stores the Edinet RETANN document number** — `CCCORDERDOC`, `REMARKS`,
   `COMMENTS`, `CCCBillingReference*` are all NULL on both invoices. So the only key the invoice
   carries (`NUM04`) is exactly the one missing from the XML: no automated reconciliation path
   exists today.

**Sizing (2026-01-01 .. 2026-07-24, series 7531, `ISCANCEL=0`)**
- Auchan 62 invoices / 333 lines; Dedeman 198 invoices / 1405 lines. ~260 returns in ~6.5 months.
- The multi-advice FIFO split is RARE: only **28 of 1676** product-per-invoice cases draw on more
  than one source advice (Auchan 5, Dedeman 23) => ~1.7%. A phase-1 implementation handling a single
  source advice covers ~98% of returns; the split can be a later phase or routed to a human.

## The manual's availability rule is NOT enforced in production — do not implement it literally
Manual section 6 says a return line may not exceed the quantity still available on its source
advice. Measured over the 473 distinct (`FINDOCL`,`MTRLINESL`) advice lines referenced by 2026
returns:
- **181 of 473 (38%)** are referenced by MORE THAN ONE return invoice; one advice line is
  referenced by 44.
- **127 of 473 (27%)** have cumulative returned quantity EXCEEDING the source advice line's own
  `QTY1`.

=> `FINDOCL`/`MTRLINESL` is used as a **documentary price anchor**, not as a stock drawdown. There
is no availability ledger and nobody enforces one. This also explains why the operator's pick
among equal-priced same-day candidates looked arbitrary — it IS arbitrary.

**Implementation consequence:** do NOT build FIFO drawdown accounting; enforcing the manual's cap
would fail-close ~27% of real cases. Pick any advice line for that client+product that carries the
correct price tier, and record it as a reference.

## Lessons from the dormant `A_IKA_RETANN*` design (what NOT to copy)
- `A_IKA_RETANNDETAIL` has **no `FINDOCL`/`MTRLINESL`** — the old design could not reproduce the
  per-line advice reference that production uses on 1738/1738 lines. Fatal gap; the header's
  `AVIZ nvarchar(300)` was a free-text field, not a verifiable FK.
- Line matching keyed on `EAN` + `_MATCODE` only, with no `BuyerItemID` column — contradicts both
  the manual (match on "cod la client") and our data (GTIN disagreed with `MTRL.CODE1` on 42 RECADV
  lines).
- Sloppy typing: `VOLUME`, `PRCDISC1`, `VALDISC1` declared `int`. (One thing it got right:
  `NUM04 bigint`, whereas the real `FINDOC.NUM04` is a `float`.)

## Minimal additions needed to the current architecture
`CCCSFTPXML` already has `FINDOC` and `EDIDOCTYPE`, so the file <-> document link costs ZERO schema
change: store RETANN with `EDIDOCTYPE='RETANN'` and patch `FINDOC` with the created 7531. The
per-line advice reference is native Soft1 (`MTRLINES.FINDOCL`/`MTRLINESL`), no new table. The only
column worth adding is one indexed `CCCEDIDOCNUM varchar(50)` on `CCCSFTPXML`, holding the
retailer/Edinet document number for ALL doc types (ORDERS `BuyerOrderNumber`, RECADV/RETANN
`DocumentNumber`) — it gives uniform dedup and replaces today's filename-based duplicate detection.

**Status: blocked on RO-7627** (not currently ingested; `retann` is deliberately absent from
`infiniteProvider.docTypes`).

## See also
- [recadv-xml-format.md](recadv-xml-format.md) — the sibling reception-advice flow (different
  business rules, do not conflate).
- [soft1-schema-facts.md](soft1-schema-facts.md) — `FINDOCL`/`MTRLINESL` vs `FINDOCS`/`MTRLINESS`
  semantics and the 9221/7531 conversion chain.
