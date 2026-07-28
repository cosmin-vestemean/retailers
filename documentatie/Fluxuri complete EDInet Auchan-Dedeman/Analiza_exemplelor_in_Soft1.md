# Analiza exemplelor EDInet în Soft1

> Verificare read-only efectuată la 2026-07-27 prin MCP `soft1-petfactory`, în baza de producție `PetFactory`, `COMPANY=50`.

## Rezumat

Exemplele din manual sunt reale și documentele Soft1 confirmă:

- facturarea cantității acceptate și returul 9221 pentru lipsă;
- consolidarea a două avize într-o singură factură Dedeman;
- matching-ul Auchan prin codul la client;
- excluderea paleților din linii, aceștia fiind păstrați doar în observații.

Au rezultat două corecții importante pentru implementare:

1. Mapping-ul activ al comenzilor Dedeman nu folosește EAN-ul pentru identificarea `MTRL`; folosește `BuyerItemID -> CCCS1DXTRDRMTRL.CODE`. EAN-ul este separat, în `MTRL.CODE1`.
2. Comanda Dedeman `DOAR AVIZ` din exemplu a fost integrată în realitate ca CKEY și a generat un al doilea aviz și o a doua factură. Factura veche a fost apoi întoarsă prin seria 7531. Acest flux real contrazice regula propusă în manual, conform căreia o astfel de comandă trebuie păstrată numai în Retailers și nu trebuie creată ca CKEY.

## Seriile confirmate în nomenclator

| Serie | Cod | Denumire oficială | FPRMS |
| --- | --- | --- | --- |
| 7012 | CKEY- | Comanda vanzari Keyaccount | 701 |
| 7111 | AEX- | Aviz Expeditie Client | 711 |
| 7122 | FAEX1- | Factura cf Aviz Expeditie - Auchan-Real | 712 |
| 7123 | FAEXD- | Factura cf Aviz Expeditie Dedeman | 716 |
| 7531 | RFVQ- | Retur Factura vanzari (QV) | 753 |
| 9221 | AAEX- | Anulare Aviz Expeditie Client | 922 |

Seria 7531 este retur de factură, nu notă de recepție. Seria 9221 este anularea/returul avizului de expediție.

## Auchan: comanda 1436603

Lanțul din manual este confirmat integral:

| FINDOC | FINCODE | Serie | Total cu TVA | Linii | Cantitate |
| ---: | --- | ---: | ---: | ---: | ---: |
| 2173392 | CKEY-00060977 | 7012 | 68.030,89 | 44 | 3.805 |
| 2174988 | AEX-AE-053710 | 7111 | 61.104,39 | 36 | 3.135 |
| 2177841 | FAEX1-PF-39742 | 7122 | 61.094,05 | 36 | 3.134 |
| 2177842 | AAEX-PET-3072 | 9221 | 10,35 | 1 | 1 |

Relațiile de conversie sunt păstrate pe linii:

- avizul 2174988 provine din CKEY 2173392;
- factura și returul provin din avizul 2174988;
- linia facturată și linia returnată indică aceeași linie sursă din aviz.

### Produsul cu lipsă

- `MTRL=40977`
- cod Soft1: `MF.08360`
- produs: `ASTERNUT IGIENIC MIAU MIAU PORTOCALA 5KG`
- cod Auchan în `CCCS1DXTRDRMTRL.CODE`: `363360`
- CKEY și aviz: 417 bucăți × 8,55 RON net
- factură: 416 bucăți × 8,55 RON net
- retur 9221: 1 bucată × 8,55 RON net = 10,35 RON cu TVA

Acest caz confirmă matching-ul Auchan prin codul la client `363360`.

## Dedeman: lipsă, comanda 4516724271

| FINDOC | FINCODE | Serie | Total cu TVA | Linii | Cantitate | Valoare netă linii |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 2169287 | CKEY-00060819 | 7012 | 10.683,84 | 76 | 1.687 | 9.257,62 |
| 2170208 | AEX-AE-053528 | 7111 | 8.628,46 | 57 | 1.338 | 7.447,62 |
| 2182239 | FAEXD-PF-39867 | 7123 | 8.576,25 | 57 | 1.290 | 7.400,58 |
| 2182240 | AAEX-PET-3078 | 9221 | 52,21 | 1 | 48 | 47,04 |

Relațiile confirmă formula:

- factura 7123 provine din avizul 7111;
- returul 9221 provine din aceeași linie a avizului;
- `8.628,46 - 52,21 = 8.576,25` cu TVA;
- `7.447,62 - 47,04 = 7.400,58` net.

### Produsul cu lipsă

- `MTRL=44622`
- cod Soft1: `PF.00015`
- produs: `CAT JOY PUI, PLIC 85G`
- EAN în `MTRL.CODE1`: `5949060224108`
- cod Dedeman în `CCCS1DXTRDRMTRL.CODE`: `7073512`
- aviz: 96 bucăți × 0,98 RON net
- retur: 48 bucăți × 0,98 RON net = 47,04 RON net
- facturat: 48 bucăți acceptate

Manualul descrie corect cantitățile și valoarea netă, dar formularea despre tabela de mapping trebuie rafinată: EAN-ul și codul Dedeman sunt valori distincte.

## Dedeman: consolidare, recepția 5017602347

Cele două comenzi și avize din manual sunt confirmate:

| Comandă | CKEY | Aviz | Linii aviz | Cantitate | Net |
| --- | --- | --- | ---: | ---: | ---: |
| 4516680594 | CKEY-00060510 | AEX-AE-053186 | 29 | 849 | 3.292,39 |
| 4516694275 | CKEY-00060606 | AEX-AE-053184 | 5 | 45 | 1.112,40 |

Factura consolidată:

- `FINDOC=2164917`
- `FINCODE=FAEXD-PF-39304`
- seria 7123
- 34 linii
- 894 bucăți
- 4.404,79 RON net
- 5.099,67 RON cu TVA

Liniile facturii indică două documente sursă distincte:

- 29 linii provin din `AEX-AE-053186`;
- 5 linii provin din `AEX-AE-053184`.

Prin urmare, Soft1 poate păstra trasabilitatea fiecărei linii chiar dacă rezultatul este o singură factură. Numărul extern al recepției `5017602347` nu a fost identificat ca document Soft1 distinct în setul analizat; el aparține sursei EDInet/manualului.

## Dedeman: surplus și comanda `DOAR AVIZ`

### Comanda inițială 4516680754

- CKEY `CKEY-00060530`: 12 linii, 90 bucăți, 1.855,84 RON net.
- Aviz `AEX-AE-053266`: aceleași 12 linii și 90 bucăți.
- Factură `FAEXD-PF-39573`: conversie din aviz.

Produsul suplimentar nu apare în aceste 12 linii.

### Regularizarea efectuată în Soft1

Produsul este:

- `MTRL=44613`
- cod Soft1: `PF.00006`
- EAN: `5949060205985`
- cod Dedeman: `7050498`
- produs: `MIAU MIAU CU VITA IN SOS, PLIC 100G`

Înaintea comenzii de regularizare a fost creat direct:

1. `AEX-AE-053667`, seria 7111, fără CKEY sursă: 24 × 1,45 = 34,80 RON net / 38,63 RON cu TVA.
2. `FAEXD-PF-39575`, seria 7123, din acel aviz: 38,63 RON cu TVA.

Fișierul EDI `DEDEMAN_183647518.xml` conține:

- `BuyerOrderNumber=4516747570`;
- `PurchasingInfo=DOAR AVIZ!!!! - Marfa din CDLCernic Valentin Codrin`;
- `BuyerItemID=7050498`;
- 24 bucăți × 1,29 = 30,96 RON net.

Contrar regulii dorite din manual, scannerul a procesat fișierul normal:

1. `CCCSFTPXML=7981`, status `SENT`.
2. `CKEY-00061000`, seria 7012.
3. `AEX-AE-053708`, seria 7111, din CKEY.
4. `FAEXD-PF-39839`, seria 7123: 30,96 RON net / 34,37 RON cu TVA.

Ulterior a fost creat:

- `RFVQ-FC-14935`, seria 7531, retur al facturii vechi `FAEXD-PF-39575`;
- 24 × 1,45 = 34,80 RON net / 38,63 RON cu TVA;
- comentariu: `Comanda receptionata sub numarul:4516747570`.

### Concluzie pentru surplus

Fluxul real observat este:

`aviz direct 7111 -> factură veche 7123 -> comandă DOAR AVIZ integrată ca 7012 -> aviz nou 7111 -> factură nouă 7123 -> retur factură veche 7531`

Manualul propune în schimb:

`comanda DOAR AVIZ rămâne numai în Retailers -> aviz direct 7111 -> factură 7123`

Trebuie confirmat cu beneficiarul care comportament devine regula automatizată. Implementarea nu trebuie să presupună că practica istorică este automat regula dorită.

> **Nuanță recuperată din DOCX-ul original la 2026-07-27.** Formularea beneficiarului este „Comenzile cu acest tip de comentariu NU se integrează **(deocamdată)** în Soft1 ca și comenzi normale". Regula este așadar declarată explicit ca provizorie, nu ca decizie finală. În consecință fluxul observat în producție nu este o încălcare a unei reguli stabilite, ci un caz în care decizia nu a fost încă luată. De remarcat și că rezultatul final al fluxului real este corect din punct de vedere valoric și de serie (aviz 7111 → factură 7123, 30,96 RON); diferă doar pașii intermediari și necesitatea stornului 7531.

## Mapping-urile active ale comenzilor

Pentru ambele document mappings active, linia de produs folosește `BuyerItemID`:

- Dedeman: `select mtrl from CCCS1DXTRDRMTRL where trdr=11654 and code='{value}'`;
- Auchan: `select mtrl from CCCS1DXTRDRMTRL where trdr=13248 and code='{value}'`.

Consecințe:

- parserul comenzilor actuale folosește codul la client, nu GTIN/EAN;
- un viitor parser RECADV trebuie să determine ce identificator retransmite efectiv fiecare client;
- dacă RECADV Dedeman transmite numai EAN, rezolvarea corectă este EAN -> `MTRL` prin nomenclator, apoi validarea existenței aceluiași `MTRL` pentru `TRDR=11654` în `CCCS1DXTRDRMTRL`; nu comparația directă EAN = `CCCS1DXTRDRMTRL.CODE`.

> **Rezolvat la 2026-07-27.** Specificația `RECADV ... VERSION 4.0 - EDInet XML` a Infinite arată că `BuyerItemID` este **M** (obligatoriu), iar `GTIN` este **D** (opțional). Prin urmare RECADV retransmite codul la client pentru ambii retaileri, iar ramura alternativă „numai EAN" nu este necesară ca flux principal. Regula de implementare devine comună: `BuyerItemID -> CCCS1DXTRDRMTRL.CODE` pentru `TRDR` corespunzător, cu `GTIN` folosit doar ca verificare secundară când este prezent. Ramura EAN rămâne relevantă doar pentru RETANN, unde câmpul `EAN` este opțional și `BuyerItemID` este tot obligatoriu.

### Cât de riscant ar fi fallback-ul pe EAN (măsurat)

S-au extras toate perechile distincte `BuyerItemID`/`GTIN` din comenzile Auchan stocate în `CCCSFTPXML` între 2026-04-01 și 2026-07-27 și s-au rezolvat ambele căi de matching:

| Rezultat | Perechi |
| --- | ---: |
| Total | 119 |
| `BuyerItemID` negăsit în `CCCS1DXTRDRMTRL` | **0** |
| `GTIN` inexistent în `MTRL.CODE1` | 1 |
| `GTIN` și `BuyerItemID` rezolvă la `MTRL` diferite | **10** |
| Concordanță | 108 |

Cele 11 eșecuri ale EAN-ului au două cauze independente:

- **la client:** Auchan trimite EAN-ul unei variante înrudite (`424337` cu EAN-ul variantei ROZ în loc de MOV, `423804` cu EAN-ul variantei VERDE în loc de TURCOAZ, `423807` cu EAN-ul variantei PINK în loc de WHITE, plus `423802` și `341308`);
- **la noi:** `MTRL.CODE1` nu este unic — există **167 de EAN-uri duplicate** în `MTRL` pentru `COMPANY=50`, deci căutarea după EAN returnează arbitrar un articol frate chiar când clientul trimite EAN-ul corect (`623006`, `570102`, `245362`, `245363`, `525652`).

Concluzie: fallback-ul pe EAN nu este acceptabil nici măcar ca plasă de siguranță; ar mapa greșit ~9% dintre linii. `GTIN` se loghează doar ca avertisment de calitate a datelor.

### Calitatea tabelei de mapping

| Retailer | Rânduri | Coduri distincte | Coduri ambigue |
| --- | ---: | ---: | ---: |
| Auchan `13248` | 749 | 749 | **0** |
| Dedeman `11654` | 466 | 465 | **1** |

Singura coliziune: `CODE=7050535` la Dedeman este mapat simultan la `MTRL 34594` (`SET JUC. PISICA VARIETY`) și `MTRL 34294` (`JUC. HL14 MINGE CU PENE`), ambele active. Liniile cu acest cod trebuie oprite pentru validare manuală până la corectarea nomenclatorului.

`CCCS1DXTRDRMTRL` nu are coloană `COMPANY`; cheia efectivă este `(TRDR, CODE)`, iar tabela acoperă 22 de retaileri.

## Reguli confirmate pentru implementare

1. Reconcilierea trebuie făcută la nivel de linie și trebuie păstrate `FINDOCS/MTRLINESS` către documentul sursă.
2. Lipsa produce două ramuri din același aviz: factura cantității acceptate și 9221 pentru diferență.
3. Consolidarea poate converti linii din mai multe avize într-o singură factură fără pierderea trasabilității.
4. Valorile de linie sunt nete; `FINDOC.SUMAMNT` include TVA. Comparațiile trebuie să folosească aceeași bază valorică.
5. Paleții apar în `FINDOC.COMMENTS` și nu în liniile facturate ale exemplelor verificate.
6. Seria 7531 trebuie tratată ca retur de factură și nu confundată cu documentul RECADV.
7. Câmpurile de antet `FINDOC.CCCOrderId`, `CCCDispatcheId` și `CCCBillingReferenceId` sunt NULL în toate documentele verificate — nu sunt mecanismul de legătură. `FINDOC.CCCORDERDOC` conține o referință internă (`SOGRP 032628 / SO 105772`), nu numărul comenzii EDI.
8. Numărul de aviz retransmis de client (`53184/53186`) este `FINCODE`-ul nostru fără prefixul seriei și fără zerourile din față; căutarea inversă trebuie să facă zero-padding la 6 cifre. Numerele de comandă Auchan sosesc zero-pădate pe 8 caractere (`01436603`).
9. Valorile 9221 sunt stocate **pozitiv** în `FINDOC.NETAMNT`/`SUMAMNT`; semnul negativ este convenție de prezentare a seriei. Reconcilierea trebuie să scadă explicit.
10. **Numărul comenzii EDI se află în `FINDOC.NUM04`** și se propagă prin conversie pe tot lanțul CKEY → aviz → factură → retur. Vezi măsurătorile de mai jos.
11. **`MTRLINES.FINDOCL` este obligatoriu pe 9221 și 7531** și este editabil, spre deosebire de `FINDOCS`. Vezi analiza de mai jos.

### `MTRLINES.FINDOCL` — natura câmpului și măsurători

`FINDOCS` răspunde la „din ce document a apărut linia" (proveniță, scrisă de conversie, read-only). `FINDOCL` răspunde la „ce document anulează linia" (țintă de storno, editabilă). Sunt roluri diferite, chiar dacă pe 9221 coincid aproape mereu.

Regula este impusă în `S1/JS/SALDOC_EF.js`, `ON_POST`: pe seriile 9221 și 7531 linia fără `FINDOCL` este respinsă, iar cantitatea este plafonată la `sum(qty1)` din `MTRTRN` pentru documentul țintă și produsul respectiv.

Linii din 2026, `COMPANY=50`:

| Serie | Linii | fără `FINDOCL` | cu `FINDOCS` | `FINDOCL` = `FINDOCS` |
| --- | ---: | ---: | ---: | ---: |
| 9221 | 940 | **0** | 940 (100%) | 932 (99,1%) |
| 7531 | 5304 | 35 | 1554 (29%) | rar |

Distribuția țintelor `FINDOCL`, tot pe 2026:

| Document | Țintă | Linii | fără `FINDOCS` |
| --- | --- | ---: | ---: |
| 7531 | aviz 7111 | 2370 | 2369 |
| 7531 | factură 7033 | 1551 | 305 |
| 7531 | factură 7031 | 1348 | 1041 |
| 9221 | aviz 7111 | 940 | 0 |

Concluzii:

- **9221 vine întotdeauna din conversie** și țintește mereu un aviz 7111; `FINDOCL` este acolo un duplicat scris manual al legăturii read-only `FINDOCS`.
- **7531 este majoritar creat direct**, fără conversie — 71% din linii nu au `FINDOCS` pe ansamblul seriei (toți clienții). Pe Auchan și Dedeman proporția este practic totală: **1.737 din 1.738 de linii** din 2026 nu au `FINDOCS`. Acolo `FINDOCL` este singura legătură către documentul stornat.
- `MTRLINESL` este opțional (764/940 pe 9221) și nu este folosit de validare.
- **Plafonul de cantitate nu este cumulativ.** Nu scade retururile anterioare, deci același aviz poate fi returnat de mai multe ori integral. În producție: **78 de cazuri** de supraretur, 17 după 2025-01-01, cel mai recent 2026-06-30 (ex. `AEX-AE-028769` / `MTRL 28072`: livrat 6, returnat 18 în trei documente). Automatizarea trebuie să facă propria verificare cumulativă.

### `FINDOC.NUM04` — acoperire măsurată (2026-05-01 → 2026-07-27)

Seriile 7012/7111/7122/7123/9221, TRDR 11654 + 13248:

| Retailer | Avize 7111 din conversie | cu `NUM04` | Avize create direct | cu `NUM04` |
| --- | ---: | ---: | ---: | ---: |
| Dedeman 11654 | 604 | 604 | 3 | 3 |
| Auchan 13248 | 156 | 156 | 101 | **0** |

Corelația este perfectă: orice document provenit din conversie are `NUM04` populat, iar cele 101 avize Auchan fără `NUM04` nu au nicio linie cu `FINDOCS>0`, deci nu provin dintr-o comandă EDI.

Propagarea pe lanț, verificată pe exemplele din acest document:

| `NUM04` | CKEY 7012 | Aviz 7111 | Factură | Retur 9221 |
| --- | --- | --- | --- | --- |
| `1436603` | 2173392 | 2174988 | 2177841 (7122) | 2177842 |
| `4516724271` | 2169287 | 2170208 | 2182239 (7123) | 2182240 |
| `4516747570` | 2174409 | 2174893 | 2181528 (7123) | — |
| `4516694275` | 2162828 | 2163604 | 2164917 (7123) | — |
| `4516680594` | 2160845 | 2163608 | 2164917 (7123) | — |

Ultimele două rânduri arată limita: factura consolidată 2164917 provine din ambele comenzi, dar antetul are `NUM04 = 4516694275`. Pe 800 de facturi analizate, 36 (4,5%) consolidează 2–3 comenzi și pierd astfel restul numerelor din antet. Un singur caz are `NUM04` care nu corespunde niciunei comenzi de pe linii.

Alte observații: `NUM04` este `float`, deci nu poate păstra zerouri semnificative sau numere alfanumerice; valoarea stocată este deja normalizată (`1436603`, nu `01436603`) — dar, cum arată secțiunea următoare, normalizarea este un **efect secundar al tipului `float`**, nu o decizie de cod.

## Unde atinge analiza codul existent (2026-07-27)

### Maparea produselor este deja pe `BuyerItemID`, și este configurată în bază

Regula de matching nu e în cod, ci în tabela `CCCXMLS1MAPPINGS`, citită de [order-builder.js](src/edi/order-builder.js). Configurația activă pentru ambii retaileri:

| Retailer | `S1FIELD1` | `XMLNODE` | `SQL` |
| --- | --- | --- | --- |
| Dedeman 11654 | `ITELINES.MTRL` | `Order/OrderDetail/Item/BuyerItemID` | `select mtrl from CCCS1DXTRDRMTRL where trdr=11654 and code='{value}'` |
| Auchan 13248 | `ITELINES.MTRL` | `Order/OrderDetail/Item/BuyerItemID` | `select mtrl from CCCS1DXTRDRMTRL where trdr=13248 and code='{value}'` |
| ambii | `SALDOC.NUM04` | `Order/OrderHeader/BuyerOrderNumber` | — (fără transformare) |
| ambii | `SALDOC.TRDBRANCH` | `Order/OrderParty/ShipToParty/GLN` | `select trdbranch from trdbranch where trdr=... AND cccs1dxgln='{value}'` |

Două consecințe:

1. **Recomandarea „doar `BuyerItemID`" este deja realitatea implementată.** Nu e o schimbare de făcut, ci o constrângere de păstrat: nu se adaugă fallback pe EAN.
2. **`NUM04` nu are `SQL` de transformare.** Valoarea zero-pădată `01436603` ajunge nemodificată la Soft1, iar normalizarea la `1436603` se produce pentru că `FINDOC.NUM04` este `float`. Un număr de comandă alfanumeric ar eșua aici, nu ar fi trunchiat elegant.

### Coliziunile de cod se rezolvă tăcut

`runMappingSql` din [JSRetailers.js](S1/JS/AJS/JSRetailers.js) execută `X.SQL`, care returnează **doar primul rând**, fără `ORDER BY`. Un cod mapat la două articole nu produce eroare — produce o alegere arbitrară.

Există trei astfel de coliziuni în `CCCS1DXTRDRMTRL`:

| Retailer | `CODE` | MTRL |
| --- | --- | --- |
| Carrefour 11322 | `112` | 28055, 36445 |
| Dedeman 11654 | `7050535` | 34294, 34594 |
| Cora 13249 | `334` | 37864, 38739 |

Cazul Dedeman nu este ipotetic: **24 de comenzi din `CCCSFTPXML` conțin deja codul `7050535`**. Astăzi interogarea returnează `34294` (`JUC. HL14 MINGE CU PENE`), care este și articolul viu — `34594` nu a mai fost vândut la Dedeman din 2024-08-28. Deci probabil nu s-a produs nicio eroare reală, dar corectitudinea ține de ordinea fizică a rândurilor, nu de o regulă.

Invers, **niciun `MTRL` nu are două coduri la același `TRDR`** (0 cazuri), deci join-urile `... ON A.mtrl=D.mtrl AND C.trdr=D.trdr` nu pot dubla linii.

### `exportXMLDedemanReturn()` — confirmarea rolului lui `FINDOCL`

Funcția nouă din [SALDOC_EF_27072026.js](S1/JS/SALDOC_EF_27072026.js) (comanda `20260511`, Dedeman + seria 7531) generează factura de retur în format EDInet v4.0. Este cea mai directă confirmare a analizei:

- `RetAnnNumber`, `RetAnnDate`, `DeliveryDate` și `DeliveryDocumentNumber` sunt **toate** derivate din `A.findocl`, iar mesajele de validare spun explicit „verificati FINDOCL". `FINDOCL` este deci ancora semantică a documentului de retur, exact cum arată măsurătorile.
- Toate valorile sunt înmulțite cu `(-1)` la export, ceea ce confirmă că în baza de date sunt stocate pozitiv.
- `BuyerOrderNumber` vine din `SALDOC.NUM04` și este validat ca obligatoriu.

Două observații de urmărit:

- `RefInvoiceNumber` / `RefInvoiceDate` se iau din primul `findocs` non-null al liniilor, **dar nu sunt validate**. Cum pe Auchan și Dedeman doar 1 linie 7531 din 1.738 are `FINDOCS`, tag-urile vor fi emise goale aproape întotdeauna, fără avertisment.
- `RetAnnNumber` și `DeliveryDocumentNumber` primesc **aceeași valoare** (`fincode` al lui `FINDOCL`). **Clarificat la 2026-07-28:** fișierele RETANN pe care le *primim* nu conțin niciunul dintre cele două câmpuri (0 din 5), deci nu există dovadă reciprocă despre cum ar trebui completate. Punerea codului de aviz în `DeliveryDocumentNumber` este consistentă cu manualul de retururi, care definește avizul-sursă ca ancoră; refolosirea aceleiași valori pentru `RetAnnNumber` rămâne o simplificare, pentru că numărul avizului de retur este, conform manualului, alt număr.

### Alte două lucruri observate în trecere

- `EXECCOMMAND` comanda `20260121` setează `SERIES.SOISCONV = false` pe seria 9221 și salvează valoarea inițială în `originalSoisconv`, dar **nu există nicăieri cod de restaurare**. Relevant pentru întrebarea deschisă despre conversie.
- În `ON_AFTERPOST`, update-ul de `CCCUNITPACK` concatenează fără spații: `"...SET CCCUNITPACK=" + up + "WHERE MTRL=" + ... + "AND FINDOC=" + vID`, ceea ce produce SQL invalid (`CCCUNITPACK=12WHERE MTRL=34294AND FINDOC=...`). Ramura se execută des (2762 rânduri din `CCCS1DXTRDRMTRL` au `UnitPack > 0`, din care 619 Auchan și 237 Dedeman), dar `CCCUNITPACK` este completat pe doar 2,3% din liniile Dedeman și 6,6% din cele Auchan — consistent cu ipoteza că update-ul eșuează, iar valorile prezente vin din alte căi.
- [EFIntegrareRetailers.js](S1/JS/EFIntegrareRetailers.js) conține o copie mai veche a acelorași handlere (`ON_POST`, validarea `FINDOCL`, `exportXMLDedeman`). Orice regulă schimbată trebuie verificată în ambele fișiere.

## Decizii încă necesare

- Comenzile Dedeman cu `PurchasingInfo` de tip `DOAR AVIZ` trebuie blocate înainte de CKEY, conform manualului, sau trebuie reprodus fluxul istoric observat? Manualul marchează regula ca provizorie „(deocamdată)", deci decizia este deschisă, nu o corecție a unei abateri.
- **Cum se declanșează din cod conversia care creează `FINDOCS`/`MTRLINESS`?** `getTableFields` pe `SALDOC` confirmă că ambele câmpuri sunt `readOnly` atât în antet cât și în `ITELINES`, deci nu pot fi scrise prin `setData`. Trebuie identificat jobul de conversie folosit manual azi. Pentru retururi problema este mai mică: `FINDOCL` este editabil și obligatoriu, deci acoperă legătura.
- **Cum se dezambiguizează codul Dedeman `7050535`**, mapat la două articole active?
- ~~Pentru RECADV Dedeman, XML-ul transmite EAN, `BuyerItemID`, ambele sau alt identificator?~~ **Rezolvat 2026-07-27:** specificația v4.0 impune `BuyerItemID` obligatoriu și `GTIN` opțional. **Confirmat pe corpusul real la 2026-07-28:** `GTIN` este populat pe toate cele 1.524 de linii, dar **nu poate fi folosit ca cheie de potrivire** — pe 42 de linii nu coincide cu `MTRL.CODE1`. Rămâne doar avertisment de calitate a datelor.
- Cine și când creează returul 7531 pentru surplus: automatizarea Retailers sau un operator Soft1?
- Cum se leagă identificatorul notei EDInet de documentele Soft1 pentru audit și idempotency? Candidatul natural este `RecadvHeader/DocumentNumber`, dar nu a fost identificat ca document Soft1 distinct în setul analizat. Pentru comandă legătura există deja prin `NUM04`.
- ~~Unde apare PV-ul de neconformitate în XML?~~ **Infirmat la 2026-07-28.** Ipoteza că PV-urile sosesc ca RETANN este greșită: pe toate cele 106 fișiere analizate (101 RECADV + 5 RETANN) nu există niciun număr de PV, iar `ReasonForReturnDescription` este gol pe toate cele 1.524 de linii RECADV. Fișierele RETANN nu au niciun câmp de motiv. Rămâne deschis **pe ce canal ajung PV-urile** — posibil deloc prin EDI.

### RETANN (adăugate la 2026-07-28)

Detalii și dovezi în `Manual_flux_retur_RETANN_Auchan_Dedeman.md`.

- **De unde se ia `Numarul de ordine de retur`?** Manualul îl cere în `Comanda` (= `FINDOC.NUM04`), iar `exportXMLDedemanReturn()` îl validează ca obligatoriu, dar payload-ul RETANN nu îl conține — poartă doar `DocumentNumber`, adică numărul avizului de retur. Este singurul blocaj real al automatizării retururilor.
- **Care este regula reală de alegere a avizului-sursă pentru preț?** Nivelul de client este dovedit; „ultimul aviz către acea filială" este infirmat pe toate cele 3 linii verificate. Contează *care* aviz este referențiat, sau doar treapta de preț?
- **Confirmat că nu se implementează:** plafonul de disponibilitate pe avizul-sursă din manual. Este încălcat pe 127 din 473 de linii de aviz (27%) referite de retururile din 2026.
