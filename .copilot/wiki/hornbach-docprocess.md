# Hornbach through DocProcess: phased onboarding

## Status

Analysis completed on 2026-09-11 against the bundled Hornbach specifications, the current
application code, and live Soft1 production data for company 50. No database writes, XML uploads,
or external test submissions were performed.

The implementation order confirmed on 2026-09-11 is:

- Phase 1: receive DocProcess `ORDERS_` files and create Hornbach orders in S1;
- Phase 2: send merchandise invoices (`INVOIC`) and despatch advices (`DESADV`).

During the test phase, files must be sent by email one at a time and only after the previous file
has received feedback. The configured DocProcess transport must not be used until DocProcess
confirms production activation.

## Executive conclusion

Hornbach ORDER is not active today and cannot be enabled safely by adding one `CCCSFTP` row.
Phase 1 requires the ORDER mapping and duplicate protection to be proven before Pet Factory asks
DocProcess to activate delivery. Phase 2 has separate outbound gaps:

1. Hornbach has no `CCCSFTP`, `CCCDOCUMENTES1MAPPINGS`, or `CCCXMLS1MAPPINGS` configuration.
2. The current DocProcess invoice builder fails on a real Hornbach invoice and returns `dom:null`.
3. There is no active backend/UI path that builds and sends a DocProcess DESADV.
4. The shared DocProcess folder is already listed once per active retailer. Adding Hornbach's
  `CCCSFTP` row changes GLN routing and makes Hornbach orders actionable in the UI; the ORDER
  mapping and duplicate-order guard must therefore exist before production activation.

Implement and validate inbound ORDER first. Only after that flow is stable should Phase 2 add a
generic DocProcess outbound boundary with separate invoice and despatch serializers, a shared
uploader, and document-type-aware APERAK correlation. Existing DocProcess invoice behavior should
remain unchanged until the Hornbach profile passes email validation.

## Source specifications

- Invoice sample: `documentatie/hornbach/HORNBACH Electronic Invoice ENG/XML invoice - sample/InvoiceHornbach_RO123456.xml`
- Invoice XSD: `documentatie/hornbach/HORNBACH Electronic Invoice ENG/XSD invoice/docxchange-invoice-extended.xsd`
- Invoice data dictionary: `documentatie/hornbach/HORNBACH Electronic Invoice ENG/Documentation/DXF Data dictionary - Merchandise electronic invoice HORNBACH.pdf`
- DESADV sample: `documentatie/hornbach/DXF_Despatch_Advice_HORNBACH_CENTRALA_SRL/DXF XML DESADV/DESADV_test0123456_VAT_RO123456.xml`
- DESADV XSD: `documentatie/hornbach/DXF_Despatch_Advice_HORNBACH_CENTRALA_SRL/DXF XML DESADV/xsd/maindoc/UBL-DespatchAdvice-2.1.xsd`
- DESADV data dictionary: `documentatie/hornbach/DXF_Despatch_Advice_HORNBACH_CENTRALA_SRL/DXF XML DESADV/DXF Data dictionary for despatch advice HORNBACH CENTRALA SRL.pdf`

Both vendor samples validate against their bundled XSDs. Treat them as the structural oracle; the
data dictionaries are the Hornbach business-rule oracle because the base XSDs allow many fields
that Hornbach does not use.

DocProcess transport rules from the bundled interface specification:

- UTF-8 XML;
- adherent uploads to `/in`, receives platform documents in `/out`;
- filename format `TIPDOC_UUID_SourceType_IDSource.extension`;
- relevant examples are `INVOIC_<id>_VAT_RO25190857.xml` and
  `DESADV_<id>_VAT_RO25190857.xml`;
- only alphanumeric characters, underscore, and dot are allowed in filenames.

## Live Soft1 facts

Environment actually queried: production (`petfactory.oncloud.gr`), company 50, branch 1000,
read-only. The project has no separate `S1_TEST_URL` configured.

### Trading partners and branches

- Client: `TRDR=12168`, `CODE=11424`, `HORNBACH CENTRALA SRL`, VAT `17777320`, active,
  `SODTYPE=13`.
- Supplier duplicate: `TRDR=15800`, same legal entity and code, active, `SODTYPE=12`; irrelevant
  to outbound sales EDI.
- Eleven active customer branches exist: Militari, Berceni, Brasov, Balotesti, Timisoara, Sibiu,
  Oradea, Cluj, Constanta, Colentina, Timisoara 2. Every branch has a `CCCS1DXGLN`.
- The specifications contain two buyer head-office GLNs: invoice sample `5940475048006` and
  DESADV sample/dictionary `5940010999999`. Neither exists in `TRDBRANCH`, and
  `TRDR.CCCS1DXGLN` is null. DocProcess must identify the production value for each profile.
- `TRDR.CCCGLNFORCUSTOMER`, intended by the legacy builder as the supplier GLN for this customer,
  is also null.
- Hornbach's legal address exists only as `TRDR.ADDRESS='Str. HORNBACH 17-21'` and ZIP `077090`.
  The structured fields read by the builder (`CCCNUMESTREDIDX`, `CCCNREDIDX`,
  `CCCDOCPROCCITY`) are null.
- A more serious conflict exists in delivery-location master data: the vendor DESADV sample calls
  GLN `5940475048013` `781 HORNBACH MILITARI`, while live S1 assigns that GLN to branch 2390
  `BERCENI`; live S1 assigns `5940475048020` to `MILITARI`. No stored Hornbach order XML exists in
  `CCCSFTPXML` to arbitrate the conflict. Do not send a test for either branch until Hornbach or
  DocProcess confirms the authoritative GLN-to-store map.

Do not add the head-office GLN or alter master data without business confirmation. A GLN in a
specification is evidence of the expected payload, not authorization to change the active customer
contract/master data.

### Existing business data

Hornbach already has substantial sales activity in the last 24 months:

| Series | FPRMS | Meaning | Documents |
|---|---:|---|---:|
| 7012 | 701 | orders | 1,126 |
| 7111 | 711 | despatch advices | 1,982 |
| 7121 | 712 | invoices | 1,085 |
| 7531 | 753 | return invoices | 26 |
| 9221 | 922 | return advices | 3 |

All-time counts are 3,509 orders, 6,272 advices, and 4,157 invoices. `NUM04` contains plausible
Hornbach order numbers, although no active EDI configuration exists. Confirm operationally whether
orders currently arrive manually, through another integration, or through deleted legacy config.

Product mapping is comparatively healthy:

- 170 `CCCS1DXTRDRMTRL` rows for `TRDR=12168`;
- the four initially inspected documents had zero missing GTINs, buyer item codes, units, or
  source-document links;
- all Hornbach sale lines in the last year use S1 unit `Buc` and there are no
  `CCCALTTRDRMTRUNIT` rows. The legacy invoice builder emits fallback `PCE`, matching the invoice
  sample. The DESADV sample instead emits `BUC`, while its PDF code list names `PCE` (among other
  codes), so invoice and DESADV unit codes require separate DocProcess confirmation. A generic
  builder must map units per document profile instead of assuming every future item is a piece.

### Missing EDI configuration

For Hornbach client `12168`:

- `CCCSFTP`: 0 rows;
- `CCCDOCUMENTES1MAPPINGS`: 0 rows;
- `CCCXMLS1MAPPINGS`: 0 rows linked through document mappings;
- `CCCS1DXTRDRMTRL`: 170 rows.

The shared DocProcess account uses a single `/in` and `/out`. Existing DocProcess rows already
cause `docprocess.provider.js` to list that shared folder for `ORDERS_` and `APERAK_`; adding
Hornbach does not begin the listing. It adds Hornbach to the GLN routing candidates. On every scan,
`processPendingOrders()` automatically claims and converts pending ORDER rows for all active
retailers. A generic duplicate guard already checks `TRDR + NUM04`, but it is effective only after
the Hornbach ORDER mapping has populated `NUM04`. With no mapping, files become `XMLSTATUS=ERROR`;
with a wrong mapping, the duplicate guard may miss manually keyed orders. Production activation
must therefore be atomic with a verified ORDER mapping and duplicate-guard test.

No `CCCSFTPXML` row currently contains the known Hornbach GLNs and no Hornbach routing error is
stored. A full live search across 6,185 stored rows found no Hornbach GLN, VAT number, name, or
filename, including zero `TRDR_RETAILER=0` routing-error rows. The scanner is healthy and processed
other DocProcess orders on 2026-09-11. Therefore the absence of a Hornbach routing error means no
Hornbach file reached this scanner; it does not mean routing was validated or that activation was
approved. All 3,509 existing Hornbach orders on series 7012 were inserted by named human users,
none by the WS/import users, and none is linked from `CCCSFTPXML`.

### ORDER activation and acknowledgement

No bundled DocProcess/Hornbach specification defines `ORDRSP`, and the application has no outbound
order-response implementation. The supplied APERAK format is feedback sent **to** Pet Factory for
documents Pet Factory sends (`INVOIC`/`DESADV`), not an acknowledgement Pet Factory sends for an
inbound ORDER. Consequently Phase 1 requires no per-order `ORDRSP`, APERAK, or accept message based
on the available contract and the behavior of existing DocProcess retailers.

Starting the relation still requires an explicit operational confirmation: after Pet Factory has
validated Phase 1 locally, it should tell DocProcess it is ready and ask DocProcess to confirm the
Hornbach-to-Pet-Factory ORDER activation date, production GLNs, filename convention, and whether a
Hornbach-specific acknowledgement exists outside the supplied specification. Do not infer that
approval from an empty routing-error list. Once DocProcess starts placing Hornbach `ORDERS_` in the
shared inbox, the current scanner will consume them; before Hornbach becomes an active routing
candidate they will be stored as routing errors.

The existing outbound mapping records are not a ready-made engine:

- Supeco invoice mapping 35 has 66 child rows, but generation does not read them;
- its `CustomerAssignedAccountID` mapping still says `3446`, while the live AJS builder overrides
  Supeco to `15121` in code;
- Dedeman DESADV mapping 44 and invoice mapping 45 each have zero child rows;
- therefore existing outbound rows are partly documentation/stale config, not executable truth.

`CCCXMLS1MAPPINGS` nevertheless has the fields needed for a future configurable engine
(`DEFAULT_VALUE`, `TRANSFORMATION`, `TRANSFORMATION_PARAMS`, `REQUIRED`, `POSITION`,
`IS_ATTRIBUTE`). Do not copy the rows blindly; reconcile them with proven live output first.

## Current application behavior

### Invoice

The active path is:

1. frontend `sendInvoiceXml()`;
2. `get-invoice-dom` selects the builder by `CCCSFTP` provider;
3. DocProcess uses `/JS/runCmd20210915/runExternalCode`;
4. `edi-invoices` uploads the returned XML to `CCCSFTP.INITIALDIROUT`;
5. `mark-invoice-sent` writes the filename/send date;
6. the scanner downloads `APERAK_` responses and the invoice table displays them.

The same AJS builder succeeds for a current Supeco invoice and produces
`INVOIC_40970_VAT_RO25190857.xml`. For Hornbach invoice `FINDOC=2212291` it returns `dom:null`
with missing buyer street/building/city and bank errors.

Additional defects/risk in the legacy builder:

- Hornbach is absent from the `CustomerAssignedAccountID` overrides; fallback is `3446`.
  The supplied Hornbach code `16550000` was requested separately for onboarding and is not listed
  in the Hornbach XML dictionary. Confirm with DocProcess before mapping it to this XML element.
- the supplier building number is hardcoded to `118`, while current `COMPANY.ADDRESS` says
  `Soseaua Mihai Bravu nr. 255 Parter`; business must confirm the legal address to emit;
- the payee bank is queried from `SALDOC.TRDR` (the buyer) even though payee means supplier;
  Hornbach's profile does not require `PaymentMeans`, so omit the optional block until its source
  is corrected;
- `ID` and filename use `SERIESNUM` (`40770`), not `FINCODE` (`FAEX-PF-40770`). Existing
  DocProcess behavior proves the former convention but Hornbach acceptance must confirm it. Both
  values refer here to failing Hornbach `FINDOC=2212291`;
- the buyer/head-office GLN is marked optional in the legacy object model, so after fixing the
  address errors the builder can silently emit an XML without the Hornbach GLN. The new Hornbach
  validator must enforce it even though the generic XSD allows omission;
- the builder aggregates duplicate MTRL lines. The selected tests contain no within-document
  duplicates, but a generic implementation must not merge lines when price, VAT, order reference,
  or other commercial attributes differ.

### Despatch advice

No active DESADV builder, backend service, API orchestration, tests, or frontend tab exists.
The only DESADV mapping found is the empty Dedeman placeholder. Legacy Soft1 export functions are
invoice-specific and do not implement the Hornbach UBL `DespatchAdvice` sample.

The required Hornbach DESADV data is mostly available:

- header: aviz number/date, order number, requested delivery date, document status `351`;
- buyer head office, supplier, delivery store, and ship-from parties;
- line: description, GTIN, Hornbach code, Pet Factory code, quantity, and unit.

For sample aviz `FINDOC=2220396`, all 17 lines point to order `CKEY-00062458`, Hornbach order
`7810551740`. `MTRLINESS` and the inspected custom line-number fields are null. The order-line
number cannot be reconstructed reliably when the same product can occur more than once. UBL
requires at least one `cac:OrderLineReference` per `cac:DespatchLine`, and its `cbc:LineID` is
mandatory, so omitting either the wrapper or `LineID` is XSD-invalid. For the selected test pairs,
matching each aviz line to its source order by `(FINDOCS, MTRL)` is unique: Round 1 resolves to
order line 1 and Round 2 resolves to order lines 4 and 1. The first implementation may use that
inference only with a fail-closed cardinality check (`exactly one`); any zero/multiple match
requires manual review and must not produce XML. Confirm that Hornbach accepts the source order's
S1 `LINENUM` as buyer line ID.

### APERAK

The scanner already parses DocProcess APERAK and stores it in `CCCAPERAK`, but correlation is
hardcoded to `FPRMS=712` invoices. Before that query, `normalizeDocumentReference()` only strips
`INVOIC_` and its fallback regex only recognizes `Nume fisier: INVOIC_...`; a DESADV reference is
therefore left as the full filename and cannot match `FINCODE`. The lookup also has no TRDR
predicate and uses `TOP 1` plus `FINCODE LIKE`, which is unsafe across document types and retailers.
The same INVOIC-only parsing and invoice-only SQL are duplicated in the legacy
`sftp.storeAperakInErpMessages()` path. Both paths must normalize `INVOIC` and `DESADV`, select
`FPRMS=712` or `711` by document type, require the retailer, parameterize the reference, and prefer
an exact normalized identifier.

### Frontend

Hornbach `12168` is absent from the static `RETAILERS` list. The retailer page has Orders and
Invoices tabs (plus Receptions only for Infinite retailers); there is no Advices tab. Invoice
defaults already match Hornbach (`FPRMS=712`, series 7121).

## Required field-source decisions

| Requirement | Proposed source | Status |
|---|---|---|
| Invoice/despatch number | `FINDOC.SERIESNUM` or `FINCODE` | Confirm with DocProcess |
| Invoice/despatch issue date | `FINDOC.TRNDATE` | Available |
| Hornbach order number | `FINDOC.NUM04`, cross-check source order | Available |
| Order date | source order `FINDOC.TRNDATE` when `DATE01` is null | Available through conversion chain |
| Invoice despatch reference | unique source aviz from invoice lines | Available through conversion chain |
| Delivery/requested date | source aviz/order `MTRDOC.DELIVDATE` | Available on recommended tests |
| Hornbach head-office GLN | invoice `5940475048006`; DESADV `5940010999999` | Both missing in S1; confirm profile values |
| Delivery-store GLN | `TRDBRANCH.CCCS1DXGLN` | Populated, but `...48013` is Berceni in S1 and Militari in sample |
| Pet Factory GLN | customer-specific/master-data value | Missing for Hornbach; business input required |
| Hornbach legal address | structured TRDR fields | Missing; raw address alone is insufficient |
| Supplier legal address | COMPANY master data | Resolve `255` versus legacy hardcoded `118` |
| Hornbach item code | `CCCS1DXTRDRMTRL.CODE` | Available for selected tests |
| GTIN / supplier item code | `MTRL.CODE1` / `MTRL.CODE` | Available for selected tests |
| Unit code | explicit per-profile mapping | INVOIC sample `PCE`; DESADV sample `BUC`; confirm conflict |
| Supplier code `16550000` | onboarding metadata; XML only if confirmed | Not found in S1/spec sample |

## Recommended test documents

Use real, internally coherent pairs and generate files only after the unresolved party/master-data
values are confirmed.

### Round 1: minimal one-line pair

- DESADV: `FINDOC=2207467`, `AEX-AE-055183`, number `55183`, 2026-08-26, Sibiu,
  GLN `5940475048075`, order `7850601889`, requested delivery 2026-08-31, one line.
- INVOIC: `FINDOC=2212295`, `FAEX-PF-40774`, number `40774`, 2026-09-01, same order/branch,
  net 108.08, VAT 22.70, total 130.78, one 21% VAT line.

### Round 2 candidate: multi-rate pair, blocked on branch GLN confirmation

- DESADV: `FINDOC=2186430`, `AEX-AE-054270`, number `54270`, 2026-07-29, Berceni,
  GLN `5940475048013`, order `7800577390`, requested delivery 2026-08-03, two lines.
- INVOIC: `FINDOC=2194278`, `FAEX-PF-40307`, number `40307`, 2026-08-10, same order/branch,
  net 167.02, VAT 27.64, total 194.66, one 11% and one 21% VAT line.

Both candidates have complete buyer code, GTIN, supplier code, quantity, price, source-document,
and delivery-date data. Neither round is authorized until the full 11-branch GLN map confirms its
store; Round 2 has the additional known Berceni-versus-Militari conflict and must be replaced or
explicitly approved if S1 is wrong. Send one XML by email, wait for feedback, correct, then send
the next. Never use the production SFTP connection during this sequence.

## Recommended implementation sequence

### Phase 1 - ORDER inbound

1. Implement (model: Claude Sonnet 5): prepare Hornbach's ORDER document mapping and seven field
  mappings, including Hornbach-specific TRDR/branch and article transforms.
2. Implement (model: Claude Sonnet 5): test parse, mapping, `NUM04` duplicate detection, and S1
  creation against fixtures without reading or changing the production DocProcess inbox.
3. Mechanical (model: qwen3.8:27b-q4_K_M): add Hornbach frontend/master-data wiring after the
  production GLN-to-store map is confirmed.
4. Review (model: Claude Opus 5, fresh small context): verify mapping and rollback/hold behavior,
  then obtain Pet Factory/DocProcess agreement on a controlled activation window.
5. Activation: add the active Hornbach `CCCSFTP` row only when the tested mapping is deployed and
  DocProcess confirms it will start delivering Hornbach ORDER files. Monitor the first files and
  S1 documents before leaving automatic conversion enabled.

### Phase 2 - DESADV and INVOIC outbound

6. Implement (model: Claude Sonnet 5): add a DocProcess outbound builder boundary with separate
  `invoice` and `desadv` serializers plus preview-only generation without upload.
7. Implement (model: Claude Sonnet 5): generalize upload/log/mark behavior and APERAK correlation
  in both scanner and legacy SFTP paths for `INVOIC`/`FPRMS=712` and `DESADV`/`FPRMS=711`.
8. Mechanical (model: qwen3.8:27b-q4_K_M): expose separate Facturi and Avize frontend views;
  sending remains disabled during email testing.
9. Review (model: Claude Opus 5, fresh small context): review generated XML, validate both types
  against XSD and Hornbach rules,
   compare mandatory fields to the data dictionaries, and regression-test existing DocProcess
   invoice generation and APERAK matching.
10. Run the four email tests in the agreed one-file-at-a-time order. Production upload remains
   disabled until written approval from DocProcess and Hornbach activation.

Reference validation command used during this investigation (both samples returned `VALID`):

```powershell
uv run --with lxml python -c "from lxml import etree; s=etree.XMLSchema(etree.parse('schema.xsd')); d=etree.parse('sample.xml'); print('VALID' if s.validate(d) else s.error_log)"
```

## Blocking confirmations

Before implementation can produce authoritative test files, obtain:

1. whether XML IDs should be `SERIESNUM` or full `FINCODE`;
2. whether supplier code `16550000` belongs only in onboarding metadata or also in
   `AccountingSupplierParty/CustomerAssignedAccountID`;
3. Pet Factory's GLN for the Hornbach relationship;
4. the production buyer/head-office GLN per profile (`5940475048006` in INVOIC versus
  `5940010999999` in DESADV), plus the authoritative GLN-to-store map for all 11 branches;
5. the legal supplier building number/address (`255` in COMPANY versus legacy `118`);
6. confirmation that the uniquely inferred source-order `LINENUM` is the required DESADV buyer
  `LineID`, and the expected handling when that inference is ambiguous;
7. the DESADV unit code for pieces (`BUC` in sample versus `PCE` in the PDF code list).
