# Integrare facturare EDI Auchan și Dedeman

> Specificație tehnică extrasă la 2026-07-27 din `Manual_integrare_facturare_edi_Auchan_Dedeman.docx` cu MCP `python-executor`. Documentul Word nu conține imagini, atașamente sau obiecte încorporate.
>
> **Reverificat la 2026-07-27** prin recitirea integrală a DOCX-ului (90 de blocuri, inclusiv tabelele). Prima extragere pierduse mai multe elemente de conținut, reintroduse mai jos: secțiunea de aplicabilitate, definițiile conceptelor, semantica coloanelor `CCCS1DXTRDRMTRL`, statutul PV-ului ca document separat, exemplele concrete de nepotrivire EAN la Auchan, cota de TVA, datele documentelor și nuanța „deocamdată" din regula `Doar aviz`.
>
> **Actualizat la 2026-07-28** după preluarea și analiza tuturor celor 101 fișiere RECADV și 5 fișiere RETANN reale de pe FTP. Măsurătoarea a infirmat mai multe presupuneri luate din specificație (liniile RECADV nu conțin numărul comenzii; un fișier nu conține mai multe documente; RETANN nu conține nicio referință documentară, iar schema livrată diferă de v4.0) și a adăugat două reguli obligatorii (cumulare per aviz, oprire la `acceptat > expediat`). Vezi secțiunile „Formatul real, măsurat pe tot corpusul" și „RETANN: formatul real".

## Scop

Platforma Retailers trebuie să automatizeze facturarea pentru Dedeman și Auchan pornind de la:

- avizul de expediție emis în Soft1;
- nota de recepție / avizul de primire primit prin EDInet;
- eventualul PV de neconformitate;
- diferențele dintre cantitatea expediată și cantitatea acceptată.

Reconcilierea pentru facturare se face între avizul de expediție, avizul de retur și factura. Comanda CKEY nu este baza valorică a reconcilierii, deoarece poate fi livrată parțial.

## Concepte și documente cheie

| Concept | Definiție |
| --- | --- |
| `Numar comanda` | Identificatorul comenzii, generat de client și transmis prin EDI. |
| Comandă Key Account (CKEY, seria 7012) | Documentul Soft1 care înregistrează comanda electronică. Poate avea valoare mai mare decât avizul dacă livrarea este parțială. |
| Aviz de expediție (seria 7111) | Emis de Pet Factory la livrare; conține toate liniile expediate fizic, plus eventualii paleți EURO menționați **doar în observații**. |
| Aviz de primire / Notă de recepție (EDInet) | Confirmarea clientului privind cantitățile primite și acceptate. Paleții returnabili nu apar în total și nu se facturează, nefiind avizați. |
| PV de neconformitate | **Document separat**, emis de client, atunci când există diferențe între cantitatea expediată și cea acceptată. Observat la Dedeman; **nu toți clienții îl emit**. |
| `Motiv de mutare` | Câmp **din PV-ul de neconformitate** care indică tipul diferenței: `Marfa lipsa` sau `Plus fata de aviz`. |
| `CCCS1DXTRDRMTRL` | Tabela Soft1 cu codurile de produs specifice fiecărui client. **Schemă reală (verificată 2026-07-27):** `MTRL` int, `MSODTYPE` smallint, `TRDR` int, `TSODTYPE` smallint, `LINENUM` int, `CODE` varchar(20), `NAME` varchar(128), `COMMENTS` varchar(512), `UnitPack` float. **Nu are coloană `COMPANY`** — filtrarea se face doar pe `TRDR`. `CODE` = codul produsului la clientul respectiv; `NAME` = denumirea produsului la client; `UnitPack` = numărul de bucăți pe unitatea de ambalare a clientului. |

Faptul că PV-ul este un document separat de nota de recepție este relevant pentru parsare: PV-ul nu se regăsește în RECADV, deci trebuie identificat un alt canal sau tip de mesaj pentru el.

### Calitatea mappării `CCCS1DXTRDRMTRL` (măsurat 2026-07-27)

| Retailer | Rânduri | Coduri distincte | Coduri ambigue | Produse cu mai multe coduri |
| --- | --- | --- | --- | --- |
| Auchan `TRDR=13248` | 749 | 749 | **0** | **0** |
| Dedeman `TRDR=11654` | 466 | 465 | **1** | 0 |

Tabela acoperă 22 de retaileri. Maparea Auchan este strict 1:1. La Dedeman există o singură coliziune reală, care trebuie tratată prin eșec controlat:

- `CODE = 7050535` → `MTRL 34594` `SET JUC. PISICA VARIETY` (`MF.03906`, EAN `5949060205435`) **și** `MTRL 34294` `JUC. HL14 MINGE CU PENE` (`MF.03677`, EAN `5949060205497`). Ambele articole sunt active.

## Aplicabilitate

Clienți acoperiți până acum: **Dedeman SRL** și **Auchan Romania S.A.**

Regulile de bază — identificarea lipsei/plusului și consolidarea — sunt **comune**. Diferă pe client doar seriile de facturare și unele comportamente, în principal tratarea surplusului. Regulile au fost validate pe cazuri reale (Dedeman: comenzile `4516724271`, `4516680754`, `4516747570`; Auchan: comanda `1436603`) și urmează să fie extinse și la ceilalți clienți cu EDI.

| Aspect | Dedeman | Auchan | Comun |
| --- | --- | --- | --- |
| Schemă XML RECADV | v4.0 | v4.0 (confirmat 2026-07-28) | da |
| Schemă XML RETANN | livrată diferit de spec. v4.0 | idem | da |
| Identificare articol | `BuyerItemID` | `BuyerItemID` | da |
| Detectare lipsă | expediat − acceptat | expediat − acceptat | da |
| Referință către aviz în RECADV | prezentă | **absentă** — doar numărul comenzii | **nu** |
| Referință către aviz în RETANN | **absentă** | **absentă** | da |
| Consolidare mai multe avize | confirmată | neobservată | mecanism comun |
| Serie factură | 7123 | 7122 | **nu** |
| Tratare surplus | `Doar aviz` → 7111 → 7123 | refuzat fizic, N/A | **nu** |

Consecință de implementare: un singur parser și un singur motor de reconciliere, cu o configurație per client pentru serie și politica de surplus.

## Documente și serii Soft1

| Serie | Abreviere | Rol | Client |
| --- | --- | --- | --- |
| 7012 | CKEY | Comandă Key Account primită electronic | Auchan/Dedeman |
| 7111 | AEX- | Aviz de expediție fizic | Toți clienții |
| 9221 | AAEX- | Aviz de retur/anulare pentru cantitatea lipsă | Toți clienții |
| 7121 | FAEX- | Factură conform avizului | Alți clienți |
| 7122 | FAEX1- | Factură conform avizului | Auchan |
| 7123 | FAEXD- | Factură conform avizului | Dedeman |

Seriile 7121, 7122 și 7123 folosesc contorul comun `Vanzari`.

## Identificarea produselor

### Dedeman

- Matching principal pe EAN.
- EAN-ul trebuie validat în `CCCS1DXTRDRMTRL`: `CODE` trebuie să corespundă produsului `MTRL` pentru `TRDR=Dedeman`.
- PV-ul de neconformitate indică explicit `Marfa lipsa` sau `Plus fata de aviz`.

> **Corecție 2026-07-27 (specificația RECADV v4.0).** Formularea „matching pe EAN" este descriere de business, nu de câmp XML. În RECADV `GTIN` este **D** (opțional), iar `BuyerItemID` este **M** (obligatoriu). Coroborat cu `Analiza_exemplelor_in_Soft1.md` (EAN Dedeman `5949060224108` se află în `MTRL.CODE1`, iar codul de client este `7073512`), regula de implementare este identică pentru ambii clienți: `BuyerItemID -> CCCS1DXTRDRMTRL.CODE` pentru `TRDR` corespunzător. EAN/`GTIN` rămâne doar verificare secundară, când există.

### Auchan

- Matching pe codul la client/codul furnizor retransmis în nota de recepție, nu pe EAN.
- Codul se caută în `CCCS1DXTRDRMTRL.CODE` pentru produsul `MTRL` și `TRDR=Auchan`.
- EAN-ul nu este o sursă sigură: au fost observate produse cu EAN diferit între Soft1 și EDInet, dar cu același cod la client.
- Lipsurile se determină prin comparație directă între avizul Soft1 și nota de recepție; nu a fost observat un PV separat.

Produse la care nepotrivirea de EAN a fost observată concret:

- `MIAU MIAU ZGARDA PISICA FANCY`
- `MIAU MIAU LOPATICA LITIERA`
- `SP CUSCA TRANSPORT GULLIVER`

### Verificare în producție (2026-07-27)

Afirmația a fost testată pe comenzile Auchan reale din `CCCSFTPXML` (perioada 2026-04-01 → 2026-07-27), prin compararea perechilor `BuyerItemID` / `GTIN` din XML cu `CCCS1DXTRDRMTRL` și `MTRL.CODE1`.

| Rezultat | Perechi distincte |
| --- | --- |
| Total perechi `BuyerItemID`/`GTIN` | 119 |
| `BuyerItemID` negăsit în `CCCS1DXTRDRMTRL` | **0** |
| `GTIN` inexistent în `MTRL.CODE1` | 1 |
| `GTIN` și `BuyerItemID` duc la `MTRL` **diferite** | **10** |
| Concordanță | 108 |

`BuyerItemID` a avut **rată de eșec zero**; EAN-ul eșuează în 11 din 119 cazuri (9,2%). Formularea inițială „același cod la client, EAN diferit” era impreciă: există **două cauze independente**.

**Cauza A — Auchan trimite EAN-ul unei variante înrudite** (problemă la client). Codul este corect, EAN-ul aparține altui SKU din aceeași familie:

| `BuyerItemID` | `GTIN` trimis | Produs corect (după cod) | EAN real în Soft1 | Produs greșit (după EAN) |
| --- | --- | --- | --- | --- |
| `424337` | `5949060213782` | `MIAU MIAU ZGARDA PISICA FANCY MOV 32CM` (`MTRL 39062`) | `5949060213775` | `... FANCY ROZ 32CM` (`MTRL 39059`) |
| `423804` | `5949060220919` | `MIAU MIAU LOPATICA LITIERA TURCOAZ CU CAPAC` (`MTRL 44920`) | `5949060225068` | `... VERDE CU CAPAC` (`MTRL 41017`) |
| `423807` | `8003507970922` | `SP CUSCA TRANSPORT GULLIVER NR1 WHITE` (`MTRL 45334`) | `8003507979857` | `... NR. 1 PINK/ROSU` (`MTRL 39812`) |
| `423802` | `5949060220841` | `MIAU MIAU LITIERA VERDE CU LOPATICA` (`MTRL 46811`) | `5949060228304` | `... LITIERA VIOLET ...` (`MTRL 41007`) |
| `341308` | `8011391706930` | `SERVETELE IGIENICE MAXI RECORD CU LAVANDA` (`MTRL 39365`) | `8011391707234` | `SERVETELE ANTIBACTERIENE RECORD ...` (`MTRL 28055`) |
| `377270` | `5949060203127` | `4DOG COVORASE ABSORBANTE 60*60 10BUC` (`MTRL 28293`) | `5949060200539` | — (EAN inexistent în Soft1) |

**Cauza B — EAN duplicat în propriul nostru nomenclator.** Aici Auchan trimite EAN-ul **corect**, dar `MTRL.CODE1` nu este unic: există **167 de EAN-uri duplicate în `MTRL`** pentru `COMPANY=50`, deci căutarea după EAN returnează arbitrar unul dintre articolele frați.

| `BuyerItemID` | `GTIN` trimis | Produs corect (după cod) | Alt `MTRL` cu același EAN |
| --- | --- | --- | --- |
| `623006` | `5949060208115` | `4DOG CAINE CU VITA IN SOS, PLIC 100G` (`MTRL 44620`) | `MTRL 36446`, denumire identică |
| `570102` | `5949060207705` | `MIAU MIAU KITTEN, PLIC 100G` (`MTRL 44616`) | `MTRL 35119` `PLIC MIAU MIAU KITTEN 100G` |
| `245362` | `5949060205459` | `SET JUC. PISICA 4 BUCATI` (`MTRL 34587`) | `MTRL 34290` |
| `245363` | `5949060205558` | `SET JUC. PISICA SORICEI` (`MTRL 34590`) | `MTRL 34305` |
| `525652` | `5949060205510` | `SET JUC. PISICA SORICEI CU MINGI` (`MTRL 34591`) | `MTRL 34301` |

Exemplu de linie reală din `AUCHAN_183588216.xml` (comanda `01436603`):

```xml
<Item><GTIN>5949060213782</GTIN><BuyerItemNum>25</BuyerItemNum><BuyerItemID>424337</BuyerItemID>
  <QuantityOrdered>24.000</QuantityOrdered><UnitOfMeasure>PCE</UnitOfMeasure>
  <NumberInTradeUnit>24.00</NumberInTradeUnit>
  <ProductDescription>MIAU MIAU ZGARDA PISICA FANCY</ProductDescription>
  <UnitNetPrice>3.34</UnitNetPrice></Item>
```

Nepotrivirea este **sistematică, nu accidentală**: aceleași perechi apar identic în toate comenzile din 2026-07-01 până în 2026-07-24.

**Concluzie de implementare:** `BuyerItemID → CCCS1DXTRDRMTRL.CODE` este singura cheie de matching admisă, pentru ambii clienți. `GTIN` se poate loga ca avertisment atunci când diferă, dar nu trebuie folosit niciodată ca sursă de adevăr și nici ca fallback — un fallback pe EAN ar factura produsul greșit în ~9% dintre linii.

> Notă laterală: `ProductDescription` din XML este trunchiat la ~30 de caractere și elimină varianta de culoare (`MIAU MIAU ZGARDA PISICA FANCY` pentru două SKU-uri distincte), deci nici denumirea nu poate dezambiguiza.

> Notă: `BuyerOrderNumber` sosește zero-pădat pe 8 caractere (`01436603`), în timp ce documentația de business folosește forma fără zerouri (`1436603`). Normalizarea trebuie făcută explicit la parsare.

## Specificațiile XML EDInet v4.0

> Schemele complete, câmp cu câmp, se află în `documentatie/dedeman/Infinite_EDInet_DESADV_RECADV.md`, care este sursa canonică pentru DESADV v4.1, RECADV v4.0 și RETANN v4.0. Exemplul RETANN din specificație este disponibil local ca `documentatie/dedeman/RetAnn.xml`.

Specificațiile sunt emise pentru proiectul Dedeman, dar structura este unică per tip de document. Diferențele între clienți rămân la nivel de reguli de business (serie factură, tratarea surplusului), nu la nivel de schemă. Prin urmare se implementează **un singur parser per tip de document, plus configurație per client**.

Concluziile care afectează direct regulile de facturare din acest manual:

1. **Identificarea produsului este comună.** `BuyerItemID` este obligatoriu în RECADV și RETANN, iar `GTIN`/`EAN` este doar dependent. Matching-ul este `BuyerItemID -> CCCS1DXTRDRMTRL.CODE` pentru ambii clienți.
2. ~~**Liniile sunt autoritare, nu antetul.**~~ **Infirmat pe fișiere reale (2026-07-28).** `Item/BuyerOrderNumber` este **absent din toate cele 1.524 de linii** primite, deși specificația îl marchează obligatoriu. Antetul este deci **singura** referință către comandă și aviz. Trunchierea lui `RecadvHeader/DeliveryDocumentNumber` este reală, dar se rezolvă altfel — vezi secțiunea următoare.
3. **Cantitatea de referință pentru lipsă este `QuantityAccepted`.** Confirmat: `QuantityOrdered` este gol pe toate liniile Dedeman, iar `QuantityReturned` pe toate cele 1.524. Diferența se calculează exclusiv prin comparație cu liniile avizului 7111.
4. ~~**RETANN transmite valori negative** și leagă direct returul de avizul nostru prin `RetannRefDoc/DesadvParty/DocID`.~~ **Parțial infirmat (2026-07-28).** Valorile negative sunt confirmate, dar `RetannRefDoc` **lipsește complet** din toate cele 5 fișiere reale: nu există nici număr de aviz, nici număr de comandă. RETANN nu poate fi legat de un aviz — vezi secțiunea „RETANN: formatul real".
5. **Rutarea se face pe GLN/ILN**, nu pe numele fișierului: fișierele din `/recadv` și `/retann` au nume pur numerice, fără prefix `AUCHAN_`/`DEDEMAN_`. Rutarea trebuie să eșueze controlat dacă GLN-ul nu se rezolvă neechivoc. **Confirmat:** cei doi clienți se disting doar prin `BuyerParty/GLN`.
6. ~~**Un fișier RECADV poate conține mai multe documente**~~ **Neobservat.** `DocumentSummary/NumberOfDocuments` este `1` în toate cele 101 fișiere (și vine cu spații de umplere, deci trebuie trimuiat). Situația inversă este însă reală: **mai multe fișiere pot descrie același aviz**.

### Formatul real, măsurat pe tot corpusul (101 fișiere, 2026-07-28)

Pe 2026-07-28 au fost preluate **toate cele 101 fișiere** din `/recadv` (2026-07-20 … 2026-07-28,
1.524 de linii), cu salvare de siguranță în DigitalOcean înainte de orice parsare. Măsurătoarea de
mai jos înlocuiește presupunerile bazate exclusiv pe specificație.

**`RETR` pe `/recadv` NU consumă fișierele** — 101 înainte, 101 după, verificat de două ori. La fel și
pe `/retann` (5 înainte, 5 după), deși acolo există un subfolder `sent`. Atenție: pentru `/orders`
comportamentul rămâne cel vechi — fișierul se mută la citire.

#### Ambii clienți trimit RECADV, dar completează formatul diferit

| | Dedeman `5940475841003` | Auchan `5940475172008` |
| --- | --- | --- |
| Fișiere / linii | 78 / 1.304 | 23 / 220 |
| `SellerId` | mereu `0000003419` | variabil (`3837`, `5613`, `2219`) |
| `DeliveryDocumentNumber` | prezent 78/78 | **absent 0/23** |
| `QuantityOrdered` | mereu gol | **mereu completat** |
| `BuyerOrderNumber` | numărul comenzii Dedeman | 8 cifre, cu zerouri în față |

Auchan trimite deci același format v4.0, dar **fără nicio referință la aviz**: singura cheie
disponibilă este numărul comenzii. Un singur parser rămâne suficient, cu așteptări de câmp per client.

#### Câmpuri absente sau goale în toate cele 1.524 de linii

| Câmp | Stare reală |
| --- | --- |
| `Item/BuyerOrderNumber` | **absent complet**, deși specificația îl marchează obligatoriu |
| `Item/UnitNetPrice` | **absent complet** — prin RECADV nu sosește niciun preț |
| `QuantityReturned` | prezent, dar gol 1.524/1.524 |
| `ReasonForReturnDescription` | prezent, dar gol 1.524/1.524 |
| `ReasonForReturnCode` | completat doar pe 5 linii |
| `GoodsReceiptDate`, `BuyerOrderDate`, `DeliveryDocumentDate` | goale 101/101 |

Consecințe directe: lipsa **trebuie** calculată ca `expediat(7111) − QuantityAccepted`, iar valoarea
liniei trebuie luată din Soft1, nu din RECADV.

Stabile și conforme cu specificația: rădăcina `<Document>`, codarea UTF-8, `UnitOfMeassure` mereu
`BUC`, `NumberOfItems` corect în 101/101 fișiere, și nicio etichetă de linie în afara tabelului din
specificație.

#### `DeliveryDocumentNumber` are trei forme

- completă: `AEX-AE-053744`
- fără prefix și fără zerouri: `53986`
- **trunchiată la 16 caractere** când recepția consolidează mai multe avize: `AEX-AE-053657/AE`
  (7 fișiere)

Regula de căutare validată: potrivire pe **ultimele 6 cifre** ale `FINDOC.FINCODE`. Când șirul este
trunchiat, rezultatul trebuie **reunit cu căutarea după numărul comenzii** (care în antet poate fi o
listă separată prin virgulă), altfel al doilea aviz se pierde și apar diferențe imposibile.

#### Rezultatul reconcilierii pe tot corpusul

**101 din 101** documente au fost legate de avizul lor, iar **1.485 din 1.485 de linii de produs** au
fost identificate prin `BuyerItemID → CCCS1DXTRDRMTRL.CODE`. Zero eșecuri. `GTIN` a diferit de
`MTRL.CODE1` pe 42 de linii — confirmare suplimentară că EAN-ul nu poate fi cheie de matching.

Repartizarea modului de rezolvare: 71 după codul avizului, 7 după aviz **plus** comandă (cazurile
trunchiate), 23 doar după comandă (Auchan).

#### Două reguli noi, obligatorii

1. **Cantitățile se cumulează per aviz, înainte de calculul diferenței.** Patru recepții din corpus
   sunt confirmate prin mai multe fișiere RECADV. Exemplu `AEX-AE-053669`: un fișier raportează 16
   bucăți acceptate, altul 4, iar avizul are 20 — recepția este curată **doar după cumulare**.
   Procesarea fișier cu fișier ar genera două retururi 9221 pentru același eveniment fizic.
2. **`acceptat > expediat` este imposibil fizic și trebuie oprit.** Unele perechi de fișiere nu sunt
   livrări parțiale, ci **duplicate**: pentru `AEX-AE-053774` și `AEX-AE-053986` un document cu
   `DocumentNumber` care începe cu `5017…` și unul cu `4600…` descriu același aviz, același produs și
   aceeași cantitate, în aceeași zi. Cumulate, dau 12 acceptate față de 6 expediate. Ce înseamnă
   familiile de numere `4600…`, `2200…`, `5900…` și `1285…` rămâne de lămurit cu EDInet.

## RETANN: formatul real (5 fișiere, 2026-07-28)

Pe 2026-07-28 au fost preluate și **toate cele 5 fișiere din `/retann`** (2026-07-20 … 2026-07-24),
cu aceeași procedură de backup. `RETR` nu le-a consumat, deși folderul are subdirectorul `sent`.

RETANN este un **flux paralel, nu o continuare a RECADV**. Conținutul confirmă asta: cantități mici
de articole asortate, returnate direct din magazine — marfă nevândută sau expirată, nu corecții de
livrare.

| Fișier | Client | Locație retur | Linii | Cantitate |
| --- | --- | --- | --- | --- |
| `636912442` | Dedeman | Depozit 39 On-Line | 4 | −87 |
| `636912443` | Dedeman | Depozit 39 On-Line | 2 | −38 |
| `637393663` | **Auchan** | Pitești Găvana 043 | 7 | −371 |
| `637809502` | Dedeman | Magazin 71 Bistrița | 1 | −3 |
| `637825192` | Dedeman | Magazin 95 Brașov 2 | 1 | −5 |

### Nu există nicio referință documentară

| Câmp din specificația v4.0 | Prezent în fișierele reale |
| --- | --- |
| `RetannRefDoc` (antet și linie) | **0/5** |
| `OrderAtBuyerParty/DocID` — nr. comandă | **0/5** |
| `DesadvParty/DocID` — nr. aviz | **0/5** |
| `UnitNetPrice`, `MonetaryNetValue` | **0/5** |
| `QuantityOrdered` | 0/5 |
| `OriginalItemNumber` | 0/5 |

**Consecință: RETANN nu poate fi legat de un aviz 7111 și nici de un RECADV.** Nu e o limitare de
implementare, ci absența datelor din sursă. Chiar dacă ar exista, legătura ar fi greșită conceptual:
marfa expirată provine dintr-un cumul de livrări vechi de luni, iar returul este o operațiune
comercială nouă, nu corecția unei livrări.

**Regulile din fluxul RECADV nu se aplică la RETANN** — nici cumularea per aviz, nici oprirea la
`acceptat > expediat`. Ancorarea corectă este `client + filială + produs`.

### Schema livrată diferă de specificație

| | Specificația v4.0 | Fișierele reale |
| --- | --- | --- |
| Rădăcină | `<Retann>` | `<Document><Retann>` (ca la RECADV) |
| Identificator părți | `ILN` | `GLN` |
| Antet | `RetannNumber` / `IssueDate` | `DocumentNumber` / `DocumentIssueDate` |
| Unitate de măsură | `UnitOfMeassure` | **`UnitOfMeasure`** — un singur `s`, spre deosebire de RECADV |
| Adrese | grupate în `AddressDetails` | câmpuri plate |

Cele 29 de etichete sunt identice în toate cele 5 fișiere, deci formatul livrat este stabil — doar
diferit de documentație. Parserul trebuie scris după realitate, nu după schemă.

### Ce se poate rezolva automat

| Element | Rezultat |
| --- | --- |
| Produse identificate prin `BuyerItemID → CCCS1DXTRDRMTRL.CODE` | **13 din 13** |
| Locații identificate prin `ShipToParty/GLN → TRDBRANCH.CCCS1DXGLN` | **4 din 4** |

**Atenție la rutarea filialei:** fiecare GLN de locație returnează **două** rânduri în `TRDBRANCH`, pe
`TRDR` diferite (ex. `5940475841065` → `TRDR 11654` și `15244`). Filiala trebuie căutată cu
`BuyerParty/GLN` **și** `ShipToParty/GLN` împreună; căutarea doar după al doilea este ambiguă.

### Alte observații pentru parser

- **Același produs poate apărea pe mai multe linii în același fișier.** În `637393663`, codul Auchan
  `17916` apare de două ori (−10 și −6). Agregarea per produs este necesară și în interiorul unui
  singur fișier.
- `SellerItemID` este gol pe toate liniile Auchan și pe unele Dedeman — nu poate fi cheie.
- Nu există `ReasonForReturnCode` sau echivalent: **motivul returului nu este transmis**.
- `NumberOfItems` este corect în 5/5, `NumberOfDocuments` este `1` în 5/5.


## Reguli de facturare

### Flux standard

Dacă pentru toate produsele cantitatea acceptată este egală cu cea expediată:

1. Se folosește avizul existent din seria 7111.
2. Se emite factura pe seria specifică clientului: 7122 pentru Auchan, 7123 pentru Dedeman, 7121 pentru ceilalți clienți facturați pe bază de aviz.
3. Paleții returnabili sunt excluși, nefiind avizați.

### Marfă lipsă

Pentru fiecare produs:

`cantitate_lipsă = cantitate_expediată - cantitate_acceptată`

Dacă diferența este pozitivă:

1. Se facturează numai cantitatea acceptată.
2. Se emite aviz de retur pe seria 9221 pentru cantitatea lipsă.
3. Factura finală rezultă din avizul 7111 minus returul 9221.
4. Seria facturii este 7122 pentru Auchan, 7123 pentru Dedeman și 7121 pentru ceilalți clienți.

> **Corecție de mecanism, verificată în producție la 2026-07-27.** Punctul 3 este corect ca **egalitate de valori totale**, dar greșit ca descriere a operației. Factura **nu** se emite pe cantitatea expediată pentru a fi apoi stornată. În realitate:
>
> - linia de factură 7122/7123 conține direct **cantitatea acceptată**;
> - linia de retur 9221 conține **doar diferența**;
> - **ambele** documente indică aceeași linie-sursă din avizul 7111, prin `MTRLINES.FINDOCS` + `MTRLINES.MTRLINESS`.
>
> Returul 9221 nu este o notă de credit împotriva facturii; este al doilea consumator al liniei de aviz, care închide restul nefacturat. Auchan `MTRL 40977`: aviz 417 buc → factură **416** buc (3.556,80) + retur **1** buc (8,55). Dedeman `MTRL 44622`: aviz 96 buc → factură **48** buc (47,04) + retur **48** buc (47,04).
>
> Consecință: reconcilierea nu trebuie să caute „factură integrală + storno”.

La Dedeman, diferența trebuie corelată cu PV-ul având `Motiv de mutare = Marfa lipsa`. **Invariant verificabil:** cantitatea neconformă din PV corespunde exact diferenței dintre cantitatea expediată (Soft1) și cea acceptată (EDInet) pentru acel produs. Orice abatere de la această egalitate trebuie tratată ca eroare și escaladată manual.

La Auchan, diferența rezultă direct din reconcilierea liniilor pe codul la client.

Documentele 9221 sunt prezentate ca retur (semn negativ) în rapoartele Soft1, dar în baza de date `FINDOC.NETAMNT` / `SUMAMNT` sunt stocate **pozitiv** (`AAEX-PET-3072` = 8,55 / 10,35). Semnul este dat de seria documentului, nu de valoare — reconcilierea trebuie să scadă explicit, nu să adune. Cota de TVA a liniilor din exemplele validate este 21% (8,55 → 1,80), dar antetul are TVA mixtă (produsele alimentare sunt la 11%), deci procentul nu trebuie presupus la nivel de document.

### Legăturile Soft1 între documente (verificat 2026-07-27)

Lanțul CKEY → aviz → factură/retur este materializat exclusiv prin perechea `FINDOCS` / `MTRLINESS` de pe **linii** (`MTRLINES`), nu prin câmpuri de antet:

| Câmp | Semnificație | Read-only |
| --- | --- | --- |
| `MTRLINES.FINDOCS` | `FINDOC`-ul documentului sursă din care a fost convertită linia | **da** |
| `MTRLINES.MTRLINESS` | `MTRLINES`-ul liniei sursă | **da** |
| `MTRLINES.FINDOCL` / `MTRLINESL` | „Document storno" — documentul stornat/returnat de linie, editabil (editor `VSELASSLINES1`) | nu |

Câmpurile de antet `FINDOC.CCCOrderId`, `CCCDispatcheId` și `CCCBillingReferenceId` sunt **NULL** pe toate documentele din exemplele validate, deci **nu** sunt folosite în acest flux. `FINDOC.CCCORDERDOC` conține o referință internă de tip `SOGRP 032628 / SO 105772`, **nu** numărul comenzii EDI.

Pentru că `FINDOCS`/`MTRLINESS` sunt marcate `readOnly` în metadatele obiectului `SALDOC` (confirmat prin `getTableFields`), ele nu pot fi setate direct prin `setData`; legătura trebuie creată prin mecanismul de conversie de documente al Soft1.

#### `FINDOCL` — legătura de storno, obligatorie pe 9221 și 7531

`FINDOCS` și `FINDOCL` **nu** sunt două variante ale aceluiași lucru:

- `FINDOCS` = **proveniență**. Se scrie automat de conversie, este read-only, răspunde la „din ce document a apărut linia asta".
- `FINDOCL` = **țintă de storno**. Se scrie de operator sau de cod, este editabilă, răspunde la „ce document anulează linia asta".

Regula de business este impusă în `S1/JS/SALDOC_EF.js`, în `ON_POST`: pentru seriile **9221 și 7531** linia fără `FINDOCL` este respinsă cu `Completati Document storno pentru articolul ...`. Imediat după, cantitatea este plafonată:

```javascript
var Mtr = 'select sum(qty1) QTY1 from mtrtrn where findoc=' + ITELINES.FINDOCL + ' and mtrl=' + ITELINES.MTRL
var Qty1 = X.SQL(Mtr, null)
if (ITELINES.QTY1 > Qty1) { X.EXCEPTION('Nu puteti returna mai mult decat cantitatea din documentul storno, ...') }
```

Comportamentul măsurat în producție (linii din 2026, `COMPANY=50`):

| Serie | Linii | fără `FINDOCL` | cu `FINDOCS` | `FINDOCL` = `FINDOCS` |
| --- | ---: | ---: | ---: | ---: |
| 9221 | 940 | **0** | 940 (100%) | 932 (99,1%) |
| 7531 | 5304 | 35 | 1554 (29%) | rar |

Cele două serii se comportă radical diferit:

- **9221 este întotdeauna produs prin conversie din aviz.** Toate cele 940 de linii au `FINDOCS`, `FINDOCL` țintește mereu o serie 7111, iar în 99,1% din cazuri `FINDOCL == FINDOCS`. Aici `FINDOCL` este practic un **duplicat scris manual al legăturii read-only**, necesar doar ca să treacă validarea.
- **7531 este majoritar document de sine stătător**: 71% dintre linii nu au deloc `FINDOCS`, iar când țintește un aviz 7111 (2370 de linii) `FINDOCS` lipsește în 2369 de cazuri. Pentru 7531, `FINDOCL` este **singura** legătură existentă.

De aici răspunsul practic la întrebarea „cum leg documentele dacă `FINDOCS` e read-only": pentru returul de storno **nu este nevoie de conversie** — `FINDOCL`/`MTRLINESL` sunt scriptabile și sunt exact mecanismul folosit azi.

`MTRLINESL` este **opțional**: doar 764 din 940 de linii 9221 îl au completat (81%), iar validarea nici nu îl folosește. Precizia la nivel de linie nu este impusă de ERP; automatizarea ar trebui totuși să îl completeze, pentru trasabilitate.

**Limită cunoscută a validării:** plafonul se calculează pe `MTRTRN` al documentului țintă, **fără să scadă returnările anterioare**. Două documente 9221 succesive pot returna fiecare cantitatea integrală a aceleiași linii de aviz. În producție există **78 de cazuri** de supraretur (aviz/produs cu total returnat mai mare decât cel livrat), dintre care 17 după 2025-01-01, cel mai recent 2026-06-30. Exemplu: `AEX-AE-028769`, `MTRL 28072`, livrat 6 bucăți, returnat 18 în trei documente. Automatizarea trebuie deci să facă **propria verificare cumulativă** înainte de a emite un 9221; nu se poate baza pe ERP.

#### `FINDOC.NUM04` — numărul comenzii EDI

Numărul comenzii de la retailer este păstrat în `FINDOC.NUM04` și se **propagă prin conversie** pe tot lanțul CKEY → aviz → factură → retur:

| Comandă EDI | CKEY 7012 | Aviz 7111 | Factură | Retur 9221 |
| --- | --- | --- | --- | --- |
| `1436603` (Auchan) | 2173392 | 2174988 | 2177841 (7122) | 2177842 |
| `4516724271` (Dedeman) | 2169287 | 2170208 | 2182239 (7123) | 2182240 |
| `4516747570` (Dedeman) | 2174409 | 2174893 | 2181528 (7123) | — |

Observații verificate pe intervalul 2026-05-01 → 2026-07-27, seriile 7012/7111/7122/7123/9221, ambii retaileri:

- **`NUM04` este populat în 100% din documentele provenite din conversie** (Dedeman 604/604 avize, Auchan 156/156). Cele 101 avize Auchan fără `NUM04` sunt create direct, fără linie sursă — deci non-EDI. Nu există niciun caz de document EDI cu `NUM04` gol.
- Valoarea este numărul comenzii **fără zerourile de umplere**: XML-ul Auchan trimite `01436603`, Soft1 stochează `1436603`. Atenție însă: maparea din `CCCXMLS1MAPPINGS` trimite valoarea **netransformată**, deci normalizarea este un efect secundar al tipului `float` al coloanei, nu o regulă de cod.
- `NUM04` este de tip `float`. Suportă numerele actuale (Dedeman `4516747570` ≪ 2^53), dar **nu poate stoca numere de comandă alfanumerice sau cu zerouri semnificative**. Dacă un retailer viitor trimite așa ceva, câmpul nu este utilizabil.
- **Atenție la consolidare:** din 800 de facturi analizate, 36 (4,5%) provin din 2–3 comenzi, iar `NUM04` de pe antet reține doar **una** dintre ele. Exemplu: `FAEXD-PF-39304` (FINDOC 2164917) consolidează comenzile `4516694275` și `4516680594`, dar antetul are `NUM04 = 4516694275`.

Consecință pentru implementare: `NUM04` este cheia de căutare rapidă comandă → documente și este de încredere pentru cazul cu o singură comandă (95,5%), dar **nu este suficient singur**. Trasabilitatea completă rămâne pe lanțul de linii `MTRLINES.FINDOCS`.

### Marfă în plus la Dedeman

Semnale:

- PV cu `Motiv de mutare = Plus fata de aviz`;
- produsul în cauză poate lipsi complet din liniile acceptate ale notei de recepție inițiale, fiind livrat integral peste comandă;
- ulterior apare o comandă nouă, fără referință la comanda inițială;
- comentariul comenzii conține `Doar aviz`, indiferent de majuscule și punctuație. Acesta este **singurul semnal sigur** de identificare automată.

Acțiune:

1. Comanda de regularizare nu se integrează în Soft1 ca o comandă normală.
2. Comanda se păstrează în Retailers pentru evidență și trasabilitate.
3. Se avizează direct în Soft1 pe seria 7111.
4. Se facturează pe seria 7123.

> **Nuanță din originalul DOCX:** formularea este „Comenzile cu acest tip de comentariu NU se integrează **(deocamdată)** în Soft1 ca și comenzi normale". Regula este declarată explicit ca provizorie de către beneficiar, ceea ce este relevant pentru contradicția cu fluxul istoric observat în producție (vezi `Analiza_exemplelor_in_Soft1.md`).

### Marfă în plus la Auchan

Nu se aplică. Auchan refuză fizic surplusul — marfa în plus este restituită la livrare și nu apare niciodată în nota de recepție ca surplus acceptat. Nota de recepție Auchan conține deci întotdeauna cantități mai mici sau egale cu cele comandate/expediate. Nu este necesară o comandă de regularizare.

### Consolidarea mai multor avize

Caz confirmat la Dedeman. O singură notă de recepție poate agrega mai multe avize/comenzi.

Semnale de identificare — **oricare dintre ele, singur, indică o consolidare**:

- antetul conține mai multe numere în `Numar aviz de insotire a marfii`, separate prin `/`
  (ex.: `53184/53186`);
- antetul conține mai multe numere de comandă, separate prin **virgulă**
  (ex.: `4516724252,4516728308,4516736116`).

> **Corecție 2026-07-28.** Al doilea semnal era formulat inițial ca „liniile conțin mai multe valori
> distincte pentru `Numar comanda`". Este imposibil în practică: `Item/BuyerOrderNumber` lipsește din
> toate cele 1.524 de linii reale. Consolidarea se vede **exclusiv în antet**, și pe ambele câmpuri.
>
> Atenție la lungime: `DeliveryDocumentNumber` este tăiat la **16 caractere**, deci când avizele sunt
> transmise în forma completă (`AEX-AE-053657/AE`) al doilea număr se pierde. În acest caz lista de
> comenzi din antet este singura sursă completă — cele două câmpuri trebuie folosite împreună, nu
> alternativ.

Acțiune:

1. Se grupează toate liniile notei de recepție, indiferent de comanda de origine.
2. Se avizează pe seria 7111 și se emite o singură factură pe seria 7123.
3. Fiecare comandă și fiecare aviz original rămân referințe interne pentru trasabilitate.
4. Nu se emite câte o factură separată pentru fiecare comandă.

Rămâne de stabilit regula principală atunci când lista avizelor și lista comenzilor se contrazic.

## Excluderi și validări obligatorii

- Paleții returnabili `EURO 120x80` nu se facturează. Ei pot apărea în observațiile avizului Soft1 și ca linie fără preț în nota de recepție EDInet.
- **Liniile de palet trebuie eliminate explicit din RECADV.** În fișierele reale ele sosesc ca `<Item>` obișnuit, cu `QuantityAccepted` completat, dar nu au `MTRL` și nu există în `CCCS1DXTRDRMTRL`. Coduri observate: `9200520` (`PALET RETURNABIL EURO 120x80`) și `9200521` (`PALET RETURNABIL NON-EURO 120x80`) — 39 de linii în cele 101 fișiere. Fără excludere, ele ar bloca întregul document prin eșec de identificare. Criteriu robust: `ProductDescription` care conține `PALET`.
- O livrare parțială nu este o eroare: valoarea CKEY poate depăși valoarea avizului 7111.
- Factura trebuie reconciliată strict cu documentele 7111 și 9221, nu cu valoarea CKEY.
- Regulile sunt validate doar pentru Dedeman și Auchan; nu se generalizează automat la alți retaileri.
- Automatizarea trebuie să eșueze controlat dacă o linie nu poate fi identificată neechivoc în `CCCS1DXTRDRMTRL`.
- **Automatizarea trebuie să eșueze controlat și când cantitatea acceptată depășește cantitatea expediată** pe aceeași pereche aviz/produs. Situația este imposibilă fizic și semnalează fie un fișier RECADV duplicat, fie o legare greșită la aviz.

## Exemple validate

> **Toate cele patru exemple au fost verificate integral în baza de date de producție `PetFactory`, `COMPANY=50`, la 2026-07-27, prin MCP `soft1-petfactory` (read-only).** Cifrele din manual s-au confirmat, cu excepțiile marcate explicit mai jos.

### Dedeman: lipsă

- Comandă: `4516724271` → `CCCSFTPXML 7844` / `DEDEMAN_183327349.xml` (2026-07-09)
- Produs: `CAT JOY PUI, PLIC 85G`, `MTRL 44622`, cod Soft1 `PF.00015`, EAN `5949060224108`, **cod Dedeman `7073512`**
- Expediat: 96 bucăți × 0,98 RON = 94,08 RON
- Acceptat: 48 bucăți
- PV: `8300225566`, 48 bucăți, `Marfa lipsa`
- Valoare netă diferență: 47,04 RON
- Flux Soft1 confirmat: `CKEY-00060819` (76 linii, 1.687 buc, 9.257,62 net) → `AEX-AE-053528` (57 linii, 1.338 buc, 7.447,62 net) → `FAEXD-PF-39867` (57 linii, **1.290** buc, 7.400,58 net) + `AAEX-PET-3078` (1 linie, **48** buc, 47,04 net)
- 1.338 − 48 = 1.290 ✓ și 7.447,62 − 47,04 = 7.400,58 ✓

### Auchan: lipsă

- Comandă: `1436603`, transmisă ca `<BuyerOrderNumber>01436603</BuyerOrderNumber>` → `CCCSFTPXML 7964` / `AUCHAN_183588216.xml` (2026-07-15)
- Produs: `ASTERNUT IGIENIC MIAU MIAU PORTOCALA 5KG`, `MTRL 40977`, cod Soft1 `MF.08360`, EAN `5949060219845`
- Cod client: `363360`, identic în avizul Soft1 și în nota de recepție
- Expediat: 417 bucăți × 8,55 RON = 3.565,35 RON
- Acceptat: 416 bucăți (3.556,80 RON)
- Diferență: 1 bucată, 8,55 RON net / 10,35 RON cu TVA (21%)
- Flux Soft1 confirmat: `CKEY-00060977` `FINDOC 2173392` (68.030,89 RON — livrare parțială) → `AEX-AE-053710` `FINDOC 2174988` (61.104,39 RON) → `FAEX1-PF-39742` `FINDOC 2177841` (61.094,05 RON) + `AAEX-PET-3072` `FINDOC 2177842` (10,35 RON)
- Verificat: 61.104,39 − 10,35 = 61.094,05 ✓. Factura și returul au fost emise în aceeași zi (2026-07-21) și au `FINDOCS = 2174988`, `MTRLINESS = 60` — aceeași linie de aviz.

### Dedeman: surplus regularizat

- Comandă inițială: `4516680754` → `CCCSFTPXML 7628` → `CKEY-00060530` `FINDOC 2160892` (12 linii, 90 buc, 1.855,84 net)
- Notă recepție: `5017615221` — 12 linii, 90 bucăți, 1.855,84 RON, identică cu comanda; **nu include** produsul `PLIC MIAU MIAU CU VITA IN SOS 100G`
- PV: `9500095574`, 24 bucăți din acel produs, `Plus fata de aviz`
- Comandă regularizare: `4516747570` (16.07.2026), același produs, 24 bucăți, 30,96 RON, fără referință la `4516680754`
- Comentariu: `DOAR AVIZ!!!! - Marfa din CDL...`
- Flux nominal (comanda inițială): `CKEY-00060530` → `AEX-AE-053266` (1.855,84) → `FAEXD-PF-39573` (1.855,84, 2026-07-15) ✓
- **Contrazicere confirmată în producție:** comanda de regularizare **a devenit CKEY**. `CCCSFTPXML 7981` / `DEDEMAN_183647518.xml` → `CKEY-00061000` `FINDOC 2174409` (1 linie, 24 buc, 30,96 net, 2026-07-16) → `AEX-AE-053708` `FINDOC 2174893` → `FAEXD-PF-39839` `FINDOC 2181528` (7123, 2026-07-24, 30,96 net).
- Rezultatul final este cel dorit (aviz 7111 → factură 7123, valoare corectă); diferă doar pasul intermediar. Regula „nu se integrează ca CKEY” este marcată „(deocamdată)” în specificația beneficiarului, deci decizia rămâne deschisă.

### Dedeman: consolidare

- Notă recepție: `5017602347` (03.07.2026)
- Avize de însoțire: `53184/53186` — confirmat: sunt codurile Soft1 `AEX-AE-053184` și `AEX-AE-053186`, transmise de client **fără prefixul seriei și fără zerourile din față, unite prin `/`**
- Comenzi: `4516680594` → `CKEY-00060510` `FINDOC 2160845` și `4516694275` → `CKEY-00060606` `FINDOC 2162828`
- Avize confirmate: `AEX-AE-053186` `FINDOC 2163608` (29 linii, 849 buc, **3.292,39** net) și `AEX-AE-053184` `FINDOC 2163604` (5 linii, 45 buc, **1.112,40** net)
- Total: 34 linii, 894 bucăți, **4.404,79** RON net ✓
- Rezultat: o singură factură Dedeman pe seria 7123.

## Implicații pentru implementare

1. RECADV nu este APERAK și nu trebuie stocat în `CCCAPERAK`.
2. Parserul RECADV trebuie să normalizeze cel puțin: identificatorul recepției, avizele referite, comenzile referite, clientul/GLN-ul, codurile produselor, EAN-urile, cantitățile acceptate și unitățile. **Valorile, PV-ul și motivul neconformității nu sosesc prin RECADV** — `UnitNetPrice` lipsește complet, iar `ReasonForReturnDescription` este gol pe toate liniile reale; valoarea liniei se ia din avizul Soft1.
3. Motorul de reconciliere trebuie să fie configurabil pe client pentru strategia de matching și seria facturii.
4. Comenzile Dedeman cu comentariu `Doar aviz` necesită o stare separată în Retailers și trebuie excluse din trimiterea normală către CKEY.
5. Consolidarea trebuie modelată la nivel de notă de recepție, cu legături multiple către comenzi și avize.
6. Crearea documentelor Soft1 trebuie să fie idempotentă și să păstreze toate referințele sursă.
7. **Matching-ul se face exclusiv pe `BuyerItemID`.** EAN-ul nu se folosește nici măcar ca fallback: 9,2% dintre liniile Auchan ar fi mapate greșit. Se loghează doar ca avertisment de calitate a datelor.
8. **Numărul de aviz din nota de recepție apare în trei forme:** completă (`AEX-AE-053744`), fără prefix și fără zerouri (`53986`), sau **trunchiată la 16 caractere** când sunt mai multe avize (`AEX-AE-053657/AE`). Căutarea trebuie să facă zero-padding la 6 cifre și să potrivească pe ultimele 6 cifre ale `FINDOC.FINCODE`. **Când șirul este trunchiat, rezultatul trebuie reunit obligatoriu cu căutarea după numărul comenzii**, altfel al doilea aviz se pierde și apar diferențe false. Pentru Auchan câmpul lipsește cu totul, deci comanda este singura cheie.
9. **Numerele de comandă sosesc zero-pădate** (`01436603` pentru `1436603`); normalizarea este obligatorie înainte de orice căutare, iar Soft1 stochează deja forma normalizată în `NUM04`.
10. **Legăturile între documente se creează prin conversie, nu prin scriere directă**, pentru că `FINDOCS`/`MTRLINESS` sunt read-only în obiectul `SALDOC`. Excepție: `FINDOCL`/`MTRLINESL` sunt editabile și pot fi scrise din cod.
11. **Factura poartă direct cantitatea acceptată**, iar 9221 doar diferența; nu se generează factură integrală urmată de storno.
12. **`FINDOC.NUM04` este cheia de căutare comandă EDI → documente Soft1.** Se propagă prin conversie pe tot lanțul și este populat în 100% din documentele EDI. Se folosește pentru lookup rapid, dar pe facturile consolidate reține o singură comandă, deci nu înlocuiește parcurgerea liniilor. La creare de documente noi, `NUM04` trebuie setat explicit cu numărul comenzii normalizat.
13. **Orice linie de 9221 sau 7531 trebuie să aibă `FINDOCL` setat**, altfel `ON_POST` din `SALDOC_EF.js` respinge salvarea. Pentru 9221 valoarea corectă este avizul 7111, adică același document ca `FINDOCS`. Se completează și `MTRLINESL`, deși ERP-ul nu îl impune.
14. **Verificarea cumulativă a cantității returnate cade în sarcina automatizării.** Plafonul din ERP compară doar cu cantitatea livrată, fără să scadă retururi anterioare; în producție există 78 de cazuri de supraretur. Înainte de a emite un 9221 trebuie însumate retururile deja existente pe aceeași pereche aviz/produs.
15. **Unitatea de procesare este avizul, nu fișierul.** Mai multe fișiere RECADV pot descrie același aviz (4 cazuri în corpusul de 101). Cantitățile acceptate trebuie însumate per `aviz + cod produs` **înainte** de calculul diferenței; altfel o singură recepție fizică ar produce două retururi. Consecință practică: procesarea nu poate fi complet stateless per fișier — trebuie să aștepte sau să recalculeze la sosirea unui fișier suplimentar pentru un aviz deja văzut.
16. **`acceptat > expediat` este o oprire dură, nu un avertisment.** Situația apare real în corpus și indică fișiere duplicate: același aviz, produs, cantitate și zi, dar `DocumentNumber` din familii diferite (`5017…` vs `4600…`). Deduplicarea nu se poate face pe `DocumentNumber` — trebuie făcută pe conținut (aviz + produs + cantitate + dată), iar cazurile detectate merg la verificare umană.
17. **RETANN se procesează pe alt lanț decât RECADV.** Nu are referință către aviz, deci nu intră în reconcilierea `expediat − acceptat` și nu se cumulează cu retururile 9221. Parserul este separat (schemă diferită, `UnitOfMeasure` cu un singur `s`), iar ancorarea se face la `client + filială + produs`.
18. **Filiala se rezolvă cu ambele GLN-uri, nu doar cu `ShipToParty`.** Fiecare GLN de locație apare pe două rânduri `TRDBRANCH`, sub `TRDR` diferite. Căutarea trebuie filtrată și pe `TRDR`-ul rezultat din `BuyerParty/GLN`, altfel rezultatul este ambiguu — iar regula de eșec controlat ar bloca inutil documente valide.

## Întrebări deschise

### Rezolvate la 2026-07-27 prin specificațiile Infinite v4.0 și prin verificare în producție

- ~~Care este structura XML exactă a fișierelor RECADV numerice din `/recadv/`?~~ Documentată în secțiunea „Specificațiile XML EDInet v4.0". Rămâne de validat pe un fișier real că versiunea livrată este tot v4.0.
- ~~Care câmp conține codul la client pentru Auchan și EAN-ul pentru Dedeman?~~ `BuyerItemID` (M) este codul la client pentru ambii; `GTIN`/`EAN` (D) este EAN-ul. Regula de matching devine comună.
- ~~În consolidări contradictorii, prevalează numerele de aviz din antet sau numerele de comandă de pe linii?~~ **Întrebarea nu se poate pune în practică.** Liniile nu conțin niciun număr de comandă (0 din 1.524). Singura sursă este antetul, iar cele două câmpuri ale lui se folosesc împreună: avizele când sunt complete, comenzile când șirul de avize este trunchiat la 16 caractere.
- ~~Ce legături Soft1 trebuie setate între 7111, returul 9221 și factura 7122/7123?~~ `MTRLINES.FINDOCS` + `MTRLINES.MTRLINESS`, pe linii, ambele documente indicând aceeași linie de aviz. Câmpurile de antet `CCCOrderId`/`CCCDispatcheId`/`CCCBillingReferenceId` sunt neutilizate. Vezi secțiunea „Legăturile Soft1 între documente".
- ~~Unde se regăsește numărul comenzii EDI pe documentele Soft1?~~ În `FINDOC.NUM04`, propagat prin conversie pe tot lanțul (indicat de beneficiar și verificat în producție la 2026-07-27). Vezi subsecțiunea „`FINDOC.NUM04` — numărul comenzii EDI".

### Rezolvate la 2026-07-28 pe corpusul complet de 101 fișiere RECADV reale

- ~~Trimite Auchan același format v4.0?~~ **Da.** 23 din cele 101 fișiere sunt Auchan (`5940475172008`), în același plic v4.0. Diferențele sunt de completare, nu de structură: Auchan **nu trimite `DeliveryDocumentNumber`** și **completează mereu `QuantityOrdered`**, exact invers decât Dedeman.
- ~~Cum se calculează lipsa dacă `QuantityOrdered` lipsește?~~ **Prin comparație cu avizul 7111, întotdeauna.** La Dedeman câmpul e gol pe toate liniile. La Auchan e completat, dar egal cu cantitatea acceptată, deci nu poate semnala nicio lipsă. Comparația cu Soft1 nu este un fallback, ci singura metodă.
- ~~Versiunea livrată este tot v4.0?~~ **Da pentru RECADV**, confirmat pe toate cele 101 fișiere: rădăcină `<Document>`, UTF-8, nicio etichetă în afara specificației. **Nu pentru RETANN** — schema livrată diferă substanțial de specificație (vezi „RETANN: formatul real").
- ~~Se leagă RETANN de RECADV sau de avizul 7111?~~ **Nu se poate și nu trebuie.** `RetannRefDoc` lipsește din toate cele 5 fișiere reale, deci nu există nicio referință documentară. RETANN este un flux paralel, ancorat la `client + filială + produs`.

### Încă deschise

- **Cum sunt reprezentate în XML PV-ul și `Motiv de mutare`?** **Confirmat că nu sosesc nici prin RECADV, nici prin RETANN.** În RECADV, `ReasonForReturnDescription` este gol pe toate cele 1.524 de linii, iar `ReasonForReturnCode` e completat doar pe 5. În RETANN nu există niciun câmp de motiv și niciun număr de document. Ipoteza că PV-urile ar sosi prin RETANN, formulată pe baza volumelor de pe FTP, este **infirmată**. Rămâne de aflat pe ce canal ajung — posibil deloc prin EDI.
- **Cum se valorizează returul RETANN?** Nici `UnitNetPrice`, nici `MonetaryNetValue` nu sosesc. Trebuie stabilit dacă se folosește prețul curent din contract sau prețul ultimei livrări către acea filială — iar fără referință către aviz, a doua variantă este o presupunere, nu o certitudine.
- **Ce serie Soft1 primește un retur RETANN?** Nu este 9221 (acela e legat de aviz prin `FINDOCL`). Trebuie confirmată seria și dacă documentul se creează fără document sursă.
- **Ce înseamnă familiile de prefixe din `DocumentNumber`?** În corpus apar `5017…` (73), `1285…` (8), `9774…` (5), `9737…`, `9767…`, `4600…`, `9734…`, `9736…`, `2200…`, `5900…`, `7900…`. În cel puțin două cazuri, un document `5017…` și unul `4600…` descriu **același eveniment fizic** — deci prefixul pare să codifice tipul documentului sau sistemul emitent. De lămurit cu EDInet înainte de a automatiza retururile.
- **De ce avizul Auchan `AEX-AE-053715` are 7.728 bucăți din codul `340171`, dar recepția confirmă doar 1.392?** Toate cele 23 de avize Auchan sunt emise către depozite (`901 Campus Auchan AMBIENT`, `51940 CAMPUS Deva CALAN`), nu către magazinul din `ShipToParty`. Ipoteză: un aviz către depozit acoperă mai multe magazine, iar fiecare confirmă doar partea lui. Dacă se confirmă, reconcilierea Auchan trebuie să aștepte toate confirmările înainte de a decide o lipsă.
- **Cum se declanșează din cod conversia care creează legătura `FINDOCS`/`MTRLINESS`?** Câmpurile sunt read-only, deci nu pot fi scrise prin `setData`. Trebuie identificat jobul/obiectul de conversie Soft1 folosit manual azi pentru 7111 → 7122/7123 și 7111 → 9221. **Parțial rezolvat:** pentru retur legătura obligatorie este `FINDOCL`, care este editabilă; întrebarea rămâne deschisă doar pentru factură, unde `FINDOCS` este singura legătură.
- **Cum se rezolvă codul Dedeman ambiguu `7050535`** (mapat la două articole active, `MTRL 34594` și `MTRL 34294`)? Până la corectarea nomenclatorului, liniile cu acest cod trebuie oprite pentru validare manuală. Același tip de coliziune există și la Carrefour (`112`) și Cora (`334`), iar codul actual (`X.SQL`, primul rând) alege tăcut una dintre variante.
- **Cine aprobă automatizarea înainte de emiterea documentelor și ce cazuri trebuie ținute pentru validare manuală?**
- **Regula `Doar aviz`** rămâne o decizie de business nerezolvată; vezi `Analiza_exemplelor_in_Soft1.md`. Comentariul apare pe ORDER, nu pe RECADV, deci este o regulă din fluxul de comenzi, separată de parserul RECADV.
