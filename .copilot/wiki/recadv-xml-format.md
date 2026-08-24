# RECADV XML format (Infinite/EDInet)

Real, measured format of RECADV (reception-advice) documents as delivered by Infinite/EDInet for
Auchan and Dedeman — differs from the v4.0 spec in several places. Based on the full captured
corpus: 101 files, 2026-07-20..28.

Corpus: `documentatie/infinite_samples/recadv/*.xml` (101 files, git-ignored — see
[documentatie-folder-map.md](documentatie-folder-map.md)).
DO backup: `archive/recadv-capture/infinite/unresolved/RECADV/<date>/<name>.xml`.
Scripts: `scripts/fetch-recadv-sample.mjs`, `diff-recadv-vs-spec.mjs`,
`reconcile-recadv-vs-soft1.mjs`, `recadv-retailer-breakdown.mjs`.

## Transport
- **`RETR` on `/recadv` is NON-CONSUMING** (101 before / 101 after, proven twice: 3 then 98).
  Also non-consuming on `/retann` (5 before / 5 after) despite its `sent/` subfolder.
  `/orders` still IS consuming — do not generalize.
- Filenames numeric, no business meaning. Encoding UTF-8, root `<Document>`, 101/101.

## Retailers
- **Auchan DOES send RECADV**: `BuyerParty/GLN=5940475172008` "AUCHAN Romania SA", 23 files, 220 lines.
- Dedeman: `5940475841003`, 78 files, 1304 lines.
- Auchan `SellerId` varies (3837 / 5613 / 2219); Dedeman is always `0000003419`.

## Header behaviour (per retailer — they differ!)
| field | Dedeman | Auchan |
|---|---|---|
| `DeliveryDocumentNumber` | present 78/78 | **ABSENT 0/23** |
| `BuyerOrderNumber` | present, matches `FINDOC.NUM04` | present, 8-digit zero-padded (`01433687`) |
| `QuantityOrdered` | always empty | **always filled** (220/220) |

- `DeliveryDocumentNumber` has THREE forms: full `AEX-AE-053744`, stripped `53986`, and
  **truncated at 16 chars** when consolidating (`AEX-AE-053657/AE`) — normalize on the trailing
  6 digits (`RIGHT(FINCODE,6)`).
- `BuyerOrderNumber` can be comma-separated (4/101 files, up to 3 orders).
- `GoodsReceiptDate`, `BuyerOrderDate`, `DeliveryDocumentDate` empty 0/101.
- `NumberOfItems` correct 101/101. `NumberOfDocuments` = 1 in 101/101 (space-padded, trim).

## Line behaviour
- `Item/BuyerOrderNumber` **absent 0/1524** despite being spec-mandatory -> the header is the only
  order/advice reference. ("Lines are authoritative" is WRONG.)
- `Item/UnitNetPrice` **absent 0/1524** — no prices arrive; value must come from Soft1.
- `QuantityReturned` and `ReasonForReturnDescription` empty 0/1524.
  `ReasonForReturnCode` filled on only 5/1524. Shortage MUST be computed as shipped(7111) minus
  QuantityAccepted.
- `UnitOfMeassure` (spec typo, two s) always `BUC`, 1524/1524. No item tags outside the spec table.

## Resolution rule (validated, 101/101 resolved, 0 failures)
1. Advice code first: `RIGHT(FINDOC.FINCODE,6)` == trailing digits of `DeliveryDocumentNumber`.
2. **If the advice string is truncated (contains `/`), UNION with the order lookup** — the truncated
   header only names the first advice. Advice-only on those loses ~74 lines and produces
   impossible negative deltas.
3. Fallback `FINDOC.NUM04` == `BuyerOrderNumber` (the only option for Auchan).

Measured: advice=71, advice+order=7, order=23, unresolved=0.

## Business rules
- **Skip pallet lines** (`ProductDescription` matching /palet/i; codes `9200520`, `9200521`).
  39 such lines in the corpus. They have no MTRL and no `CCCS1DXTRDRMTRL` mapping. See also
  [soft1-schema-facts.md](soft1-schema-facts.md#pallet-only-advices-on-series-7111) for the
  Soft1-side confirmation that this is a real, distinct advice category.
- `BuyerItemID -> CCCS1DXTRDRMTRL.CODE` (scoped by the advice's own TRDR) resolved **1485/1485**
  product lines. GTIN vs `MTRL.CODE1` mismatched on 42 lines — warning only, never resolve on it.
- **Several RECADV files can target the same advice** (4 receptions in the corpus). Quantities must
  be aggregated per advice BEFORE computing a delta, otherwise one physical shortage yields two
  9221 candidates. Example `AEX-AE-053669`: file A accepted 16, file B accepted 4, shipped 20 ->
  clean only after aggregation.
- BUT some of those pairs are **duplicates, not splits**: `DocumentNumber` prefix `5017…` vs
  `4600…` for the same advice, same product, same qty, same day, giving accepted 12 > shipped 6.
  `accepted > shipped` is physically impossible -> hard guard, route to human, never auto-9221.
- Auchan advices are issued to campus/DC branches (`901 Campus Auchan AMBIENT`, `51940 CAMPUS Deva
  CALAN`), never to the store named in the RECADV `ShipToParty`. Order->advice was 1:1 in every
  checked case, but see the 6336-unit outlier below (now explained).

## Measured clean rate on real RECADV data
Replaces the earlier Soft1-side ~84% proxy estimate.

| retailer | files | receptions | lines | clean receptions | diff lines | clean lines |
|---|---|---|---|---|---|---|
| Dedeman | 78 | 74 | 1265 | 72/74 (97%) | 2 | 99.8% |
| Auchan | 23 | 23 | 220 | 20/23 (87%) | 3 | 98.6% |

Only 5 differing lines in 1485. Window is 8 days — treat as indicative, not annual.

Full list of the 5 differences (shipped vs accepted, delta):
| files | retailer | advice | code | shipped | accepted | delta |
|---|---|---|---|---|---|---|
| 636944625 | Auchan | AEX-AE-053715 | 340171 | 7728 | 1392 | 6336 |
| 636944627 | Auchan | AEX-AE-053710 | 363360 | 417 | 416 | 1 |
| 637120081+637128463 | Dedeman | AEX-AE-053774 | 7052359 | 6 | 12 | **-6** |
| 638188793+638192676 | Dedeman | AEX-AE-053986 | 7052359 | 6 | 12 | **-6** |
| 638200252 | Auchan | AEX-AE-053964 | 401295 | 332 | 328 | 4 |

The two negative deltas are the duplicate-file cases, not real shortages. The `340171` outlier
(shipped 7728 vs accepted 1392, advice `AEX-AE-053715`) is explained in
[reception-screen.md](reception-screen.md#resolved-investigations): both products were rejected at
reception for quality problems and a return advice was issued — a real commercial event, not a
data/engine bug.

## Incident: our own investigation RETR calls flip "read" in the EDInet portal (2026-08-05)
- Beneficiary reported that RECADV/RETANN advices now show as "read" in the Infinite EDInet **web
  portal** — the manual invoicer relies on that unread/read indicator to know what still needs
  manual invoicing, and lost track after our captures.
- Root cause: the manual investigation scripts (`fetch-recadv-sample.mjs`, `list-recadv-timestamps.mjs`)
  ran real `RETR`/`LIST` against the **production** Infinite FTP account across sessions
  2026-07-21, 07-27, 07-28 to capture the 101 RECADV + 5 RETANN corpus. `RETR` is non-consuming
  (file stays on the FTP server) but the EDInet portal apparently tracks a separate "seen" flag
  keyed off FTP access, independent of file deletion.
- **Not a production-code bug**: the live `scanAll()` cron never touched `/recadv` or `/retann` for
  the reasons above — these were one-off research captures.
- **Lesson: do not run further FTP `RETR`/`LIST` captures against a retailer's live EDI account**
  once humans are known to rely on portal-side read/unread state, without warning the beneficiary
  first — even reads considered "safe" (non-deleting) can have side effects outside our own systems.

## Ingestion mechanics in this repo
- `infiniteProvider.docTypes` is a **getter gated on `EDI_ENABLE_RECADV`** (only the literal string
  `'true'`). `docTypes` is the ONLY gate on what the scanner fetches. `filenamePrefixes` is a filter
  where `[]` means "accept every XML in that dir" — safe only for a docType with its own
  `remoteSubdir`. DocProcess shares one inbox for orders+aperak and must never return `[]` (contract
  test enforces).
- `remoteSubdir('retann')` is `/retann/`, NOT the `/retanns/` in the 2012 EDInet Connector manual.
- `scanner.insertRecadvRow`: `CCCSFTPXML` row, `EDIDOCTYPE='RECADV'`, terminal status **`INGESTED`**
  (never `NEW` — that means "make a SALDOC"), `JSONDATA` = parseRecadv payload **minus `raw`**.
  Routes on `BuyerParty/GLN`, fail-closed via `insertRoutingErrorRow` (TRDR 0 / ERROR).
- `infiniteProvider` has **no `parseAperak`** — Infinite acks with RECADV, which must never reach
  `CCCAPERAK`. Every new doctype also needs a branch in `do-retry.js`, or its DO objects park forever.

## CRITICAL BUG (found and fixed 2026-08-05): scanner silently dropped extensionless RECADV files
`isXmlLikeFile()` in `src/edi/scanner.js` required the filename to end in `.xml` or `.confirm`.
Infinite's real `/recadv` filenames are **bare numeric IDs with no extension** (`639471174`, not
`639471174.xml` — the `.xml` suffix seen on seeded/DB rows was added by our OWN capture scripts, not
the server). Every bare-numeric file — the majority of live traffic for BOTH retailers — was
silently filtered out and never reached `insertRecadvRow`. This explained "Auchan unchanged at 23
since the seed": Auchan never got a single renamed file, so 100% of its live RECADV traffic was
being dropped.

**Fix**: `isXmlLikeFile(fileName, docType)` now only enforces the `.xml`/`.confirm` extension for
`orders`/`aperak` (shared inboxes where non-XML junk can appear); for `recadv`/`retann` (dedicated
remote directories) it accepts anything except `.zip`/`.tmp`/`.log`. **Do not re-tighten this
filter** without re-verifying real Infinite filenames first — only the DIGITS are guaranteed, not
the extension.

**Deployed and verified 2026-08-05** (commit `9a1b297d`, `origin/feat/edi-safety-sftp-tests`, auto-
deployed to Heroku `retailers4`). Auchan RECADV rows jumped 23 -> 40 (17 backlog files caught up).
The ~9 oldest backlog files (mtime 2026-07-28, outside the default 7-day `EDI_DOWNLOAD_AGE_DAYS`
window) were still not ingested at verification time — low priority.

## DO bucket "accumulation" incident (2026-08-13) — leftover research backups, not a production bug
- Root cause: **NOT** a live-pipeline problem. `archive/<type>-capture/` is a prefix used only by
  the one-off research scripts, and unlike `incoming/`/`retry/` (which the scanner/retry loop manage
  automatically) it is **never auto-cleaned**.
- **Diagnostic pattern for "why did X accumulate in DO"**: (1) check the key prefix — `retry/`/
  `incoming/` = real stuck production item, `archive/` = intentional manual backup awaiting
  cleanup; (2) check upload timestamps — all-at-once = one script run, spread out = organic;
  (3) cross-check the DO keys against the git-tracked local corpus folder
  (`documentatie/infinite_samples/{recadv,retann}/`) — if they match 1:1, the data isn't at risk of
  loss by deleting the DO copy; (4) cross-check filenames against `CCCSFTPXML` via read-only SQL to
  confirm production already has (or is missing) the corresponding row.
- Found a genuine small gap: 9 Dedeman RECADV files dated 2026-07-28 existed in DO + local git but
  had no `CCCSFTPXML` row — too new for the original seed capture and exactly 1 day too old for the
  live scanner's `EDI_DOWNLOAD_AGE_DAYS=7` window once RECADV ingestion went live — a boundary miss,
  not a bug. Fixed with a narrow one-off insert script (not committed), matching the live scanner's
  bare-numeric filename convention. Then deleted all 120 stale DO objects under
  `archive/recadv-capture/` and `archive/retann-capture/`.
- **Filename convention trap**: `seed-recadv-corpus.mjs` inserts `XMLFILENAME` as the local file
  name *including* `.xml` (doubled for `DEDEMAN_RECADV_*.xml.xml` local files). The live scanner
  inserts the bare FTP filename with no extension (or single `.xml` for Dedeman-prefixed names).
  Always dedupe by parsed `advice`+`trdr` reality, not just by the seed script's filename-match
  check, before trusting its dry-run "would insert" count as "genuinely missing."
- `CccsftpxmlService.create()`'s AJS `createSftpXml` endpoint can return the **same** bogus
  `CCCSFTPXML` id for sequential inserts (same family as the known APERAK id bug) even though the
  actual DB rows are created correctly with distinct ids. Don't trust `createSftpXml`'s returned id;
  re-verify by querying `CCCSFTPXML` when it matters.

## See also
- [reception-screen.md](reception-screen.md) — the reconciler that scores RECADV lines and the UI
  built on top of it.
- [retann.md](retann.md) — the parallel RETANN (unsold-goods-return) flow.
- [soft1-schema-facts.md](soft1-schema-facts.md) — the Soft1-side document chain RECADV feeds into.
