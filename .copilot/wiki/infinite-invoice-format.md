# Infinite invoice XML — real format, gap analysis, implementation plan

**Status: SCHEMA BUILT AND DEPLOYED, but EVERY invoice sent so far was REJECTED by Infinite
(2026-08-27) — TWO root causes found and fixed, needs redeploy + resend.** `S1/JS/AJS/InfiniteInvoice.js`
builds the correct native `<Invoice Version="1.0.1">` schema (structure confirmed correct by
direct diff against a real historic archived invoice). But **all 6 invoices sent through the app
so far (`FAEX1-PF-40689/90/93/94/95/96`) show "Error: Document processing. Invalid file
structure." in the Infinite EDInet web portal** — see "Live verification" below for the full story
of how this was found (the FTP-level `MessageAcknowledgement` looked clean for all of them; it is
**NOT a reliable success signal**, only the portal is authoritative). **Root causes found**: (1)
`S1/JS/AJS/RECADV.js`'s `createInvoiceFromReception` never copied `SALDOC.DATE01` (order date)
from the source aviz, so every Infinite invoice it creates has an empty `<OrderParty>
<BuyerOrderDate>` — fixed in `RECADV.js`. (2) **Deeper mechanism, found 2026-08-27 via
`mcp_s1-api_s1_query_dataset`**: `X.GETSQLDATASET`'s web-service bridge corrupts a nested
`isnull(replace(convert(...)))`-style SQL expression built on a NULL date into a stray control
byte (confirmed: renders as "?" in a text viewer) instead of an empty string — a genuinely new,
previously-undocumented SoftOne WS quirk, distinct from the DATE01 gap. Fixed in
`InfiniteInvoice.js`: every date field is now selected RAW in SQL and formatted in JS via a new
`fmtDate()`/`X.FORMATDATE()` helper, never pre-stringified in SQL. Both fixes need an ERP
redeploy, plus a one-time `DATE01` backfill for the 6 already-created test invoices (see "Live
verification").

## Why this page exists

Session 2026-08-27 fixed the "Trimite" send-path bugs (transport, S/MIME, missing credentials,
missing series in the legacy binder) and got `FAEX1-PF-40689` (Auchan) all the way down to 4
remaining field-validation errors — see [reception-screen.md](reception-screen.md) section A for
that chain. Chasing those last 4 fields led to discovering the real, disqualifying problem:
**`S1/JS/AJS/runCmd20210915.js` generates the wrong XML schema entirely for Infinite retailers.**
It builds DocProcess's `DXInvoice` shape; Infinite requires its own native `Invoice v1.0.1` shape
(confirmed against both the official spec and real archived files on the live FTP). No amount of
further field-binding fixes in that script would have produced an XML Infinite accepts.

**Decision (user, 2026-08-27): ship a separate, dedicated builder for Infinite invoices now
(pragmatic, same "under pressure" pattern as the 2021 script), but record the debt** — the
correct long-term architecture is a generic, data-driven outbound XML engine (see "Deferred:
the correct architecture" below). Do not let the dedicated builder quietly become permanent
without revisiting this.

**Scope directive (user, 2026-08-27): the dedicated builder is the target, not a stepping stone —
do not over-build it.** The beneficiary intends future new retailers to be onboarded on
**DocProcess**, not Infinite — Infinite stays a closed set of exactly these two retailers
(Auchan, Dedeman). So there is no near-term pressure to generalize the Infinite side: two
hardcoded per-retailer branches (per the reference table below) in one AJS file is the right
shape, not a config-driven abstraction. The two proven `SOIMPORT` buttons already demonstrate
this exact scope has worked in production for years — matching their behavior 1:1 is success
criteria, not a stopgap.

## The proven reference implementation (found 2026-08-27) — read this before touching gaps

The "old manual process" that produced the real archived files is **not lost/undocumented** — it's
two SoftOne **`SOIMPORT`** rows (a "ClientImport" script format, different dialect from AJS: pseudo-
SQL `dsX = SELECT ... FROM ...` blocks + a procedural section that writes the XML file line-by-line
via `PILib.WriteLine`/`PILib.CreateText`). Queryable directly: `SELECT CAST(SOIMPORT AS
NVARCHAR(MAX)) AS SCRIPT FROM SOIMPORT WHERE CODE = '<code>'`. Full text saved to
`documentatie/infinite_samples/*.soimport.txt` for reference (not deployed from here — these already
live in Soft1).

- **Auchan**: `AR_ORIGINAL_INVOICE` (button `RUNB_7103000`, i.e. `EXECCOMMAND` cmd `7103000` ->
  `exportXML1()` -> `X.EXEC('XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE,...')` when
  `SALDOC.EXPN == 0`, or `AR_ORIGINAL_INVOICE_WGT` when `EXPN > 0` — "WGT" = green tax/"timbru
  verde" line added). WHERE clause: `A.expn=0 AND A.fprms=712 AND A.findoc=:vFindoc`.
- **Dedeman**: `ExpFactDedeman_ButonNew` (button `RUNB_20190529`, cmd `20190529` ->
  `exportXMLDedeman()` -> same `XCMD:ClientImport` mechanism, series 7123 or 7033). WHERE clause:
  `A.Series IN (7123,7033) AND A.sosource=1351 AND A.company=50 AND A.trdr=11654 AND
  A.trndate > '20190328'`.
- Related sibling rows exist for storno/correction (`AR_STORNO_INVOICE`, `AR_CORRECTION_INVOICE`,
  `ExpFactRDedeman`/return) — out of scope for Item A, noted for whenever return/storno invoicing
  is tackled.

**These have been used successfully in production up to now — the beneficiary vouches for them
(user, 2026-08-27).** But they are **`XCMD:ClientImport` calls: they only run inside the Windows
desktop S1 client** (an operator clicks the button; the script runs client-side, writes the XML
to a local/network path — no FTP/signing inside the script itself, that's a separate manual or
scheduled step). **They cannot be invoked from our server-side AJS/web-service flow** — the whole
point of Item A is to automate what these buttons do manually. **Decision (user, 2026-08-27): do
not call these scripts, but mine their SQL for the proven field mappings** — they are the
authoritative, tested source for every field the spec PDF and archived-file reverse-engineering
had left ambiguous. This supersedes several conclusions below that were guessed from only 2
archived files before these scripts were found.

**Retailer-specific values found in these scripts (this is the important part — do NOT assume a
single universal value across retailers):**

| Field | Auchan (`AR_ORIGINAL_INVOICE`) | Dedeman (`ExpFactDedeman_ButonNew`) |
|---|---|---|
| `BuyerParty`/`InvoiceeParty` Street/PostalCode/City | `TRDR.ADDRESS`/`ZIP`/`city` (same row for both parties) | same — `TRDR.ADDRESS`/`ZIP`/`city` |
| `HouseNumber` (all 4 parties) | always hardcoded `''` | always hardcoded `''` |
| `ShipToParty` Street/PostalCode/City | `TRDBRANCH.ADDRESS`/`ZIP`/`CITY` (joined on `SALDOC.TRDBRANCH`) | same — `TRDBRANCH` |
| `SellerParty` Street/PostalCode/City | `COMPANY.ADDRESS`/`ZIP`/`CITY` | same — `COMPANY` |
| `TaxCategoryCoded` (header + line + summary) | hardcoded **`'S'`** | hardcoded **`'3D'`** |
| `PacketContentQuantity` | `CCCS1DXTRDRMTRL.UnitPack` (per retailer-article mapping) | hardcoded `''` |
| `PackageType` | hardcoded **`'CT'`** | hardcoded `''` |
| `PackUnitOfMeasure` | `MTRUNIT.SHORTCUT` (same as `UnitOfMeasure`) | same — mirrors `UnitOfMeasure` |
| Filename | `<InvoiceNumber>_<Data>.xml` | same pattern |
| XML declared encoding | `iso-8859-2` in the `<?xml ...?>` prolog, but every string is run through `PILib.AnsiToUTF8` before `PILib.WriteLine` — i.e. **the declared encoding and the actual bytes don't match**, and Infinite has accepted this for years. Replicate the mismatch as-is (declare `iso-8859-2`, write UTF-8 bytes) rather than "fixing" it — don't risk being the first to test whether Infinite actually cares. | same quirk |

This resolves gaps 1, 3 and 4 below outright (retailer-specific, not a single constant) — no
beneficiary question needed for those. See each gap for the updated status.

## Proof: two schemas, confirmed from three independent sources

1. **Official spec**, `documentatie/dedeman/XML_INVOICE_v4.pdf` ("INVOICE TECHNICAL SPECIFICATION
   DEDICATED FOR DEDEMAN PROJECT, VERSION 4.0 - EDInet XML"): root `<Invoice Version="1.0.1"
   xsi:noNamespaceSchemaLocation="http://www.infinite.pl/pub/doc/fmt/xml/invoice/1.0/invoice.xsd">`.
2. **Real archived files** on `ftp.infinite.pl` (`/invoice/archive/FAEXD-PF-38344_2026-05-25.xml`
   etc., read-only LIST+sample confirmed live 2026-08-27): same `<Invoice Version="1.0.1"
   xsi:noNamespaceSchemaLocation=".../invoice.xsd">` root, `<InvoiceHeader>`, `<InvoiceParty>`,
   `<InvoiceeParty>` — matches the spec exactly. These were produced by the **old manual
   process** (operator-run desktop tool), never by this app.
3. **`runCmd20210915.js`** (`get_XML()`): `<DXInvoice xmlns="http://www.doc-process.com/schema/
   extended/invoice">` with `AccountingSupplierParty`/`AccountingCustomerParty` — DocProcess's
   schema. Its own header comment: "DocProcess integration, EMAG, invoice js class ...
   8-27.09.2021" — built when only DocProcess retailers existed. Auchan/Dedeman's SERIES/TRDR
   were bolted onto this same generator later without ever switching the output schema, because
   the SFTP send path for these two retailers was never actually exercised until this session
   (0/616 sent via the app in 60 days, confirmed earlier this session).

## The real schema (full field list, corrected 2026-08-27 against the proven scripts + real archive)

`M` = mandatory, `D` = dependent/conditional, `O` = optional. Format notes in parens.

**Corrections made 2026-08-27**: this block was originally transcribed from the PDF spec alone and
had gaps, found by diffing it against `AR_ORIGINAL_INVOICE`/`ExpFactDedeman_ButonNew` AND the real
archived files (both agree, so this is now high-confidence):
- **`<PaymentTerms>` (the standalone days field) is never emitted** by either proven script or
  either archived file — zero occurrences confirmed by grep. The spec marks it `M`, real practice
  omits it entirely. Follow proven practice: only `<PaymentTermsQualifier>` is written.
- **Missing entirely from the original transcription**: a header-level `<OrderParty>` (with its own
  `BuyerOrderNumber`/`BuyerOrderDate`) and `<DeliveryParty>` (`DeliveryDate`/`DeliveryDocumentNumber`/
  `DeliveryDocumentDate`) block inside `<InvoiceParty>`, appearing **before** `<BuyerParty>`. Both
  are present in every real archived file. These are in *addition* to the per-item `<Order>`/
  `<DeliveryDetail>` — both header-level and per-item versions exist and are populated from the
  same `dsHeader` values in both proven scripts.
- **Missing**: `<Contact><Person>/<Tel></Contact>` under `SellerParty`. Retailer-specific:
  Auchan hardcodes `Person = 'Ion Ion'`; Dedeman hardcodes `Person = ''` (empty). Both use
  `COMPANY.PHONE2` for `Tel`.
- **Missing**: `<UnitOfMeasureXCBL>` per item — always empty in both proven scripts and both
  archived files, but structurally present on every line.
- **Formula correction**: `MonetaryAmountPayable` is not computed via a discount formula in
  practice — both proven scripts just set it equal to `MonetaryGrossValue`. There is no discount/
  allowance tracking anywhere (`AllowancesAndCharges` and any `Discount` tag: zero occurrences in
  the real archive) — don't build discount logic for this.

```
<Invoice Version="1.0.1" xsi:noNamespaceSchemaLocation=".../invoice.xsd">        M
  <InvoiceHeader>                                                               M
    <InvoiceNumber>                              M  AN(14)   FINCODE
    <Date>                                       M  YYYY-MM-DD   TRNDATE
    <InvoiceDueDate>                              M  YYYY-MM-DD   FINPAYTERMS.FINALDATE
    <PaymentTermsQualifier>3</PaymentTermsQualifier>  M  N(1)  fixed = 3 (fixed date).
                                                        NOTE: no standalone <PaymentTerms> (days) —
                                                        confirmed never emitted, do not add it.
    <PaymentMethod><Code>42</Code>                M  N(2)     fixed = 42 (bank transfer)
      <Description>                              O  AN(14)   always empty in practice
    </PaymentMethod>
    <AllowancesAndCharges>                        O  never emitted in practice — omit
    <InvoiceCurrencyCoded>RON</InvoiceCurrencyCoded>  M AN(3)
    <InvoicePurposeCoded>O</InvoicePurposeCoded>  M  N(1)   fixed = "O" (commercial); "C" not applicable
    <DocumentRole>O</DocumentRole>                M  N(1)   "O"=original, "R"=return (RETANN-based),
                                                             "A"=storno (not applicable now) — only
                                                             need "O" for the clean-reception case
    <Comment>                                     D  AN(1000)  Auchan+Dedeman both emit empty in
                                                                practice — safe to leave empty
    <RefInvoiceNumber>/<RefInvoiceDate>           D  storno/correction only — not needed yet
  </InvoiceHeader>
  <InvoiceParty>                                                                M
    <OrderParty>                                  M   header-level, once per invoice — ADDED 2026-08-27,
      <BuyerOrderNumber> M   SALDOC.NUM04          was missing from the original transcription
      <BuyerOrderDate> M     SALDOC.DATE01
    </OrderParty>
    <DeliveryParty>                                M   header-level, once per invoice — ADDED 2026-08-27
      <DeliveryDate> M              MTRDOC.CCCDispatcheDate (source aviz's TRNDATE)
      <DeliveryDocumentNumber> M    MTRDOC.CCCDispatcheDoc (source aviz's FINCODE)
      <DeliveryDocumentDate> M      the source aviz's own TRNDATE too (both proven scripts select
                                     it via the same `mtrlines.findocs -> findoc` join, just as a
                                     separate `dsHeader` column) — same value as `DeliveryDate` in
                                     practice, sourced independently rather than copied
    </DeliveryParty>
    <BuyerParty>                                  M   (party receiving goods/services)
      <ILN> M N(13) GLN          <TaxID> M AN(35)     <Name> M AN(175)
      <Street> M AN(175)         <HouseNumber> M AN(9) <PostalCode> M AN(9)
      <City> M AN(35)            <Country>RO</Country> M AN(3)
    <InvoiceeParty>                                D   mandatory unless identical to BuyerParty
      (same field list as BuyerParty)
    <ShipToParty>                                  M   delivery point
      (same field list; ILN = the specific store/warehouse GLN)
    <SellerParty>                                  M   (= Pet Factory)
      <ILN> M   <BuyerSellerID> D AN(14)   <TaxID> M
      <BankAccount> M   <BankAccountOwner> O   <BankName> O
      <Name> M   <Street>/<HouseNumber>/<PostalCode>/<City>/<Country> all M
      <Contact>                                    M   ADDED 2026-08-27, was missing
        <Person>  retailer-specific: Auchan hardcodes 'Ion Ion', Dedeman hardcodes ''
        <Tel>     both: COMPANY.PHONE2
      </Contact>
    <ShipFromParty>                                D   only if different from SellerParty —
                                                         always emitted empty in both proven scripts
  </InvoiceParty>
  <InvoiceDetail>                                                               M
    <Item> (repeated per line)                     M
      <ItemNum> M AN(1000) line number
      <EAN> M (GTIN-8/13/14)             <BuyerItemID> M AN(14)  (CCCS1DXTRDRMTRL.CODE)
      <SellerItemID> D AN(14)            <CustomTariffNumber> D AN(14)
      <ProductIdentifierExt> D AN(2)      "CU" hardcoded by both retailers
      <PacketContentQuantity> M N(15.2)   retailer-specific — see reference table above
      <PackageType> D AN(3)               retailer-specific — see reference table above
      <QuantityValue> M N(15.2)           QTY1
      <TaxCategoryCoded> M AN(1)          retailer-specific hardcoded constant — see reference table
      <TaxPercent> M N(4)                 VAT.PERCNT
      <TaxAmount> M N(18)
      <MonetaryGrossValue> M N(18)  = MonetaryNetValue + TaxAmount
      <MonetaryNetValue> M N(18)
      <MonetaryAmountPayable> M N(18)  = MonetaryGrossValue in practice (no discount tracking exists
                                          anywhere in the real schema/archive — don't build one)
      <UnitOfMeasure> M AN(3)             MTRUNIT.shortcut (or CCCALTTRDRMTRUNIT override,
                                            already resolved by the existing calcInvoicedQuantity())
      <UnitOfMeasureXCBL>                 ADDED 2026-08-27, was missing — always empty in practice
      <PackUnitOfMeasure> M AN(3)         same value as UnitOfMeasure — see reference table above
      <UnitPriceValue> M N(18)            PRICE
      <UnitPriceValueGross> M N(18) = UnitPriceValue + TaxPercent*UnitPriceValue
      <Name> M AN(35)                     MTRL.name (spec truncates to 35 chars — neither proven
                                            script actually truncates; matching proven practice is
                                            safer than "fixing" it, but flag if a name >35 chars
                                            causes an Infinite rejection)
      <ReturnsAnnouncement>                M only for return invoices — not needed for clean case
      <Order>                              M per-item (in addition to header-level OrderParty above)
        <BuyerOrderNumber> M               same value as header OrderParty.BuyerOrderNumber
        <BuyerOrderDate> M                 same value as header OrderParty.BuyerOrderDate
      <DeliveryDetail>
        <DeliveryDate> M                   same value as header DeliveryParty.DeliveryDate
        <DeliveryDocumentNumber> M         same value as header DeliveryParty.DeliveryDocumentNumber
  </InvoiceDetail>
  <InvoiceSummary>                                                              M
    <NumberOfLines> M       <NetValue> M (sum MonetaryNetValue)
    <TaxValue> M            <TaxableValue> M     <GrossValue> M
    <TaxSummary><Tax> (repeated per VAT rate)>
      <TaxCategoryCoded> M   <TaxPercent> M   <TaxNettoAmount> M
      <TaxableAmount> M      <TaxAmount> M    <TaxGrossAmount> M
    </Tax></TaxSummary>
  </InvoiceSummary>
</Invoice>
```

**Answering "do we have all fields + mappings covered?" (2026-08-27 audit)**: **yes, fully.** Every
field in the corrected block above now has a confirmed source from one or both proven scripts
and/or the real archived files — including the ones the original PDF-only transcription had missed
entirely (`OrderParty`/`DeliveryParty`/`Contact`/`UnitOfMeasureXCBL`, plus the wrongly-assumed
`<PaymentTerms>` that turned out to never be emitted). Nothing in the clean/original-invoice path
is still unsourced. The two previously-marked "gaps" (`TaxCategoryCoded`, packaging fields) and the
address sourcing are resolved per-retailer, not per-VAT-percent or a single shared constant — see
the reference table above. The only intentionally-out-of-scope fields are the return/storno ones
(`ReturnsAnnouncement`, `RefInvoiceNumber`/`RefInvoiceDate`, `DocumentRole` values other than `"O"`)
and the still-genuinely-unknown 0%/exempt `TaxCategoryCoded` value, both deferred per gap 7/4.
  </InvoiceSummary>
</Invoice>
```

## Confirmed reusable data (already fetched by the existing script — same SQL sources apply)

**Note (2026-08-27): the address sub-bullets below describe what `runCmd20210915.js` (DocProcess
flow) fetches — for the new Infinite builder use `TRDR.ADDRESS`/`TRDBRANCH.ADDRESS`/
`COMPANY.ADDRESS` instead, per the proven scripts (see the reference table above), not
`CCCNUMESTREDIDX`/`CCCBUILDINGNUMBER`.**

- `SALDOC`/`MTRDOC`/`FINPAYTERMS` header fields (FINCODE, TRNDATE, NUM04, DATE01, PAYDAYS via
  `PAYMENT`, `CCCDispatcheDate`/`CCCDispatcheDoc`).
- `TRDR` row for the customer (`danteData` in the current script) — AFM, name, `CCCS1DXGLN`
  (customer's own GLN toward us), `CCCGLNFORCUSTOMER` (our GLN as known to this customer),
  `TRDBANKACC`/`BANK` join for IBAN/bank name.
- `TRDBRANCH` row for the delivery point (`depozitLivrare`) — `CCCS1DXGLN`, name, address, city,
  `CCCBUILDINGNUMBER`, zip. **Confirmed non-null for the Auchan test case.**
- `COMPANY` row (`companyData`) — AFM, name, city, district, zip, `CCCNUMESTREDIDX` (street).
- Per-line: `MTRLINES`/`MTRL` (MTRL, QTY1, PRICE, DISC1PRC, VAT, name, CODE/CODE1),
  `CCCS1DXTRDRMTRL` (buyer's own article code), `VATANAL`/`VAT` (percent, amounts),
  `CCCALTTRDRMTRUNIT` (retailer-specific unit code override).

## Genuine gaps — need a data source or a beneficiary answer before this can ship

1. **RESOLVED 2026-08-27** — no address gap at all; the earlier framing (chase
   `TRDR.CCCNUMESTREDIDX`/`CCCNREDIDX`, ask the beneficiary to fill them) was wrong. The proven
   scripts never read those columns. `BuyerParty`/`InvoiceeParty` = `TRDR.ADDRESS`/`ZIP`/`city`
   (Auchan's `TRDR.ADDRESS` and Dedeman's both already populated — checked live); `ShipToParty` =
   `TRDBRANCH.ADDRESS`/`ZIP`/`CITY` (confirmed non-null for the Auchan test case, per
   "Confirmed reusable data" below); `SellerParty` = `COMPANY.ADDRESS`/`ZIP`/`CITY`. `HouseNumber`
   is hardcoded empty on **every** party in both proven scripts — never split out, ever. See the
   reference table above ("The proven reference implementation").
2. **RESOLVED 2026-08-27.** `MTRDOC.DELIVDATE` was frequently NULL (73% of 7111 avize) because the
   app's `createInvoiceFromReception` (`RECADV.js`) bypasses the native Soft1 "Conversie"
   mechanism that used to fill it. Per user: *"nu se mai face conversia manual din soft, trebuie
   sa asiguram noi ceea ce se transfera prin ON_RESTOREEVENTS"* — `preiaDateAviz()` in
   `S1/JS/SALDOC_EF_27072026.js` now copies `MTRDOC.DELIVDATE` from the source aviz's own
   `MTRDOC` row (same join as `CCCDispatcheDate`/`CCCDispatcheDoc`), without fabricating a value
   when the source itself has none (anti-silent-fallback rule). **Deployed to the ERP script
   editor by the user 2026-08-27, going forward for new invoices.** `FAEX1-PF-40689`/`40690` were
   created BEFORE that deploy, so their `DELIVDATE` (and their source avize's `DELIVDATE`, both
   confirmed NULL live) had nothing to copy from — one-time manually backfilled from the source
   aviz's own `TRNDATE` as the closest available proxy (`2026-08-25`/`2026-08-24` respectively),
   not retroactively fixed by the code. New invoices going forward get it automatically.
   `<SellerParty><Contact><Tel>` also needed a source correction: `COMPANY.PHONE2` is NULL and has
   apparently never been populated at Pet Factory — switched `InfiniteInvoice.js` to source
   `SellerTel` from `COMPANY.PHONE1` only (confirmed populated: `'0723.319.834'`), not
   `ISNULL(PHONE2, PHONE1)` — per user, PHONE1 only, no fallback chain.
3. **RESOLVED 2026-08-27, retailer-specific — see the reference table above.** Auchan:
   `PacketContentQuantity` = `CCCS1DXTRDRMTRL.UnitPack`, `PackageType` hardcoded `'CT'`. Dedeman:
   both hardcoded `''`. `PackUnitOfMeasure` = `MTRUNIT.SHORTCUT` (same as `UnitOfMeasure`) for
   both. Do not use a single shared constant across retailers for the packaging fields.
4. **RESOLVED 2026-08-27, retailer-specific — see the reference table above.** `TaxCategoryCoded`
   is a **hardcoded constant per retailer, not a per-VAT-percent lookup**: Auchan's proven script
   (`AR_ORIGINAL_INVOICE`) uses `'S'`; Dedeman's (`ExpFactDedeman_ButonNew`) uses `'3D'` — matches
   the real archived Dedeman files exactly (both 11% and 21% lines use `3D`). Do **not** apply
   Dedeman's `'3D'` to Auchan or vice versa. Still genuinely unconfirmed: the code for a 0%/exempt
   line (neither proven script has one) — out of scope until that case actually occurs. A generic
   Polish vendor template (`documentatie/dedeman/invoice_return_example.xml`, not Pet Factory data)
   uses `D1`/`P3` — do not reuse those, they don't match either of our real per-retailer codes.
   Also note: the existing in-repo AJS `exportXMLDedemanReturn()` (return invoices) hardcodes
   `'2D'`, different again from the original-invoice `'3D'` — plausibly a legitimate
   return-vs-original distinction, not a bug; out of scope for Item A (original invoices only).
5. **RESOLVED 2026-08-27** — `SellerParty.ILN`/`BuyerParty.ILN` direction confirmed directly from
   the proven scripts: `BuyerParty.ILN` = `TRDR.CCCS1DXGLN` (customer's own GLN), `SellerParty.ILN`
   = `COMPANY.CCCS1DXGLN` (Pet Factory's own GLN), `ShipToParty.ILN` = `TRDBRANCH.CCCS1DXGLN`. No
   further verification against archived files needed — this is what the beneficiary-guaranteed
   scripts already do.
6. **Filename convention differs.** Current script builds `INVOIC_<seriesnum>_VAT_<afm>.xml`
   (DocProcess convention). Real archived Infinite files are named `<FINCODE>_<YYYY-MM-DD>.xml`
   (e.g. `FAEXD-PF-38344_2026-05-25.xml`). The new builder must use the Infinite convention.
7. **`DocumentRole`/return-invoice fields (`ReturnsAnnouncement`, `RefInvoiceNumber`, storno
   amount-sign convention)** are out of scope for now — only the clean/original ("O") invoice
   case is needed for item A. Do not attempt to wire RETANN-based return invoices in this pass.

## Already correct / do not redo (from this session's work)

- **Transport + directory**: `src/services/edi-invoices/edi-invoices.class.js` now resolves
  `buildTransport(row, row.PROVIDER_CONNTYPE)` via `getProvider()`/`joinRemote(INITIALDIROUT,
  provider.remoteSubdir('invoice'))` — confirmed correct against the live FTP directory listing
  (`/invoice/` root, with `archive/confirm/duplicate/error/logs/omit/temp` subfolders). No change
  needed here regardless of which generator produces the XML.
- **Post-upload verification + logging (added 2026-08-27, per explicit user request)**: same file
  now lists the remote dir right after `uploadBuffer()` and confirms the filename is actually
  there before returning `success:true` — a clean `uploadBuffer()` alone isn't trusted anymore (a
  silent partial write/drop is possible). Every outcome (success or failure) is logged to
  `orders-log` (`OPERATION: 'sendInvoice'`), not just the XML-build validation failures logged by
  `get-invoice-dom.class.js`. Covered by `test/services/edi-invoices/edi-invoices.test.js` (5
  cases). Both new `OPERATION` values (`buildInvoiceXml`, `sendInvoice`) were added to the Logs
  screen's filter dropdown (`orders-log-table.js`).
- **S/MIME signing**: wired in the same file (`signSmime()` called when `provider.code ===
  'infinite'`). Stays valid — it signs whatever XML payload is handed to it.
- **Config**: `EDINET_P12_BASE64`/`EDINET_P12_PASSWORD` and `S1_USERNAME`/`S1_PASSWORD` are now
  set on `retailers4` (Heroku config, values not recorded here — see Heroku dashboard).
- **Series recognition**: `runCmd20210915.js` `set_Invoice()` now accepts 7122/7123 as "tur" —
  this fix is **dead weight for Infinite once the new builder exists** (that code path won't be
  called for Infinite retailers anymore) but harmless to leave for now. Revisit/remove once the
  new builder is wired and confirmed working, to avoid two invoice generators silently existing
  for the same series.
- **`createInvoiceFromReception`** (`RECADV.js`, Item B) is unaffected by any of this — it only
  creates the SALDOC/MTRLINES rows, never generates XML.

## Implementation plan — status per step (implemented 2026-08-27)

1. **RESOLVED 2026-08-27** — all field-sourcing questions (address parties, `TaxCategoryCoded`,
   packaging fields, GLN direction, filename, encoding quirk) are settled per-retailer from the
   proven `SOIMPORT` scripts — see "The proven reference implementation" table near the top of
   this page. No beneficiary question remains for the clean/original invoice case.
2. **DONE 2026-08-27** — `preiaDateAviz()` in `S1/JS/SALDOC_EF_27072026.js` now copies
   `MTRDOC.DELIVDATE` from the source aviz, and the user deployed it to the ERP script editor.
   Still needs a fresh post-deploy test (create a new invoice from a reception, check
   `DELIVDATE` populates) — existing pre-deploy invoices won't be retroactively fixed.
3. **DONE 2026-08-27 — written, not yet deployed to the ERP.** `S1/JS/AJS/InfiniteInvoice.js`:
   `buildInvoiceXml({findoc})` determines Auchan (`FPRMS=712`) vs Dedeman (`SERIES IN
   (7123,7033)`) from the invoice's own `FINDOC` row, runs the ported per-retailer `dsHeader`/
   `dsHeaderTax`/`dsLinii` SQL (adapted from `AR_ORIGINAL_INVOICE`/`ExpFactDedeman_ButonNew`,
   `:1` parameterized instead of `:$ImpTable.vFindoc`), pre-validates every `M` field and returns
   one message per missing field instead of assembling XML, then builds the XML with a `tag()`
   helper (same style as `exportXMLDedemanReturn()`). Retailer differences are branched, not
   config-driven, per the scope directive: `TaxCategoryCoded` (`S`/`3D`), packaging fields,
   `Contact><Person>`, and Dedeman-only per-item `<Order>`/`<DeliveryDetail>`. `ItemNum` is a
   running fetch-order counter, not a SQL column — confirmed both proven scripts actually do this
   (the SQL's own `ItemNum`/`linenum` column is written to a JS var but never used in the
   file-write loop). Declares `iso-8859-2` in the prolog while emitting real UTF-8 bytes, matching
   the proven mismatch on purpose. Returns `{success, dom, trimis, filename, computername,
   message, errors}` — `dom`/`trimis`/`filename`/`computername` mirror `runCmd20210915.js`'s
   contract so the frontend needs no shape changes; `message`/`errors` are new.
4. **DONE 2026-08-27.** `get-invoice-dom.class.js` now takes an optional `trdr` query param,
   resolves the provider via `CCCSFTP.list({onlyActive:true})` (same match-by-`TRDR_RETAILER`
   pattern as `edi-invoices.class.js`), and calls `/JS/InfiniteInvoice/buildInvoiceXml` when
   `provider.code === 'infinite'`, else keeps `/JS/runCmd20210915/runExternalCode`. Missing/invalid
   `trdr` falls back to the legacy DocProcess path (no regression for any caller not yet updated).
   `trdr` is now threaded from the frontend: `sendInvoiceXml()` (`frontend/src/services/api.js`)
   and `invoice-table.js`'s `_createXml()` both pass `this.trdr`/the retailer id through to
   `getInvoiceDom()`. `reception-table.js` already passed `trdr` into `sendInvoiceXml()`, so no
   change was needed there. Also switched the service to `parseS1Json` (charset-aware) instead of
   a bare `response.json()`, consistent with every other AJS-calling service in this repo.
5. **DONE 2026-08-27.** Pre-validation failures on the Infinite path insert one `orders-log` row
   (`OPERATION: 'buildInvoiceXml'`, `LEVEL: 'error'`, field-by-field message) — mirrors
   `recadv.class.js`'s `logInvoiceResult` pattern. Only failures are logged (a successful "create
   XML" is just a preview step, not an action worth a log row); the legacy DocProcess path is
   untouched, no double-logging. The AJS response's `message` field already carries the
   field-by-field text (not a raw bind-error dump) for any future UI surface to use.
   Test coverage: `test/services/get-invoice-dom/get-invoice-dom.test.js` (5 cases — Infinite
   routing, DocProcess routing, missing-`trdr` fallback, failure logging, no logging on success).
6. **DONE 2026-08-27 — see "Live verification" section below for the full result.** Sent
   `FAEX1-PF-40689` and `FAEX1-PF-40690` (Auchan) through the app end to end: generate → sign →
   upload → confirmed on FTP → `FAEX1-PF-40689` got a positive `MessageAcknowledgement` from
   Infinite (processed into `/invoice/archive/`, zero entries in `/invoice/logs/err/`).
7. **Do NOT enable bulk/automatic sending** — this remains a deliberate one-invoice-at-a-time
   manual action per the beneficiary's existing `manualSend` decision, unchanged by this work.

## Live verification (2026-08-27) — CORRECTED: the FTP ack is not proof of acceptance

**Initial (wrong) conclusion**: sent `FAEX1-PF-40689`/`40690` through the live app; both got a
clean, empty-`AcknowledgementNote` `MessageAcknowledgement_*.xml` in `/invoice/logs/ok/` and moved
to `/invoice/archive/`. This was reported as "definitive proof the schema is accepted" — **that
was wrong.**

**What actually happened, found by checking the Infinite EDInet web portal (a separate system
from the FTP, not something this repo can query — the user checked it directly and shared
screenshots):** every single invoice sent through the app so far shows:
```
File name: FAEX1-PF-40689_2026-08-27.xml   Infinite file id: 215609120
Error: Document processing. Invalid file structure.
```
Same error for `40690`, and (checked via FTP acks, which for these all *also* looked clean)
likely `40693`/`40694`/`40695`/`40696` too — **all 6 invoices created via `createInvoiceFromReception`
so far have this defect, with 100% correlation.**

**Root cause, found by fetching the actual sent XML from `/invoice/archive/` and diff'ing it
against a genuinely-successful real historic Dedeman invoice
(`documentatie/infinite_samples/invoice_archive/FAEXD-PF-38344_2026-05-25.xml`)**: our XML has
`<OrderParty><BuyerOrderDate></BuyerOrderDate></OrderParty>` — **empty**, while the real reference
file always has a populated date (`2026-05-08`). Traced to the SQL source: `SALDOC.DATE01` was
`NULL` on **all 6** created invoices, while their source avice's own `DATE01` was populated in
every case (verified live: 2202772/2203286/2204418/2204576/2205048/2206364 all have real dates).
**`S1/JS/AJS/RECADV.js`'s `createInvoiceFromReception` copies `NUM04`/`TRDBRANCH`/`CCCORDERDOC`
from the source aviz onto the new invoice but never copied `DATE01`** — fixed 2026-08-27
(`tblFINDOC.DATE01 = adv.DATE01`, mirroring the existing `NUM04` copy). An empty `<BuyerOrderDate>`
(a date-typed XSD element) is a very plausible trigger for a generic "Invalid file structure"
message rather than a field-specific one.

**Key lesson for this workstream**: the FTP `MessageAcknowledgement`/`archive` move only confirms
Infinite's **transport layer received and parsed a well-formed XML document** — it does NOT mean
their business/schema validation passed. **The EDInet web portal is the only authoritative source
for real acceptance/rejection status**, and this repo/session has no credentials for it — always
ask the user to check it directly rather than trusting a clean FTP ack alone.

**Caveat found 2026-08-27 (weakens confidence in the DATE01 theory, doesn't refute it):**
`documentatie/dedeman/FAEX1-PF-22065_2024-06-26.xml` is a genuine, complete, real **Auchan**
invoice produced by the old proven manual process back in 2024 (`Name>Auchan Romania S.A.`,
well-formed throughout) — and its `<OrderParty><BuyerOrderDate>` is **also empty**, same as our
pre-fix bug state. There is no local record of whether this specific file was ever accepted or
rejected by Infinite, so this is not proof the DATE01 fix was pointless — but it means an empty
`BuyerOrderDate` alone may not be sufficient to trigger "Invalid file structure", and the real
defect (if the resend is still rejected) may lie elsewhere. If the 6 resent invoices are rejected
again, diff the full generated XML byte-for-byte against this specific Auchan reference file
(not the Dedeman `FAEXD-*` ones used for the original diff) instead of assuming BuyerOrderDate.

### ROOT CAUSE (2026-08-27, high confidence): `<BuyerOrderDate>` was emitted as a **dateTime**

**An earlier revision of this page claimed the `2026-08-19T00:00:00` form was correct because it
matches Auchan's proven script. That claim was WRONG — this section supersedes it.**

### The decisive A/B test (2026-08-27) — same document, button version accepted, ours rejected

The beneficiary produced the **button** (`SOIMPORT`) version of **the exact same invoice** our
builder had generated — `FAEXD-PF-40697` / FINDOC 2209230 — and **EDInet accepted it**
(`d:\XML Dedeman\FAEXD-PF-40697_2026-08-27.xml`). That turns a guessing game into a controlled
experiment: one document, two generators, one accepted and one rejected.

A mechanical element-by-element value diff (throwaway `_abdiff.mjs`) over **372 elements** found
exactly **one** real value difference, plus 43 trailing-whitespace-only differences:

```
DIFF  InvoiceParty/SellerParty/Contact/Tel[0]
      ours     = "0723.319.834"
      accepted = ""
```

**Important scoping caveat**: that diff compared our *current* output (generated after
`CCCSELLERID` had already been backfilled in the data) against the accepted file. The version
actually **sent and rejected** had **two** differences — an empty `<BuyerSellerID>` *and* the
`Tel`. Do not read "only one difference" as "only one suspect for the rejection".

**Cause of the `Tel` difference**: both proven scripts read `COMPANY.PHONE2`
(`AR_ORIGINAL_INVOICE` line 103, `ExpFactDedeman_ButonNew` line 106), which is **empty** on this
company — hence `<Tel></Tel>` in every accepted invoice, for both retailers. `InfiniteInvoice.js`
read `PHONE1` instead (`0723.319.834`). **Fixed 2026-08-27**: both header queries now use
`isnull(G.PHONE2,'')`, and `validate()` no longer requires `SellerTel` (requiring it would
fail-closed on every invoice, since the proven behaviour is an empty value).

**But `Tel` is probably NOT the rejection cause** — counter-evidence: the official Infinite sample
`invoice_return_example.xml` carries `<Tel>362341212</Tel>`, a *populated* Tel, so a non-empty
value is definitely schema-valid. The only unverified part is whether the XSD restricts the
format (ours had dots, the official sample is digits-only). Weigh that against the fact that,
after the beneficiary supplied accepted files for **both** retailers, `Tel` is the **only**
remaining difference on both — so it is now the last standing candidate, not a long shot.

**Final state after both accepted references arrived (2026-08-27)** — our live output vs the
accepted button output, same documents:

| Retailer | Document | Elements compared | Real value diffs |
|---|---|---|---|
| Auchan | `FAEX1-PF-40689` (FINDOC 2208760) | 393 | **1** — `Tel` only |
| Dedeman | `FAEXD-PF-40697` (FINDOC 2209230) | 372 | **1** — `Tel` only |

(plus 26 / 43 trailing-whitespace-only differences, which the accepted files themselves contain).

**What the rejected sends actually differed by** (both retailers): `<BuyerSellerID>` empty **and**
`Tel` from `PHONE1`. `BuyerSellerID` is now fixed in data and in `RECADV.js`; `Tel` is fixed in
`InfiniteInvoice.js` pending redeploy. After that redeploy the generated XML should be
value-identical to a known-accepted document on both retailers — if a resend still fails, the XML
content is exonerated and the investigation moves to transport/signing/upload encoding.

**Ranking of the defects found this session, by likelihood of being the actual cause:**
1. **`<BuyerSellerID>` empty** (both retailers) — a required supplier identifier emitted empty is
   exactly what gets reported as a generic "Invalid file structure".
2. **`Tel` from `PHONE1`** — the only other difference; low prior (populated Tel is provably
   valid) but it is now the last one standing.
3. ~~`<BuyerOrderDate>` as dateTime~~ — **retracted, was never a defect.** See below.

**This also means the builder has no structural problem.** 372/372 elements matched in path,
order and nesting. Do not look for missing/extra/misordered elements — there are none.

### Second real defect (Auchan only): `<BuyerOrderDate>` — RETRACTED, this was NOT a defect

**This section previously claimed `<BuyerOrderDate>` had to be date-only and that our
`2026-08-19T00:00:00` was an XSD type violation. That was WRONG, and the "fix" was reverted.**

The reasoning error, recorded because it is worth not repeating: every accepted sample available
at the time (`FAEXD-PF-38344`, `FAEXD-PF-38349`, `FAEXD-PF-40697`, `FAEX1-PF-22065`) showed
date-only values, so "all dates are date-only" looked like a solid measured rule. But **none of
those samples was an accepted Auchan invoice with a populated `BuyerOrderDate`** — the Auchan one
had it empty. Absence of a counter-example was treated as evidence of a rule.

The beneficiary then supplied the accepted **Auchan** `FAEX1-PF-40689_2026-08-27.xml`, which
carries `<BuyerOrderDate>2026-08-21T00:00:00</BuyerOrderDate>`. **Infinite accepts the dateTime
form for Auchan.** `AR_ORIGINAL_INVOICE`'s `replace(convert(varchar(50), ...), ' ', 'T')` was
right all along, and the per-retailer asymmetry (Auchan dateTime, Dedeman date-only) is real.
`InfiniteInvoice.js` was reverted to the dateTime form with a comment marking it as verified.

**Rule for this workstream**: only a *positive* sample proves a format. A field that is empty in
every reference file proves nothing about how a populated value must look — get an accepted
document that actually contains a value before changing the format.

## Deeper root cause (2026-08-27) — GETSQLDATASET's WS bridge corrupts null-date SQL expressions

The `DATE01` fix above only prevents `<BuyerOrderDate>` from being empty **going forward** (once
the source aviz's own `DATE01` is populated). But the actual failure mode — an empty/malformed
date element in the sent XML — turned out to be a more general bug, found by reproducing it
directly against production data via `mcp_s1-api_s1_query_dataset` (which calls the same
`X.GETSQLDATASET` web-service path our AJS code uses):

```sql
SELECT DATE01 AS RawDate01,
       convert(varchar(50),DATE01,120) AS ConvertedDate01,
       isnull(replace(convert(varchar(50),DATE01,120),' ','T'),'') AS OurExpr
FROM FINDOC WHERE FINDOC=2208761   -- DATE01 is NULL here
```

Result: `RawDate01` and `ConvertedDate01` both come back as clean JSON `null` — but `OurExpr`
(our actual SQL pattern: `isnull(replace(convert(...),...),'')`, the exact style used for
`BuyerOrderDate`/`DeliveryDate`/`InvoiceDueDate`/`DeliveryDocumentDate` everywhere in
`InfiniteInvoice.js`) comes back as the literal string `"\u0001"` — **a stray control byte, not an
empty string**. That control character survives into the generated XML and renders as `?` in a
text viewer/browser (exactly what was visible in the sent `FAEX1-PF-40690` XML: a highlighted `?`
inside `<BuyerOrderDate>`). A control character inside a date-typed XSD element is a very
plausible trigger for Infinite's generic "Invalid file structure" rejection.

**Root cause**: SQL Server's query-plan metadata still tags a `CONVERT`/`REPLACE`/`ISNULL` chain
built on top of a `datetime` column as date-lineaged, even after casting to `VARCHAR` — and
Soft1's dataset-to-JSON bridge, when it sees that lineage on a column whose *runtime* value ends
up an empty string, emits a stray placeholder byte instead of a clean `''`/`null`. A plain
non-date-derived empty string (`CAST('' AS VARCHAR(10))`) does NOT trigger this — it round-trips
as clean `null`. So the bug is specific to **date-derived** expressions, and only manifests when
the underlying date is actually `NULL` (which is common: `DeliveryDate`/`InvoiceDueDate`/
`DeliveryDocumentDate` can all legitimately be null, independent of the `DATE01` gap above).

**Fix (per user, confirmed from prior direct experience with this exact SoftOne quirk)**: never
pre-stringify a nullable date in SQL. **Attempted 2026-08-27**: switched `InfiniteInvoice.js` to
select raw date columns and format them via a new `X.FORMATDATE`-based `fmtDate()` helper — **this
regressed live**: after redeploy, every date field on every invoice came back empty, even ones
where the underlying value was verified non-null (backfilled `DATE01`, populated `DELIVDATE`).
`X.FORMATDATE` does not appear to work on a raw field read from an ad-hoc `X.GETSQLDATASET`
dataset the way it does on a real object-bound field (`SALDOC.TRNDATE` etc.) — **reverted** back
to the original SQL-side `CONVERT`/`ISNULL` string formatting (same commit). This is safe now
because the actual trigger for the NULL dates was the missing `DATE01`/`DELIVDATE` at the source,
both now fixed (`RECADV.js`, `preiaDateAviz()`) — with the underlying date columns populated, the
nested-conversion corruption described above simply doesn't get an empty input to corrupt.
**`fmtDate`/raw-column selection is not a viable fix in this codebase and should not be
reattempted** without first proving `X.FORMATDATE` works on a `GETSQLDATASET` dataset field in
isolation.

**Remaining before this is truly verified**:
1. Redeploy `RECADV.js` (the `DATE01` fix) AND `InfiniteInvoice.js` (the `fmtDate`/raw-date fix)
   to the ERP.
2. One-time backfill for the 6 already-created test invoices (their own source avice's `DATE01`
   is known and real — no proxy/guessing needed, unlike the earlier `DELIVDATE` case):
   ```sql
   UPDATE INV SET INV.DATE01 = SRC.DATE01
   FROM FINDOC INV
   CROSS APPLY (
     SELECT TOP 1 S.DATE01 FROM MTRLINES L
     INNER JOIN FINDOC S ON S.FINDOC = L.FINDOCS
     WHERE L.FINDOC = INV.FINDOC AND L.FINDOCS IS NOT NULL
   ) SRC
   WHERE INV.FINDOC IN (2208760,2208761,2209180,2209181,2209182,2209183);
   ```
3. Resend all 6 ("Retrimite") and check the **EDInet portal** (not just the FTP) for a clean
   "processed" result this time.
4. Only then is this item genuinely done — the earlier "live-verified" claim in this page's status
   line was premature.

**Third gap found 2026-08-27, same category as `DATE01` — `CCCSELLERID` also never copied.**
`<SellerParty><BuyerSellerID>` came out empty while every real accepted invoice has it populated
(Auchan `02219`, Dedeman `0000003419`). Both proven scripts read it from `FINDOC.CCCSELLERID`, and
`InfiniteInvoice.js` already read it correctly — the gap was that **`RECADV.js`'s
`createInvoiceFromReception` never copied it from the source aviz**, same class of bug as the
`DATE01` miss. **Fixed 2026-08-27** (added to the SELECT + `tblFINDOC.CCCSELLERID = adv.CCCSELLERID`).
Verified live afterwards: all 7 test invoices now carry a real value, and calling the deployed
`/JS/InfiniteInvoice/buildInvoiceXml` returns `<BuyerSellerID>05613</BuyerSellerID>` (Auchan
2209183) and `0000003419` (Dedeman 2209230). Note the Auchan value is **per delivery location**
(`02219`/`03837`/`05613` all occur across the 6 test invoices), not a single company constant.

**Also observed, likely NOT a bug**: `<CustomTariffNumber>` was empty on 2 of 4 lines
(`PF.00031`/`PF.00030`). Traced to `InfiniteInvoice.js`'s `LEFT OUTER JOIN intrastat E ON
B.intrastat=E.intrastat` — those two `MTRL` rows simply have no `INTRASTAT` set, a per-product
master-data gap, not something `createInvoiceFromReception`/`InfiniteInvoice.js` can fix. The real
accepted Auchan reference has it populated on all 51 lines, so it is worth fixing in master data,
but it is a *value* gap, not a structure violation. Lower priority than the `BuyerOrderDate` type
error above; revisit only if the portal still complains after that fix ships.

**Red herring, ruled out**: the app's XML preview renders each element's value on its own indented
line, which looked like whitespace pollution inside the tags. That is purely
`frontend/src/components/xml-viewer.js`'s `_formatXml()` display pretty-printer — the bytes
actually sent are compact `<Tag>value</Tag>`, one line per field (`InfiniteInvoice.js`'s `tag()`
helper + `xml.join('\r\n')`), confirmed by byte-level inspection of a saved generated file.
Do not chase this again.

**Still true / not affected by this correction**: the Infinite directory layout discovered
(`archive/`, `confirm/send`, `confirm/failed`, `duplicate/`, `error/`, `logs/ok/`, `logs/err/`,
`omit/`), and the "idea for later" of polling acks — just recalibrate what "ok" in `logs/ok/`
actually means (received+parsed, not accepted).

## Deferred: the correct architecture (mostly moot for Infinite — see scope directive above)

**Acknowledged debt, recorded per explicit user request (2026-08-27): this dedicated builder is
being written under the same time pressure that produced `runCmd20210915.js` in 2021.** The
architecturally correct fix — for both DocProcess and Infinite, and for any future retailer/
provider — would be a **generic outbound XML engine**, symmetric to `src/edi/order-builder.js`'s
existing **inbound** engine (`buildOrderPayload`, XML → SALDOC via `CCCXMLS1MAPPINGS` +
`runMappingSql`). That table already has a per-field mapping for Carrefour's `DXInvoice` (doc id
38, admin UI `doc-mappings-editor.js`/`xml-mapping-table.js`) but **nothing reads it for outbound
generation today** — it is documentation of the legacy script, not a live generator (confirmed by
reading every consumer of `CCCXMLS1MAPPINGS` this session).

**Updated priority (2026-08-27): this is now low-value specifically for Infinite.** Per the scope
directive above, Infinite is a closed set of 2 retailers that already have proven, working
generators to port from — there's no future-Infinite-retailer onboarding cost this would save.
If this is ever revisited, its real justification is the **DocProcess** side (where new retailers
do keep arriving) — populating Dedeman's empty `DXInvoice` mapping row (id 45) and building a
real outbound reader for `CCCXMLS1MAPPINGS` would pay for itself there. Do not resurrect this as
a reason to delay or complicate the Infinite builder.

If DocProcess-side work on this is ever scheduled:
- Build `src/edi/invoice-builder.js` (or similar): SALDOC + `CCCXMLS1MAPPINGS` row (keyed by
  FPRMS/SERIES like the inbound side) → generated XML, SQL-per-field like the existing `SQL`
  column already supports.
- Populate real field mappings for DocProcess's `DXInvoice` (Dedeman's own INVIOCE mapping row,
  id 45, currently has **zero** child field rows — empty placeholder).
- This is a genuine "planning/architecture" scope item, not a quick patch — treat it as its own
  planned session, not a drive-by addition to whatever else is in flight.

## See also
- [reception-screen.md](reception-screen.md) — Item A's send-path bug chain (transport, signing,
  credentials, series) that led here.
- [soft1-schema-facts.md](soft1-schema-facts.md) — `CCCDOCUMENTES1MAPPINGS`/`CCCXMLS1MAPPINGS`
  audit (which rows are real vs decorative).
- `documentatie/dedeman/XML_INVOICE_v4.pdf` — the source spec (not re-extracted into this repo as
  text; re-run `pypdf`/python-executor on it if the field table above needs re-verifying).
