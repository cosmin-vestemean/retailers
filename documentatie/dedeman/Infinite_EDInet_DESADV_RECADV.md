# Infinite EDInet: DESADV, RECADV și RETANN Dedeman

> Documentație tehnică extrasă la 2026-07-27 cu MCP `python-executor` din:
>
> - `XML_DESADV_v4.1.pdf`, 10 pagini, versiunea curentă DESADV;
> - `XML_DESADV_v4.pdf`, 9 pagini, folosită pentru comparație;
> - `XML_RECADV_v4.pdf`, 5 pagini;
> - `RECADV TECHNICAL SPECIFICATION ... VERSION 4.0 - EDInet XML` și `RETANN TECHNICAL SPECIFICATION ... VERSION 4.0 - EDInet XML`, Infinite IT Solutions SRL.
>
> Acest fișier este sursa canonică pentru schemele XML. Regulile de business asociate se află în `documentatie/Fluxuri complete EDInet Auchan-Dedeman/Manual_integrare_facturare_edi_Auchan_Dedeman.md`.
>
> Specificațiile sunt dedicate proiectului Dedeman. Nu trebuie presupusă compatibilitatea Auchan fără documentație sau payload real.

## Rolurile mesajelor

- **DESADV** este mesaj outbound Pet Factory -> Dedeman. Descrie marfa expediată și referințele către comandă și avizul de livrare.
- **RECADV** este mesaj inbound Dedeman -> Pet Factory. Confirmă recepția și cantitățile acceptate/returnate.
- **RETANN** este mesaj inbound Dedeman -> Pet Factory. Anunță returul de marfă, cu cantități negative și referințe către comandă și DESADV.
- RECADV nu este APERAK și nu trebuie stocat sau procesat prin `CCCAPERAK`.

## Convenții comune

- `M`: obligatoriu.
- `M*`: obligatoriu și repetabil.
- `O`: opțional.
- `O*`: opțional și repetabil.
- `D`: dependent de context.
- Datele pot fi `YYYY-MM-DD` sau `YYYY-MM-DDTHH:MM:SS` în RECADV.
- Separatorul zecimal este punctul; separatorii de mii nu sunt permiși.
- Identificatorii GLN trebuie păstrați ca șiruri, nu ca numere.

## DESADV v4.1

### Diferențe față de v4.0

Compararea automată a textului PDF a găsit doar următoarele schimbări de schemă:

1. `EAN` a devenit opțional; în v4.0 era obligatoriu.
2. `BuyerItemID` a devenit opțional; în v4.0 era obligatoriu.
3. A fost adăugat câmpul opțional `BatchNumber`, format `AN(200)`.

Generatorul trebuie deci să emită v4.1 și să nu presupună că EAN și codul cumpărătorului sunt simultan obligatorii. Operațional, fiecare linie trebuie totuși să conțină un identificator suficient pentru reconciliere.

### Structură

```text
Desadv
├── DesadvHeader
│   ├── DesadvNumber
│   ├── DesadvDate
│   ├── PlannedDeliveryDate
│   ├── Comment?
│   ├── DeliveryDetails?
│   ├── TransportDetails?
│   └── ReferenceDocs?
├── DesadvParty
│   ├── BuyerParty
│   ├── ShipToParty
│   ├── SellerParty
│   ├── ShipFromParty?
│   ├── ForwarderParty?
│   ├── SellerHeadquartersParty?
│   └── ConsigneeParty?
├── DesadvDetail
│   └── Packaging+
│       ├── StructureLevelId
│       ├── ParentStructureLevelId?
│       ├── PackageIdentification*
│       └── LineItems
│           └── Item+
└── DesadvSummary?
```

### Antet obligatoriu

| XPath relativ | Cerință | Format | Rol |
| --- | --- | --- | --- |
| `DesadvHeader/DesadvNumber` | M | AN(50) | Numărul DESADV |
| `DesadvHeader/DesadvDate` | M | YYYY-MM-DD | Data documentului |
| `DesadvHeader/PlannedDeliveryDate` | M | YYYY-MM-DD | Data planificată a livrării |

Referințele opționale din antet sunt:

- `ReferenceDocs/OrderAtBuyer/DocID`, numărul comenzii clientului;
- `ReferenceDocs/DeliveryDocument/DocID`, numărul avizului de livrare;
- `ReferenceDocs/TransportDocument/DocID`, documentul de transport.

Fiecare referință poate avea `DocDate`.

### Părți

Obligatorii:

- `BuyerParty/ILN`: GLN Dedeman;
- `ShipToParty/ILN`: GLN-ul magazinului/depozitului;
- `SellerParty/ILN`: GLN Pet Factory;
- `SellerParty/IDInBuyerSys`: codul Pet Factory în sistemul Dedeman.

`ShipFromParty` devine obligatoriu dacă furnizorul are mai multe puncte de expediție.

### Linie DESADV

| Câmp | Cerință | Format | Rol |
| --- | --- | --- | --- |
| `ItemNum` | M | N | Poziția liniei |
| `EAN` | O | AN(50) | EAN/GTIN produs |
| `BuyerItemID` | O | AN(50) | Cod produs în sistemul Dedeman |
| `SellerItemID` | O | AN(50) | Cod produs Pet Factory |
| `BatchNumber` | O | AN(200) | Lot, adăugat în v4.1 |
| `PacketContentQuantity` | O | R(3) | Unități per ambalaj |
| `QuantityValue` | M | R(3) | Cantitate expediată |
| `UnitOfMeasure` | M | AN(3) | Unitate de măsură |
| `ChangeReasonCode` | O | AN(2) | Motivul diferenței față de comandă |
| `Name` | M | AN(500) | Denumire produs |
| `OrderedQuantity` | M | R(3) | Cantitate comandată |
| `DeliveryDate` | M | YYYY-MM-DD | Data livrării |

Coduri documentate pentru `ChangeReasonCode`:

- `AB`: discontinued;
- `AC`: cantitate prea mare;
- `AD`: lipsă în stocul furnizorului;
- `AE`: informație indisponibilă;
- `AF`: marfă deteriorată;
- `AG`: livrare întârziată.

Fiecare linie poate repeta referințele:

- `ReferenceDocs/OrderAtBuyer/DocID`;
- `ReferenceDocs/DeliveryDocument/DocID`.

Regula oficială: referințele se pun în antet numai dacă toate liniile aparțin aceleiași comenzi, aceluiași aviz și aceleiași locații. Altfel trebuie transmise pe linii. Această regulă este relevantă pentru consolidări.

### Ambalaje și paleți

`Packaging` este repetabil și obligatoriu. Structura poate reprezenta ierarhii prin:

- `StructureLevelId`;
- `ParentStructureLevelId`;
- `PackageQuantity`, `PackageType`, `GTIN`, `SSCC`.

Unitățile declarate includ `PAL`, `COL`, `SET`, `ROL`, `L`, `PAC`, `M3`, `M2`, `M`, `BUC`, `PUN`, `ML`, `KGM`, `CUT`.

Această structură nu schimbă regula beneficiarului conform căreia paleții returnabili neavizați/fără preț nu intră în factură.

## RECADV v4.0

### Structură

```text
Document
├── RecadvHeader
├── RecadvParty
│   ├── BuyerParty
│   ├── ShipToParty
│   └── SellerParty
├── RecadvDetail
│   └── Item+
├── RecadvSummary
└── DocumentSummary
```

Rădăcina este `Document`, nu `Recadv`. Parserul trebuie să caute explicit `Document/RecadvHeader`.

### Antet

| XPath relativ | Cerință | Rol |
| --- | --- | --- |
| `RecadvHeader/DocumentNumber` | M | Identificator unic RECADV, max. 14 caractere |
| `RecadvHeader/DocumentIssueDate` | M | Data emiterii |
| `RecadvHeader/GoodsReceiptDate` | D | Data recepției |
| `RecadvHeader/BuyerOrderNumber` | M | Unul sau mai multe numere de comandă |
| `RecadvHeader/BuyerOrderDate` | D | Data comenzii |
| `RecadvHeader/DeliveryDocumentNumber` | D | Unul sau mai multe numere de aviz |
| `RecadvHeader/DeliveryDocumentDate` | D | Data avizului |

Exemplul oficial transmite:

- comenzi multiple separate prin virgulă: `4509147133,4509163055`;
- avize multiple separate prin `/`: `DI-00006331/DI-0...`.

Parserul trebuie să păstreze valoarea brută și să producă liste normalizate. Nu trebuie presupus un singur document sursă.

### Părți și rutare

- `BuyerParty/GLN` este obligatoriu și identifică Dedeman; exemplul oficial folosește `5940475841003`.
- `ShipToParty/GLN` este obligatoriu și identifică locația de recepție.
- `SellerParty/GLN` este obligatoriu și identifică furnizorul.
- `SellerParty/SellerId` este dependent.

Rutarea recomandată:

1. retailer prin `BuyerParty/GLN`;
2. filială prin `ShipToParty/GLN -> TRDBRANCH.CCCS1DXGLN` pentru retailerul rezolvat;
3. verificare suplimentară a `SellerParty/GLN` față de Pet Factory.

Rutarea trebuie să eșueze controlat dacă retailerul sau filiala sunt necunoscute ori ambigue.

### Linie RECADV

| Câmp | Cerință | Rol |
| --- | --- | --- |
| `BuyerItemNum` | M | Numărul poziției |
| `GTIN` | D | EAN/GTIN produs |
| `BuyerItemID` | M | Codul produsului în sistemul Dedeman |
| `SellerItemID` | D | Codul produsului furnizorului |
| `QuantityOrdered` | D | Cantitatea comandată |
| `QuantityAccepted` | M | Cantitatea acceptată la recepție |
| `QuantityReturned` | D | Cantitatea returnată |
| `UnitNetPrice` | D | Preț unitar net |
| `ReasonForReturnCode` | D | Cod motiv retur |
| `ReasonForReturnDescription` | D | Descriere motiv retur |
| `UnitOfMeassure` | M | Unitatea de măsură |
| `ProductDescription` | M | Denumirea produsului |
| `BuyerOrderNumber` | M | Comanda sursă a liniei |

Specificația scrie intenționat `UnitOfMeassure` cu două litere `s`. Parserul trebuie să accepte această denumire exactă și poate tolera și forma corectată `UnitOfMeasure` pentru robustețe.

### Matching produs Dedeman

Specificația rezolvă ambiguitatea din analiza Soft1:

- `BuyerItemID` este obligatoriu;
- `GTIN` este doar dependent;
- mapping-ul principal trebuie să fie `BuyerItemID -> CCCS1DXTRDRMTRL.CODE`, pentru `TRDR=11654`;
- dacă este prezent, `GTIN` trebuie folosit ca validare secundară față de EAN-ul produsului, nu comparat direct cu `CCCS1DXTRDRMTRL.CODE`.

Exemplul real Soft1 confirmă această separare: cod Dedeman `7073512`, EAN `5949060224108`.

### Reconciliere

Pentru fiecare linie RECADV:

1. Se rezolvă comanda din `Item/BuyerOrderNumber`.
2. Se rezolvă produsul prin `BuyerItemID`.
3. Se identifică linia/avizul Soft1 sursă.
4. Se compară `QuantityAccepted` cu cantitatea expediată din 7111.
5. Diferența pozitivă `expediat - acceptat` devine candidat pentru 9221.
6. Factura include numai cantitatea acceptată.

`QuantityReturned` și motivele sunt informații suplimentare; diferența nu trebuie calculată numai din aceste câmpuri deoarece sunt dependente și pot lipsi.

Pentru consolidări, `Item/BuyerOrderNumber` este cheia principală la nivel de linie. Listele din antet sunt folosite pentru validare și pentru detectarea documentelor sursă multiple.

### Dedupe și idempotency

Cheia primară recomandată pentru ingestie este:

- provider `infinite`;
- document type `RECADV`;
- `DocumentNumber`;
- retailer rezolvat.

Numele numeric al fișierului FTP nu este identificatorul de business și trebuie păstrat doar ca referință de transport.

## RETANN v4.0

### Structură

```text
Retann
├── RetannHeader
├── RetannParty
│   ├── BuyerParty
│   ├── ShipToParty
│   └── SellerParty
├── RetannRefDoc
├── RetannDetail
│   └── Item+
│       └── RetannRefDoc
└── RetannSummary
```

Rădăcina este `Retann`, spre deosebire de RECADV unde rădăcina este `Document`. Cele două scheme nu sunt interschimbabile și niciuna nu coincide cu schema `Document/Order` folosită la comenzi.

Exemplu oficial disponibil local: `documentatie/dedeman/RetAnn.xml`. Este exemplul din specificație, nu un payload de producție; poate fi folosit ca șablon de fixture, dar nu ca validare a formatului livrat real.

### Antet

| XPath relativ | Cerință | Rol |
| --- | --- | --- |
| `RetannHeader/RetannNumber` | M | Identificator RETANN, max. 14 caractere |
| `RetannHeader/IssueDate` | M | Data emiterii |

### Părți și rutare

RETANN folosește `ILN` în loc de `GLN` și grupează adresele în `AddressDetails`.

| XPath relativ | Cerință | Rol |
| --- | --- | --- |
| `RetannParty/BuyerParty/ILN` | M | GLN retailer, identifică Dedeman |
| `RetannParty/BuyerParty/IDInSupplierSys` | D | Codul retailerului la furnizor |
| `RetannParty/ShipToParty/ILN` | M | Locația de retur |
| `RetannParty/SellerParty/ILN` | M | GLN Pet Factory |
| `RetannParty/SellerParty/IDInBuyerSys` | D | Codul Pet Factory la retailer |

Rutarea urmează același model ca RECADV: retailer prin `BuyerParty/ILN`, filială prin `ShipToParty/ILN -> TRDBRANCH.CCCS1DXGLN`, cu eșec controlat dacă nu se rezolvă neechivoc.

### Referințe documentare

`RetannRefDoc` apare atât în antet, cât și pe fiecare linie.

| XPath relativ | Cerință | Rol |
| --- | --- | --- |
| `RetannRefDoc/OrderAtBuyerParty/DocID` | D în antet, M pe linie | Numărul comenzii |
| `RetannRefDoc/OrderAtBuyerParty/DocDate` | D / M | Data comenzii |
| `RetannRefDoc/DesadvParty/DocID` | D | Numărul DESADV/avizului nostru |

`DesadvParty/DocID` este legătura directă către avizul Soft1 din seria 7111. Ca și la RECADV, referințele de pe linii sunt autoritare, iar cele din antet sunt folosite pentru validare.

### Linie RETANN

| Câmp | Cerință | Rol |
| --- | --- | --- |
| `ItemNumber` | M | Poziția liniei în RETANN |
| `OriginalItemNumber` | D | Poziția liniei în documentul sursă |
| `EAN` | D | EAN/GTIN produs |
| `BuyerItemID` | M | Codul produsului în sistemul Dedeman |
| `SellerItemID` | D | Codul produsului furnizorului |
| `Name` | M | Denumirea produsului |
| `UnitNetPrice` | M | Preț unitar net, valoare pozitivă |
| `MonetaryNetValue` | M | Valoare netă, **negativă** |
| `QuantityOrdered` | M | Cantitate, **negativă** |
| `QuantityReturned` | M | Cantitate returnată, **negativă** |
| `UnitOfMeassure` | M | Unitatea de măsură |

`RetannSummary/TotalReceiptAmount` încheie documentul și este de asemenea negativ.

### Observații pentru parser

1. Semnele sunt negative pe cantități și valori. Normalizarea trebuie să fie explicită și documentată, pentru a nu dubla semnul la crearea documentului Soft1.
2. `UnitOfMeassure` păstrează aceeași greșeală de scriere ca în RECADV.
3. Specificația conține erori de tipar în tabelul de câmpuri (`</MonetaryNetvalue>`, `<//DocID>`), corectate în exemplul XML. Parserul trebuie să fie tolerant și validat pe un payload real.
4. `EAN` este dependent și, în exemplul oficial, conține `7001189` — valoare care nu este un EAN-13 valid. Nu trebuie folosit ca cheie de identificare; matching-ul rămâne pe `BuyerItemID`.
5. Exemplul oficial este un retur de paleți (`PALET 466`). Regula beneficiarului conform căreia paleții returnabili nu se facturează trebuie aplicată înainte de generarea oricărui document Soft1.
6. Dedupe recomandat: provider `infinite`, document type `RETANN`, `RetannNumber`, retailer rezolvat.

### Relația cu PV-ul de neconformitate

Manualul beneficiarului descrie un PV de neconformitate cu `Motiv de mutare` (`Marfa lipsa` / `Plus fata de aviz`). Niciuna dintre specificații nu conține un număr de PV: RECADV are doar `ReasonForReturnCode` și `ReasonForReturnDescription`, ambele dependente. Ipoteza de lucru este că PV-urile sosesc ca RETANN, susținută de volumele observate pe FTP la 2026-07-27 (91 fișiere în `/recadv`, 5 în `/retann`), dar exemplul oficial RETANN este un retur de paleți, nu un PV de lipsă. Ipoteza rămâne neconfirmată până la obținerea unui payload real.

## Impact asupra codului curent

În `src/edi/providers/infinite.provider.js`:

- `/recadv/` este mapat greșit conceptual la `aperak`;
- `parseAperak()` este doar un stub și nu normalizează RECADV;
- trebuie introdus un document type `recadv` separat;
- parserul trebuie să accepte rădăcina `Document/RecadvHeader` și câmpul `UnitOfMeassure`;
- fișierele numerice trebuie acceptate numai în directorul RECADV, nu global;
- rutarea trebuie făcută din GLN-urile XML, nu din prefixul numelui de fișier.

DESADV nu apare implementat în codul EDI actual ca generator dedicat conform v4.1. Înainte de integrarea outbound trebuie verificat XML-ul produs astăzi de Soft1 și comparat cu această schemă.

## Validări înainte de activare

1. Obținerea unui RECADV real fără consumarea în masă a fișierelor live.
2. Confirmarea delimitatorilor reali pentru listele din antet.
3. Confirmarea că `BuyerItemID`, `QuantityAccepted` și `BuyerOrderNumber` sunt populate pe toate liniile reale.
4. Verificarea GLN-urilor reale pentru retailer, filială și Pet Factory.
5. Compararea cantităților cu avizele Soft1 folosind exemplele deja validate.
6. Backup DigitalOcean înainte de orice procesare DB/Soft1.
7. Mod manual/read-only la prima ingestie: parse, route și reconcile fără creare de documente.
