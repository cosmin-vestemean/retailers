# Flux retururi din magazine (RETANN) — Auchan și Dedeman

> Specificație extrasă la 2026-07-28 din `Manual_flux_retur_auchan_dedeman.docx` (Sorin Fliundra,
> 24.07.2026, 3 pagini) cu MCP `python-executor`, și **reconciliată integral cu producția** prin MCP
> `soft1-petfactory` (read-only, `PetFactory`, `COMPANY=50`).
>
> Documentul beneficiarului descrie un flux **separat** de cel din
> `Manual_integrare_facturare_edi_Auchan_Dedeman.md`: acolo se tratează diferențele constatate **la
> recepție** (lipsă/plus), aici marfa deja recepționată și returnată ulterior din magazine.
>
> **Cele două exemple ale manualului se reconciliază la bănuț în Soft1.** Trei dintre regulile lui
> sunt însă contrazise de datele din producția beneficiarului, iar regula centrală de disponibilitate
> este încălcată în 27% dintre cazurile reale. Corecțiile sunt marcate explicit mai jos și **nu
> trebuie implementate literal**.

## 1. Scop

Magazinele Auchan și Dedeman returnează marfă nevândută sau expirată, livrată și recepționată în
trecut. Returul apare în EDInet pe fluxul **RETANN** și se facturează separat, către filiala care l-a
emis.

Nu este o corecție de livrare: marfa provine dintr-un cumul de livrări vechi de luni, iar returul
este o operațiune comercială nouă. Regulile fluxului RECADV — cumulare per aviz, oprire la
`acceptat > expediat` — **nu se aplică aici**.

## 2. Concepte

| Concept | Definiție (formularea beneficiarului) | Sosește în fișierul XML? |
| --- | --- | --- |
| `Numar avize de retur` | Identificatorul intern Edinet al documentului RETANN | **da** — `RetannHeader/DocumentNumber` |
| `Numarul de ordine de retur` | Identificatorul returului la client; devine câmpul `Comanda` pe factura Soft1 | **NU** — vezi §7 |
| GLN Cumpărător | GLN-ul sediului central (Auchan Romania SA / Dedeman SRL) — **nu** se facturează pe el | da — `BuyerParty/GLN` |
| GLN `Transfer catre beneficiar` | GLN-ul filialei/magazinului care a emis returul — **pe acesta se facturează** | da — `ShipToParty/GLN` |
| `Codul produsului la comparator` | Codul produsului la client; transmis de **ambii** clienți pe acest flux | da — `BuyerItemID` |

Distincția dintre primele două rânduri este esențială și este făcută chiar de beneficiar: sunt două
numere diferite, iar noi îl primim doar pe primul.

## 3. Identificarea filialei

Regula beneficiarului: factura se emite pe filiala care a emis returul, identificată prin GLN-ul din
`Transfer catre beneficiar`, **niciodată** prin GLN-ul de la `Cumparator` (mereu sediul central). Pe
factura Soft1 acest GLN apare în câmpul `Contul`, iar `Nume / Adresă / Localitate livrare` trebuie să
corespundă filialei.

**Confirmat în producție.** Ambele exemple ale manualului au fost regăsite și verificate:

| | Auchan — retur `4497049` | Dedeman — retur `6100352505` |
| --- | --- | --- |
| GLN sediu central (`BuyerParty`) | `5940475172008` | `5940475841003` |
| GLN filială (`ShipToParty`) | `5940475172183` | `5949111999801` |
| Filială Soft1 rezolvată | `TRDBRANCH 1377` — `AUCHAN BRASOV VEST 036` | `TRDBRANCH 8350` — `MEDIAS 20` |
| Factura emisă | `RFVQ-FC-14864` / `FINDOC 2170614` | `RFVQ-FC-14867` / `FINDOC 2170620` |

> **Atenție la rezolvarea filialei.** Fiecare GLN de locație apare pe **două** rânduri în `TRDBRANCH`,
> sub `TRDR` diferite (ex. `5940475841065` → `TRDR 11654` și `15244`). Căutarea trebuie filtrată și pe
> `TRDR`-ul rezultat din `BuyerParty/GLN`; altfel este ambiguă, iar regula de eșec controlat ar bloca
> inutil documente valide.

## 4. Identificarea produselor

Regula beneficiarului: matching pe codul la client, pentru **ambii** clienți — spre deosebire de
fluxul de recepție, unde manualul de facturare descrie EAN pentru Dedeman și cod la client pentru
Auchan. Nu este nevoie de o regulă diferențiată.

**Confirmat, și coincide cu concluzia noastră independentă:** `BuyerItemID → CCCS1DXTRDRMTRL.CODE`,
scopat pe `TRDR`-ul clientului, a rezolvat **13 din 13** linii în cele 5 fișiere RETANN reale.
EAN-ul rămâne doar verificare secundară (în RECADV a diferit de `MTRL.CODE1` pe 42 de linii).

Liniile validate de beneficiar:

| Client | Cod la client | EAN | Cantitate | Preț folosit | Valoare netă |
| --- | --- | --- | ---: | ---: | ---: |
| Auchan | `616033` | `5949060207859` | −52 | 9,10 RON | −473,20 RON |
| Auchan | `616032` | `5949060207835` | −13 | 7,87 RON | −102,31 RON |
| Dedeman | `7066865` | `4025877415265` | −1 | 11,03 RON | −11,03 RON |

Toate trei se regăsesc identic pe facturile din producție (cantitate, preț, valoare).

## 5. Prețul — corectat față de manual

**Regula beneficiarului (§5 din DOCX):** RETANN nu conține preț; prețul se preia din *„ultimul aviz de
expediție emis către clientul/filiala respectivă, care conține produsul și cantitatea returnată"*.

Partea corectă și partea greșită:

| Afirmație | Verdict pe date reale |
| --- | --- |
| RETANN nu conține preț | **Corect.** `UnitNetPrice` și `MonetaryNetValue` lipsesc 0/5. |
| Prețul se copiază de pe o linie de aviz de expediție (7111) | **Corect.** Toate cele 3 linii verificate au `FINDOCL` către un 7111 care poartă exact acel preț. |
| Avizul-sursă este al **filialei** care returnează | **Greșit.** Niciuna dintre cele 3 linii nu indică un aviz către filiala returnatoare. |
| Este **ultimul** aviz | **Greșit.** Nici cel mai recent, nici cel cu `FINDOC` maxim. |

Ce arată concret cele trei linii verificate:

| Retur | Filiala care returnează | Aviz-sursă folosit efectiv |
| --- | --- | --- |
| Auchan `RFVQ-FC-14864`, linia 1 | Brașov Vest 036 | aviz către `Campus AMBIENT` (`TRDBRANCH 3438`) |
| Auchan `RFVQ-FC-14864`, linia 2 | Brașov Vest 036 | aviz către `CAMPUS Deva CALAN` (`TRDBRANCH 4545`) |
| Dedeman `RFVQ-FC-14867` | Medias 20 | aviz către `ALBA IULIA 66` (`TRDBRANCH 2964`) |

La Auchan potrivirea pe filială este **structural imposibilă**: livrăm exclusiv către campusuri și
depozite, niciodată direct în magazinul care emite returul.

Nici „ultimul aviz" nu se susține: pentru Dedeman existau **șase** avize din 2026-07-10 care purtau
produsul la 11,03 RON, iar cel ales nu era nici cel mai nou, nici cel cu `FINDOC` maxim; pentru
Auchan a fost folosit al doilea aviz ca vechime, deși cel mai recent avea cantitate suficientă.

> **Singurul element determinist este treapta de preț.** Prețul produsului Auchan tocmai urcase de la
> 7,28 la 9,10 RON, iar toate avizele candidate erau deja pe treapta nouă. Alegerea dintre candidații
> echivalenți pare arbitrară — ceea ce este consistent cu §6.

**Regulă de implementare propusă:** se caută, la nivel de **client (`TRDR`)**, liniile de aviz 7111
care conțin produsul la prețul curent și se referențiază oricare dintre ele. Nu se filtrează pe
filială și nu se impune „cel mai recent". Vezi §11 pentru întrebarea rămasă către beneficiar.

## 6. Împărțirea pe mai multe avize — regulă care NU trebuie implementată literal

**Regula beneficiarului (§6 din DOCX):** fiecare linie de factură de retur trebuie să refere avizul
din care se scade cantitatea, iar cantitatea de pe o linie *„nu poate depăși cantitatea disponibilă pe
avizul-sursă respectiv"*; dacă nu ajunge, se împarte pe mai multe linii, mergând înapoi în timp.

Prima jumătate — referința obligatorie per linie — este **confirmată absolut**:

| Măsurătoare (facturi 7531, `ISCANCEL=0`, 2026-01-01 → 2026-07-24) | Rezultat |
| --- | ---: |
| Linii de retur în total | 1.738 |
| Linii cu `MTRLINES.FINDOCL > 0` | **1.738 (100%)** |
| Ținta lui `FINDOCL` | **întotdeauna** un document din seria 7111 |

A doua jumătate — plafonul de disponibilitate — este **încălcată sistematic în producția
beneficiarului**:

| Măsurătoare pe cele 473 de linii de aviz distincte (`FINDOCL`, `MTRLINESL`) referite de retururile din 2026 | Rezultat |
| --- | ---: |
| Linii de aviz referite de **mai multe** facturi de retur | **181 (38%)** — una dintre ele de 44 de ori |
| Linii de aviz la care cantitatea returnată cumulat **depășește** `QTY1` a liniei-sursă | **127 (27%)** |

Amploarea depășirii nu este marginală. Primele cinci linii-sursă după numărul de referințe:

| Aviz-sursă | Cantitate pe linia-sursă | Cantitate returnată cumulat | Facturi de retur |
| --- | ---: | ---: | ---: |
| `AEX-AE-048614` | 18 | **499** | 44 |
| `AEX-AE-049910` | 12 | **338** | 42 |
| `AEX-AE-049759` | 12 | **289** | 39 |
| `AEX-AE-049847` | 12 | **304** | 38 |
| `AEX-AE-049481` | 18 | **414** | 38 |

Raportul este de 20–28×. Nu este o abatere ocazională, ci modul normal de lucru.

> **Concluzie de arhitectură.** `FINDOCL`/`MTRLINESL` este o **ancoră documentară de preț**, nu o
> scădere de stoc. Nu există și nu se ține niciun registru de disponibilitate, iar nimeni nu îl impune.
> Construirea unei contabilități FIFO de consum ar bloca controlat ~27% din realitatea de azi. Asta
> explică și de ce alegerea operatorului dintre candidații cu același preț părea arbitrară: **este**
> arbitrară, pentru că nu se consumă nimic.

Cazul multi-aviz descris de manual există, dar este marginal: din 1.676 de perechi
produs-per-factură, doar **28 (1,7%)** se împart pe mai multe avize.

## 7. Numărul de ordine de retur — singurul blocaj real

Manualul cere ca factura să poarte `Numarul de ordine de retur` în câmpul `Comanda`
(Auchan `04497049`, Dedeman `6100352505`).

**Confirmat în producție:** `Comanda` este `FINDOC.NUM04`, iar cele două facturi îl au completat
exact cu aceste valori.

> **Atenție: `NUM04` este `float`.** Zeroul din față al numărului Auchan (`04497049`) se pierde;
> Soft1 stochează `4497049`. Un număr de retur alfanumeric nu ar putea fi stocat deloc.

**Dar acest număr nu sosește în fișierul XML.** Payload-ul RETANN conține un singur identificator de
document — `RetannHeader/DocumentNumber`, adică `Numar avize de retur` din terminologia manualului
(Dedeman `5017612837`, Auchan `503498` pentru exemplele de mai sus). `Numarul de ordine de retur` nu
apare sub nicio formă în cele 5 fișiere reale.

Mizele sunt concrete: exportul `exportXMLDedemanReturn()` din `S1/JS/SALDOC_EF_27072026.js` — care
generează RETANN-ul de ieșire pentru facturile 7531 către Dedeman — **validează `SALDOC.NUM04` ca
obligatoriu**. Astăzi operatorul îl citește din portalul EDInet și îl tastează manual. Fără o sursă
automată, acest pas rămâne manual chiar dacă restul fluxului se automatizează.

> **Depozitarea nu este constrângerea; disponibilitatea datelor este.** Adăugarea de coloane `CCC*`
> este permisă fără restricții în acest ERP, iar tabela dormantă `A_IKA_RETANN` are deja o coloană
> `COMANDARETUR`. Problema este că valoarea nu ajunge niciodată la noi.

## 8. Seria de facturare

**Regula beneficiarului, confirmată integral:** seria **7531**, abreviere `RFVQ-`, denumire Soft1
`Retur Factura vanzari (QV)`. Spre deosebire de facturile pe bază de aviz (7121 / 7122 / 7123), seria
7531 este **comună tuturor clienților** — nu există serii separate per client pe retururi.

Numerele consecutive `14864` (Auchan) și `14867` (Dedeman) din aceeași zi confirmă contorul comun.

Antetul verificat în producție, identic pe ambele exemple:

| Câmp | Valoare |
| --- | --- |
| `SERIES` | `7531` |
| `SOSOURCE` | `1351` |
| `FPRMS` | `753` |
| `TRNDATE` | `2026-07-12` |

`ON_POST` din `SALDOC_EF.js` impune `FINDOCL` pe fiecare linie de 7531 (și de 9221); linia fără
`FINDOCL` este respinsă cu `Completati Document storno pentru articolul ...`. `MTRLINESL` nu este
impus de ERP, dar trebuie completat pentru trasabilitate.

## 9. Exemplele beneficiarului, reconciliate

### Auchan — retur `4497049`

RETANN `503498`, filiala `AUCHAN BRASOV VEST 036` (GLN `5940475172183`).

`RFVQ-FC-14864` / `FINDOC 2170614`, 12.07.2026, `Comanda = 4497049`:

- 52 buc × 9,10 = −473,20 RON
- 13 buc × 7,87 = −102,31 RON
- net −575,51 RON, TVA 11% −63,31 RON, **total −638,82 RON** (`SUMAMNT` include TVA)

### Dedeman — retur `6100352505`

RETANN `5017612837`, filiala `MEDIAS 20` (GLN `5949111999801`).

`RFVQ-FC-14867` / `FINDOC 2170620`, 12.07.2026, `Comanda = 6100352505`:

- 1 buc × 11,03 = −11,03 RON
- TVA 11% −1,21 RON, **total −12,24 RON**

> Ambele exemple sunt din 12.07.2026, deci **nu se află printre cele 5 fișiere RETANN capturate**
> (fereastra de captură este 20–24.07.2026). Verificarea s-a făcut pe documentele Soft1 rezultate, nu
> pe payload-urile originale.

## 10. Volumul fluxului

| Măsurătoare | Auchan | Dedeman | Total |
| --- | ---: | ---: | ---: |
| Facturi 7531 (2026-01-01 → 2026-07-24, `ISCANCEL=0`) | 62 | 198 | **260** |
| Linii | 333 | 1.405 | 1.738 |
| Fișiere RETANN primite (20–24.07.2026) | 1 | 4 | 5 |

> **Cele două cifre nu sunt comparabile direct.** Seria 7531 acoperă **toate** retururile de factură —
> inclusiv stornourile comerciale și cel din fluxul `DOAR AVIZ` (`RFVQ-FC-14935`) — nu doar cele
> generate de RETANN. Un 7531 al cărui `FINDOCL` indică un 7111 nu este automat o lipsă de recepție:
> `RFVQ-FC-14882`, de exemplu, are 22 de linii care trimit către 17 avize **diferite**.
>
> Mai mult: din cele 1.568 de facturi 7531 emise în 2026, doar **260 (17%)** sunt pentru Auchan sau
> Dedeman. Restul de 1.308 aparțin altor clienți, care nu au flux RETANN.

## 11. Reguli de implementare

1. **RETANN intră prin pipeline-ul propriu**, ca rând `CCCSFTPXML` cu `EDIDOCTYPE='RETANN'`, iar
   `FINDOC` se completează cu 7531-ul creat. Coloana există deja, deci legătura fișier ↔ document nu
   costă nicio modificare de schemă și moștenește mașina de stări, backup-ul DO, retry-ul și
   interfața. Tabelele dormante `A_IKA_RETANN*` **nu** se reutilizează.
2. **Un singur câmp nou merită adăugat:** `CCCSFTPXML.CCCEDIDOCNUM varchar(50)`, indexat — numărul de
   document al retailerului pentru toate tipurile (`BuyerOrderNumber` la ORDERS, `DocumentNumber` la
   RECADV/RETANN). Oferă deduplicare uniformă și înlocuiește detecția actuală bazată pe nume de fișier.
3. **Ancorare:** `BuyerParty/GLN` → `TRDR`, apoi `ShipToParty/GLN` + `TRDR` → `TRDBRANCH`, apoi
   `BuyerItemID` + `TRDR` → `MTRL`. Eșec controlat la orice ambiguitate.
4. **Agregare în interiorul fișierului:** același produs poate apărea pe mai multe linii în același
   fișier (în `637393663`, codul Auchan `17916` apare de două ori, −10 și −6).
5. **Preț:** se copiază de pe o linie de aviz 7111 a aceluiași `TRDR` care poartă produsul la prețul
   curent; `FINDOCL` + `MTRLINESL` se completează cu acea linie. **Nu** se verifică disponibilitatea.
6. **Serie:** 7531, `SOSOURCE=1351`, `FPRMS=753`. `FINDOCL` obligatoriu pe fiecare linie.
7. **`NUM04`** rămâne, până la clarificarea din §7, fie gol, fie completat manual, fie — dacă
   beneficiarul acceptă — cu `DocumentNumber`-ul Edinet pe care îl primim efectiv.
8. **Parserul se scrie după realitate, nu după specificația v4.0** — rădăcină `<Document><Retann>`,
   `GLN` în loc de `ILN`, `DocumentNumber`/`DocumentIssueDate` în loc de `RetannNumber`/`IssueDate`,
   `UnitOfMeasure` cu un singur `s`, adrese plate. Detaliile complete sunt în
   `Manual_integrare_facturare_edi_Auchan_Dedeman.md`, secțiunea „RETANN: formatul real".

## 12. Întrebări deschise

- **De unde se ia `Numarul de ordine de retur`?** Nu sosește în fișier (§7). Din portalul EDInet,
  dintr-un al doilea tip de document, sau se acceptă în locul lui `DocumentNumber`-ul pe care îl
  primim? **Este singurul blocaj pentru automatizarea completă a fluxului.**
- **Care este regula reală de alegere a avizului-sursă?** Nivelul de client este dovedit, cel de
  filială este infirmat, „ultimul" este infirmat (§5). Contează pentru beneficiar *care* aviz este
  referențiat, sau doar ca prețul să fie corect?
- **De ce a rămas nefolosit stratul de import RETANN/RECADV existent?** `A_IKA_RETANN` +
  `A_IKA_RETANNDETAIL` au 0 rânduri, iar `A_TMP_EXPERT_RECADV` are 1.185 de rânduri cu `_Imported=0`
  pe fiecare. Poate codifica o constrângere pe care nu am întâlnit-o încă.
