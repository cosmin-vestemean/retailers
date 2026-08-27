# Infinite invoice XML — real format, gap analysis, implementation plan

**Status: NOT implemented. This page is the handoff plan for a fresh session.**

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

## The real schema (full field list, extracted from the v4.0 PDF)

`M` = mandatory, `D` = dependent/conditional, `O` = optional. Format notes in parens.

```
<Invoice Version="1.0.1" xsi:noNamespaceSchemaLocation=".../invoice.xsd">        M
  <InvoiceHeader>                                                               M
    <InvoiceNumber>                              M  AN(14)   FINCODE
    <Date>                                       M  YYYY-MM-DD   TRNDATE
    <InvoiceDueDate>                              M  YYYY-MM-DD   FINPAYTERMS.FINALDATE
    <PaymentTerms>                                M  N        days (already computed as `dm` in
                                                                the current script via PAYMENT/PAYDAYS)
    <PaymentTermsQualifier>3</PaymentTermsQualifier>  M  N(1)  fixed = 3 (fixed date)
    <PaymentMethod><Code>42</Code>                M  N(2)     fixed = 42 (bank transfer)
      <Description>                              O  AN(14)
    </PaymentMethod>
    <AllowancesAndCharges>                        O  (not applicable at the moment per spec)
    <InvoiceCurrencyCoded>RON</InvoiceCurrencyCoded>  M AN(3)
    <InvoicePurposeCoded>O</InvoicePurposeCoded>  M  N(1)   fixed = "O" (commercial); "C" not applicable
    <DocumentRole>O</DocumentRole>                M  N(1)   "O"=original, "R"=return (RETANN-based),
                                                             "A"=storno (not applicable now) — only
                                                             need "O" for the clean-reception case
    <Comment>                                     D  AN(1000)  optional, SALDOC.REMARKS
    <RefInvoiceNumber>/<RefInvoiceDate>           D  storno/correction only — not needed yet
  </InvoiceHeader>
  <InvoiceParty>                                                                M
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
    <ShipFromParty>                                D   only if different from SellerParty
  </InvoiceParty>
  <InvoiceDetail>                                                               M
    <Item> (repeated per line)                     M
      <ItemNum> M AN(1000) line number
      <EAN> M (GTIN-8/13/14)             <BuyerItemID> M AN(14)  (CCCS1DXTRDRMTRL.CODE)
      <SellerItemID> D AN(14)            <CustomTariffNumber> D AN(14)
      <ProductIdentifierExt> D AN(2)      ("CU"=commercial unit, "RC"=returnable asset)
      <PacketContentQuantity> M N(15.2)   ***gap: no current data source, see below***
      <PackageType> D AN(3)               ("CT"=carton/box, "RC"=returnable asset)
      <QuantityValue> M N(15.2)           QTY1
      <TaxCategoryCoded> M AN(1)          ***gap: VAT-type code, not just percent — see below***
      <TaxPercent> M N(4)                 VAT.PERCNT
      <TaxAmount> M N(18)
      <MonetaryGrossValue> M N(18)  = MonetaryNetValue + TaxAmount
      <MonetaryNetValue> M N(18)
      <MonetaryAmountPayable> M N(18) = QuantityValue*UnitPriceValue - UnitDiscount
      <UnitOfMeasure> M AN(3)             MTRUNIT.shortcut (or CCCALTTRDRMTRUNIT override,
                                            already resolved by the existing calcInvoicedQuantity())
      <PackUnitOfMeasure> M AN(3)         ***gap, see below***
      <UnitPriceValue> M N(18)            PRICE
      <UnitPriceValueGross> M N(18) = UnitPriceValue + TaxPercent*UnitPriceValue
      <Name> M AN(35)                     MTRL.name (spec truncates to 35 chars — current script
                                            does not truncate, must add)
      <ReturnsAnnouncement>                M only for return invoices — not needed for clean case
      <Order>
        <BuyerOrderNumber> M               SALDOC.NUM04
        <BuyerOrderDate> M                 SALDOC.DATE01
      <DeliveryDetail>
        <DeliveryDate> M                   MTRDOC.CCCDispatcheDate (same value per line is fine)
        <DeliveryDocumentNumber> M         MTRDOC.CCCDispatcheDoc
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

## Confirmed reusable data (already fetched by the existing script — same SQL sources apply)

- `SALDOC`/`MTRDOC`/`FINPAYTERMS` header fields (FINCODE, TRNDATE, NUM04, DATE01, PAYDAYS via
  `PAYMENT`, `CCCDispatcheDate`/`CCCDispatcheDoc`).
- `TRDR` row for the customer (`danteData` in the current script) — AFM, name, `CCCS1DXGLN`
  (customer's own GLN toward us), `CCCGLNFORCUSTOMER` (our GLN as known to this customer),
  `TRDBANKACC`/`BANK` join for IBAN/bank name.
- `TRDBRANCH` row for the delivery point (`depozitLivrare`) — `CCCS1DXGLN`, name, address, city,
  `CCCBUILDINGNUMBER`, zip. **Confirmed non-null for the Auchan test case** (unlike the company/
  customer StreetName gap below).
- `COMPANY` row (`companyData`) — AFM, name, city, district, zip, `CCCNUMESTREDIDX` (street).
- Per-line: `MTRLINES`/`MTRL` (MTRL, QTY1, PRICE, DISC1PRC, VAT, name, CODE/CODE1),
  `CCCS1DXTRDRMTRL` (buyer's own article code), `VATANAL`/`VAT` (percent, amounts),
  `CCCALTTRDRMTRUNIT` (retailer-specific unit code override).

## Genuine gaps — need a data source or a beneficiary answer before this can ship

1. **`TRDR.CCCNUMESTREDIDX`/`CCCNREDIDX` (street/house number) are NULL for Auchan (13248)**
   confirmed via SQL this session. `BuyerParty.Street`/`HouseNumber` are `M` (mandatory) in the
   real schema too — this is not a schema-format artifact, it's missing Soft1 master data.
   **Action: ask the beneficiary to fill Auchan's address fields in Soft1** (Dedeman's own values
   were never checked — verify before assuming they're fine).
2. **`MTRDOC.DELIVDATE` is frequently NULL** (73% of 7111 avize have it; the specific test
   reception, `AEX-AE-055138`/FINDOC 2206364, does not). Real invoices are 99.6% populated
   (2121/2130 over 90 days), so something normally fills it — likely the native Soft1
   "Conversie" mechanism, which the app's `createInvoiceFromReception` (`RECADV.js`) bypasses.
   Per user 2026-08-27: **"nu se mai face conversia manual din soft, trebuie sa asiguram noi ceea
   ce se transfera prin ON_RESTOREEVENTS"** — extend `preiaDateAviz()` in
   `S1/JS/SALDOC_EF_27072026.js` to also copy `MTRDOC.DELIVDATE` from the source aviz's own
   `MTRDOC` row (same join already used for `CCCDispatcheDate`/`CCCDispatcheDoc`), **without
   fabricating a value when the source itself has none** (this repo's established anti-silent-
   fallback rule — see `/memories/repo` docDate() lesson). If the source aviz has no DELIVDATE
   either, that is a genuine upstream data gap to surface to the beneficiary, not to paper over.
   **Not yet implemented — do this as part of the new session's work.**
3. **`PacketContentQuantity` (M) and `PackUnitOfMeasure` (M)** — no current data source identified.
   Likely maps to a packaging/pallet-quantity concept that may not exist cleanly in this MTRL
   setup. Needs investigation (possibly `MTRL` packaging fields, or defaults to 1×`UnitOfMeasure`
   if Pet Factory doesn't track multi-level packaging) — **flag to beneficiary if no clean source
   is found**, do not guess silently.
4. **`TaxCategoryCoded` (M, AN(1))** is a VAT **type** code (spec example `"2D"`), not the percent.
   Need the actual Infinite/EDInet VAT category coding table (not in this PDF) — check
   `documentatie/EDInet_Connector/` or ask the beneficiary/Infinite helpdesk for the code list
   mapped to Pet Factory's VAT rates (19%/9%/5%/0% etc.).
5. **Which GLN goes in `SellerParty.ILN` and `BuyerParty.ILN`?** The current script's
   `danteData.SupplierLocationCoordinate` (`CCCGLNFORCUSTOMER`) and
   `danteData.CustomerLocationCoordinate` (`CCCS1DXGLN`) are named confusingly — verify the actual
   direction against a real archived invoice's `<BuyerParty><ILN>` vs `<SellerParty><ILN>` before
   wiring them, don't assume the DXInvoice naming convention carries over correctly.
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

## Implementation plan for the new session

1. **Decide + confirm the two open gaps that need a human answer before coding**: `TaxCategoryCoded`
   code table, and `PacketContentQuantity`/`PackUnitOfMeasure` source (or confirm Auchan/Dedeman
   invoices genuinely don't need packaging detail and a fixed default is acceptable — get this
   confirmed explicitly, don't assume).
2. **Ask/confirm Auchan's (and check Dedeman's) `TRDR.CCCNUMESTREDIDX`/`CCCNREDIDX`** are filled
   in Soft1 before testing — otherwise the same "StreetName missing" failure will recur regardless
   of schema.
3. **Extend `preiaDateAviz()`** in `S1/JS/SALDOC_EF_27072026.js` to copy `MTRDOC.DELIVDATE` from
   the source aviz (best-effort, no fabrication) — small, do this first, independent of the rest.
4. **Write the new dedicated builder** — recommend a new file `S1/JS/AJS/InfiniteInvoice.js`
   (`//Cod specific S1 - AJS` marker, ES5) rather than extending `runCmd20210915.js`, to avoid
   destabilizing the working DocProcess path. Reuse the existing SQL data-gathering pattern from
   `runCmd20210915.js` (`companyData`/`danteData`/`depozitLivrare`/line dedup logic) but emit the
   `Invoice v1.0.1` shape above. Build a pre-validation pass **before** attempting XML assembly
   that checks every `M` field has a value and returns one structured, human-readable error per
   missing field (see "logging" below) instead of the generic bind-error dump style used today.
5. **Wire routing**: `src/services/get-invoice-dom/get-invoice-dom.class.js` currently always
   calls `/JS/runCmd20210915/runExternalCode`. It needs to look up the retailer's provider (same
   `CCCSFTP.list({onlyActive:true})` + match by `TRDR_RETAILER` pattern already used in
   `edi-invoices.class.js`) and call the new AJS endpoint for `provider.code === 'infinite'`,
   keeping the existing endpoint for `docprocess`. Filename logic in `sendInvoiceXml()`
   (`frontend/src/services/api.js`) already just uses `domObj.filename` — as long as the new AJS
   function returns the corrected `<FINCODE>_<YYYY-MM-DD>.xml` filename, no frontend change needed.
6. **Logging + user-facing message (explicit ask from this session)**: pre-validation failures
   should (a) insert a row into `CCCORDERSLOG` via the existing `orders-log` service /
   `createOrderLog` AJS function (mirror the pattern in `src/services/recadv/recadv.class.js`,
   `OPERATION: 'sendInvoice'` or similar, visible on the app's Logs screen) **and** (b) return a
   clear, field-by-field message in the API response (not the raw multi-line Soft1 bind-error
   dump) so the operator knows exactly what to fix in Soft1 without reading logs.
7. **Test plan**: single invoice (`FAEX1-PF-40689` / FINDOC 2208760, or a fresh clean reception)
   end to end: generate → validate against the real schema informally (compare structure to a
   real archived file) → sign → upload to `/invoice/` → **check `/invoice/confirm` vs
   `/invoice/error`/`/invoice/omit` on the FTP afterwards** (read-only LIST, credentials from
   `CCCSFTP` via `mcp_s1-api_s1_query_dataset`, same safe pattern used this session) before
   declaring it works.
8. **Do NOT enable bulk/automatic sending** — this remains a deliberate one-invoice-at-a-time
   manual action per the beneficiary's existing `manualSend` decision, unchanged by this work.

## Deferred: the correct architecture (the promise)

**Acknowledged debt, recorded per explicit user request (2026-08-27): this dedicated builder is
being written under the same time pressure that produced `runCmd20210915.js` in 2021.** The
architecturally correct fix — for both DocProcess and Infinite, and for any future retailer/
provider — is a **generic outbound XML engine**, symmetric to `src/edi/order-builder.js`'s
existing **inbound** engine (`buildOrderPayload`, XML → SALDOC via `CCCXMLS1MAPPINGS` +
`runMappingSql`). That table already has a per-field mapping for Carrefour's `DXInvoice` (doc id
38, admin UI `doc-mappings-editor.js`/`xml-mapping-table.js`) but **nothing reads it for outbound
generation today** — it is documentation of the legacy script, not a live generator (confirmed by
reading every consumer of `CCCXMLS1MAPPINGS` this session).

When there is time to do this properly:
- Build `src/edi/invoice-builder.js` (or similar): SALDOC + `CCCXMLS1MAPPINGS` row (keyed by
  FPRMS/SERIES like the inbound side) → generated XML, SQL-per-field like the existing `SQL`
  column already supports.
- Populate real field mappings for **both** schemas: DocProcess's `DXInvoice` (Dedeman's own
  INVIOCE mapping row, id 45, currently has **zero** child field rows — empty placeholder) and
  Infinite's `Invoice v1.0.1` (would need a new set of ~50 rows, using the field table above).
- Retire the dedicated `InfiniteInvoice.js` builder (and eventually `runCmd20210915.js`'s
  DXInvoice path) once the generic engine covers both schemas and is verified equivalent.
- This is a genuine "planning/architecture" scope item, not a quick patch — treat it as its own
  planned session, not a drive-by addition to whatever else is in flight.

## See also
- [reception-screen.md](reception-screen.md) — Item A's send-path bug chain (transport, signing,
  credentials, series) that led here.
- [soft1-schema-facts.md](soft1-schema-facts.md) — `CCCDOCUMENTES1MAPPINGS`/`CCCXMLS1MAPPINGS`
  audit (which rows are real vs decorative).
- `documentatie/dedeman/XML_INVOICE_v4.pdf` — the source spec (not re-extracted into this repo as
  text; re-run `pypdf`/python-executor on it if the field table above needs re-verifying).
