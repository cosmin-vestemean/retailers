# Automatizarea recepțiilor EDI (RECADV) — plan pe faze

**Data:** 2026-07-28 (actualizat după preluarea și analiza tuturor fișierelor RECADV și RETANN)
**Aplicabil:** Dedeman și Auchan (EDInet / Infinite)
**Status:** propunere de plan; necesită confirmarea beneficiarului pentru pornire

---

## 1. Situația de azi

Retailerii ne trimit electronic, prin EDInet, confirmarea de recepție a mărfii (**RECADV**) — documentul
care spune ce cantitate au primit efectiv, față de ce le-am livrat noi prin aviz.

Astăzi acest document **nu intră deloc** în platformă. Angajații îl deschid în portalul EDInet, îl
printează și introduc datele manual în Soft1. Toată reconcilierea între „ce am livrat" și „ce au
primit" se face pe hârtie, de om.

Documentele sunt disponibile pe contul nostru FTP din 2026-07-21, specificația tehnică oficială a fost
primită pe 2026-07-27, iar pe 2026-07-28 **au fost preluate și analizate toate cele 101 fișiere RECADV**
acumulate până acum. Deci nu doar că putem începe — știm exact ce conțin fișierele.

---

## 2. Ce am măsurat

Întrebarea de bază a fost: **cât de des marfa livrată și marfa recepționată coincid?**

Am răspuns în două feluri: mai întâi indirect, din Soft1 (§2.1), apoi direct, pe fișierele RECADV
reale (§2.2). Cele două măsurători sunt independente și se confirmă reciproc.

### 2.1 Indicator indirect, dedus din Soft1

Măsurătoare pe avizele de livrare (seria 7111) și returul asociat (seriile 9221 / 7531):

**Perioada 2026-05-01 … 2026-07-28 (~62 zile lucrătoare)**

| | Dedeman | Auchan | Total |
|---|---|---|---|
| Avize de livrare | 611 | 257 | 868 |
| **Documente** fără diferențe | 80% | 94% | **84%** |
| Linii de produs | 17.530 | 1.673 | 19.203 |
| Linii cu diferențe | 211 | 20 | 231 |
| **Linii** fără diferențe | 98,8% | 98,8% | **98,8%** |

*Confirmare pe 7 luni (2026-01-01 … 2026-07-28): 2.251 de avize, 79% curate la Dedeman, 88% la Auchan.
Proporțiile sunt stabile.*

### 2.2 Măsurătoare directă, pe fișierele RECADV reale

Pe 2026-07-28 au fost preluate **toate cele 101 fișiere RECADV** de pe FTP (2026-07-20 … 2026-07-28),
cu salvare de siguranță înainte de orice parsare, și au fost comparate linie cu linie cu avizele din
Soft1. Este prima măsurătoare făcută pe documentele reale, nu dedusă.

| | Dedeman | Auchan | Total |
|---|---|---|---|
| Fișiere RECADV | 78 | 23 | 101 |
| Recepții (după cumularea fișierelor pe același aviz) | 74 | 23 | 97 |
| Linii de produs | 1.265 | 220 | 1.485 |
| Linii identificate automat în Soft1 | 100% | 100% | **100%** |
| **Recepții** fără diferențe | 72 (97%) | 20 (87%) | **92 (95%)** |
| Linii cu diferențe | 2 | 3 | **5** |
| **Linii** fără diferențe | 99,8% | 98,6% | **99,7%** |

Fereastra este de numai 8 zile, deci cifrele sunt orientative, nu anuale. Direcția este însă aceeași
cu indicatorul indirect din §2.1, iar rata pe linii este chiar mai bună decât cea estimată.

**Un rezultat mai important decât procentele:** din cele 101 documente, **toate 101** au putut fi
legate automat de avizul corespunzător, iar din cele 1.485 de linii de produs **toate 1.485** au fost
identificate fără ambiguitate, prin codul de produs al clientului. Nu a existat niciun caz care să
ceară intervenție umană din motive tehnice — doar cele 5 diferențe reale de cantitate.

Detaliile de format și regulile tehnice rezultate sunt documentate în
`Manual_integrare_facturare_edi_Auchan_Dedeman.md`, secțiunea „Formatul real, măsurat pe tot corpusul".

---

## 3. Constatarea care decide arhitectura

Cele două procente din §2.1 — **98,8% pe linii** dar doar **84% pe documente** — par contradictorii.
Nu sunt. Iar măsurătoarea directă din §2.2 reproduce același tipar: 99,7% linii curate, dar 95%
recepții curate.

Un aviz Dedeman are în medie **~29 de linii**. E suficient ca **o singură linie** să aibă o diferență
ca tot documentul să devină „cu probleme". Așa se face că 1,2% linii problematice produc 16%
documente problematice.

**Consecință practică:** contează enorm la ce nivel decidem „automat vs. verificare umană".

| | Varianta A: decizie pe **document** | Varianta B: decizie pe **linie** |
|---|---|---|
| Regula | Se facturează automat doar avizele în care *toate* liniile coincid | Se facturează automat liniile care coincid; se marchează doar liniile cu diferență |
| Automatizat | 84% dintre documente | 98,8% dintre linii |
| Ajunge la om | 139 documente (~2,2/zi) | 231 linii (~3,7/zi) |
| Muncă manuală reală | ~3.000 de linii, din care ~2.770 erau corecte | ~231 de linii |

Varianta B reduce munca manuală de aproximativ **13 ori**, la același efort de implementare.

Are și un al doilea argument, mai important: **varianta B este exact ce face deja Soft1 astăzi.**
Am verificat în producție — factura (7122/7123) poartă cantitatea *acceptată* pe toate liniile, iar
documentul de retur (9221) poartă *doar* diferența, ambele trimițând către aceeași linie de aviz.
Deci nu inventăm un flux nou, îl automatizăm pe cel existent.

> **Recomandare: varianta B — decizie la nivel de linie.**

---

## 4. Planul pe faze

### Faza 0 — Vizibilitate (nu creează nimic în Soft1) — **realizată offline pe 2026-07-28**

Platforma preia automat documentele RECADV de pe FTP, le citește și le compară cu avizul nostru de
livrare. Rezultatul se vede în interfață: verde pentru „totul coincide", roșu cu detaliul liniei
pentru „diferență".

- **Nu se creează niciun document în Soft1.** Risc operațional zero — motiv pentru care faza a putut
  fi executată fără acord prealabil.
- Înlocuiește imediat pasul de printat din portal și citit pe hârtie.
- **Reconcilierea a fost deja rulată pe tot corpusul de 101 fișiere** (§2.2): 101/101 documente legate
  de aviz, 1.485/1.485 linii identificate. Ce rămâne de făcut este preluarea automată recurentă și
  afișarea în interfață, nu logica de potrivire.
- Efort rămas: mic.

### Faza 1 — Facturare automată a cazului curat

Pentru liniile în care cantitatea livrată = cantitatea recepționată, se generează automat factura
(7122 Auchan / 7123 Dedeman) din avizul de livrare. Liniile cu diferență rămân marcate, netratate.

- Acoperă ~99% din linii.
- Diferențele nu se ating deloc — nu se creează retururi automat.
- Atenție: prețurile **nu** sosesc prin RECADV (câmpul este absent în toate cele 1.485 de linii reale),
  deci valoarea liniei se ia obligatoriu din avizul Soft1.
- Efort: mediu. Blocajul tehnic principal (crearea documentelor legate în Soft1) a fost **rezolvat**
  pe 2026-07-27: documentele pot fi create direct, fără conversie manuală.

### Faza 2 — Tratarea lipsurilor

Pentru liniile cu cantitate recepționată mai mică, se generează automat documentul de retur 9221
pentru diferență.

- Necesită o verificare proprie, **cumulativă și anti-duplicat**, a cantităților deja returnate.
  Motiv: Soft1 verifică fiecare retur separat față de cantitatea livrată, dar **nu scade retururile
  anterioare**. În consecință, același retur poate fi emis de două ori fără ca sistemul să
  semnaleze ceva. În producție există **52 de astfel de cazuri** (16 după 2025-01-01, ultimul pe
  2026-06-30), toate cele recente fiind duplicate exacte. **Vezi Anexa A** pentru cazuri concrete.
- Riscul nu este teoretic: **în chiar corpusul analizat există fișiere RECADV duplicate** — același
  aviz, același produs, aceeași cantitate, aceeași zi, dar două documente distincte (§6.7). Fără
  protecție, fiecare ar genera propriul retur.
- Automatizarea trebuie să prevină acest tipar, nu să îl multiplice: un sistem automat poate genera
  duplicate mult mai repede decât un om.
- Efort: mediu.

### Faza 3 — Tratarea surplusului („DOAR AVIZ")

Aici intră decizia comercială descrisă în §5. Până la faza 3 nu blochează nimic.

- Efort: mic, odată ce regula e stabilită.

---

## 5. Decizia comercială rămasă: „DOAR AVIZ"

**Nu blochează fazele 0-2.** Fiind un caz de diferență, ajunge automat în categoria „marcat pentru om".
Poate fi decis oricând până la faza 3.

### Despre ce e vorba

Când Dedeman primește într-un centru de distribuție mai multă marfă decât a comandat, surplusul nu se
returnează. Dedeman trimite ulterior o comandă EDI cu mențiunea **„DOAR AVIZ"** — adică: *marfa e deja
la noi, nu trimite nimic, doar emite documentele*.

Manualul de integrare spune „NU se integrează **(deocamdată)** în Soft1 ca și comenzi normale".
Producția face exact invers. Cuvântul „deocamdată" arată că regula nu a fost niciodată stabilită
definitiv.

### Cât de des apare

Măsurat pe **tot istoricul** de comenzi EDI: 152 de comenzi conțin cuvântul „AVIZ", 292 conțin „DOAR",
iar **ambele cuvinte apar împreună într-un singur caz**. Frecvență: aproximativ o dată pe an.

### Cazul real, cu cifre

Produs `PF.00006`, cod Dedeman `7050498`, **24 de bucăți**:

```
1. Marfa era deja la CDL  →  aviz AEX-AE-053667  →  factură FAEXD-PF-39575 = 34,80 lei (1,45 lei/buc)
2. Sosește comanda „DOAR AVIZ" 4516747570
                          →  comandă CKEY-00061000 → aviz AEX-AE-053708
                          →  factură FAEXD-PF-39839 = 30,96 lei (1,29 lei/buc)
3. Prima factură stornată →  RFVQ-FC-14935 (seria 7531)
```

Diferență: **3,84 lei** în favoarea Dedeman. Prețul din comanda lor (1,29) e mai mic decât prețul cu
care facturasem noi direct (1,45), deci integrarea comenzii a însemnat, practic, refacturare la
prețul retailerului.

### Întrebarea pentru beneficiar

> Marfa dintr-o comandă „DOAR AVIZ" rămâne facturată la prețul nostru inițial,
> sau se refacturează la prețul din comanda Dedeman?

Opțiuni: **(A)** rămâne la prețul nostru, comanda nu se integrează · **(B)** se refacturează la prețul
lor, cu storno pe 7531 — atenție, azi stornoul depinde de memoria unui om, iar dacă e uitat marfa
rămâne facturată de două ori · **(C)** platforma oprește comanda și decide operatorul, de la caz la caz.

**Recomandare: C.** Cazul apare o dată pe an, nu merită o regulă rigidă; elimină riscul de dublă
facturare din B; iar dacă ulterior se stabilește o regulă fermă, C devine A sau B fără muncă în plus.

**A doua întrebare, legată:** cine emite documentul de retur 7531 pentru surplus?

### 5.1 Al doilea flux, descoperit pe 2026-07-28: marfa returnată din magazine (RETANN)

Pe lângă confirmările de recepție, retailerii ne trimit și **anunțuri de retur** pentru marfă
nevândută sau expirată, direct din magazine. Am preluat cele 5 fișiere existente: cantități mici,
articole asortate, atât Dedeman cât și Auchan.

**Acest flux nu se poate lega de livrare.** Fișierele nu conțin nici numărul avizului, nici numărul
comenzii, nici prețul — deși specificația prevedea toate trei. Nici nu ar avea sens: marfa expirată
provine dintr-un cumul de livrări vechi de luni, iar returul este o operațiune comercială nouă, nu
corecția unei livrări.

Ce se poate face automat: identificarea produsului (13 din 13 coduri s-au rezolvat) și a magazinului
(4 din 4). Ce lipsește sunt două decizii:

1. **La ce preț se valorizează returul?** Prețul curent din contract, sau prețul ultimei livrări către
   acel magazin?
2. **Ce serie de document Soft1 primește?** Nu poate fi 9221, care e legat obligatoriu de un aviz.

Până la aceste răspunsuri, fluxul rămâne în afara planului de mai sus. **Nu blochează nimic** — volumul
este mic (5 fișiere în 8 zile, față de 101 RECADV).

---

## 6. Rezerve pe care le semnalăm din start

> **Actualizat 2026-07-28**, după preluarea și analiza tuturor celor 101 fișiere RECADV. Două dintre
> rezervele inițiale s-au închis, una s-a dovedit **greșită**, iar trei noi au apărut.

### Închise

1. ~~Cifrele din §2 sunt un indicator indirect, nu o măsurătoare pe RECADV.~~ **Închis.** Măsurătoarea
   directă există acum (§2.2) și confirmă direcția: 99,7% linii curate față de 98,8% estimat.
2. ~~Nu știm încă dacă Auchan trimite același format.~~ **Închis.** Auchan trimite același format v4.0
   (23 din cele 101 fișiere), dar **nu trimite deloc numărul avizului** — legătura se poate face doar
   prin numărul comenzii. Un singur parser este suficient, cu așteptări de câmp diferite per client.

### Dovedită greșită

3. ~~Fișierele de pe FTP se consumă la citire.~~ **Nu este adevărat pentru `/recadv`**: 101 fișiere
   înainte, 101 după, verificat de două ori. La fel și pentru `/retann` (5 înainte, 5 după). Salvarea
   de siguranță înainte de parsare rămâne totuși obligatorie, pentru că pentru `/orders`
   comportamentul vechi este valabil.

### Rămân valabile

4. **Surplusul nu e inclus în procentele de mai sus.** Măsurătoarea acoperă lipsurile. Surplusul
   urmează alt drum, deci procentul de cazuri care ajung la om este o limită *inferioară*.
5. **Consolidarea complică și cazul „curat".** Confirmată acum și în fișierele reale: 7 recepții au
   antetul cu mai multe avize, iar 4 cu mai multe comenzi. O recepție fără diferențe poate totuși
   cere unirea a două avize — deci „curat" nu înseamnă automat „banal".

### Noi

6. **Același aviz poate primi mai multe fișiere RECADV** — 4 cazuri în corpus. Cantitățile trebuie
   cumulate **înainte** de calculul diferenței. Exemplu `AEX-AE-053669`: un fișier raportează 16
   bucăți acceptate, altul 4, iar avizul are 20 — recepția este curată doar după cumulare. Procesarea
   fișier cu fișier ar genera două retururi pentru același eveniment fizic.
7. **Unele dintre aceste perechi sunt duplicate, nu livrări parțiale.** Pentru `AEX-AE-053774` și
   `AEX-AE-053986` există câte două documente care descriu același aviz, același produs și aceeași
   cantitate, în aceeași zi. Cumulate, dau 12 bucăți acceptate față de 6 livrate — imposibil fizic.
   Regula obligatorie: **acceptat mai mare decât expediat ⇒ oprire și verificare umană**, niciodată
   retur automat.
8. **Un caz Auchan rămas neexplicat:** avizul `AEX-AE-053715` conține 7.728 bucăți din codul `340171`,
   dar recepția magazinului confirmă 1.392. Toate avizele Auchan sunt emise către depozite
   (`901 Campus Auchan AMBIENT`, `51940 CAMPUS Deva CALAN`), nu către magazinul din recepție — este
   posibil ca un aviz să acopere mai multe magazine. De clarificat înainte de faza 2.
9. **Retururile de marfă nevândută (RETANN) nu se pot lega de livrare.** Cele 5 fișiere reale nu
   conțin **nici număr de aviz, nici număr de comandă, nici preț** — deși specificația prevedea toate
   trei. Este un flux separat, care nu intră în reconcilierea din acest plan și care are nevoie de
   decizii proprii (§5.1).

---

## 7. Ce cerem beneficiarului acum

1. **Faza 0 nu mai are nevoie de acord — s-a realizat deja.** Preluarea și reconcilierea au fost
   făcute pe 2026-07-28, pe toate cele 101 fișiere reale, fără nicio scriere în Soft1 și fără niciun
   risc operațional. Rezultatele sunt în §2.2. Ce cerem nu este permisiunea de a începe, ci
   **confirmarea că raportul din §2.2 este util în forma actuală** și acordul de a-l muta din script
   offline în interfața platformei, rulat automat.
2. **Confirmarea variantei B** (decizie la nivel de linie) ca principiu de lucru pentru fazele 1-2.
3. **Clarificarea cazului Auchan din §6.8** — dacă un aviz către depozit acoperă mai multe magazine,
   reconcilierea Auchan trebuie să aștepte confirmările tuturor magazinelor înainte de a decide.
4. Răspunsul la §5 — oricând până la faza 3.
5. **Cele două decizii pentru fluxul RETANN din §5.1** — prețul de valorizare și seria documentului.
   Nu blochează fazele 0-3.

---

## 8. Referințe

- `Manual_integrare_facturare_edi_Auchan_Dedeman.md` — specificația de business a beneficiarului
- `Analiza_exemplelor_in_Soft1.md` — verificarea exemplelor în producție
- `../dedeman/Infinite_EDInet_DESADV_RECADV.md` — specificațiile XML oficiale Infinite (v4.0 / v4.1)
- Documente Soft1 din exemplul §5: `AEX-AE-053667`, `FAEXD-PF-39575`, `CKEY-00061000`,
  `AEX-AE-053708`, `FAEXD-PF-39839`, `RFVQ-FC-14935`

---

## Anexa A — Retururi emise de două ori pentru aceeași livrare

Această anexă justifică cerința de verificare anti-duplicat din faza 2 (§4).

### Ce am căutat

Pentru fiecare combinație aviz de livrare + produs, am însumat toate cantitățile returnate prin
documente de retur 9221 și le-am comparat cu cantitatea efectiv livrată pe acel aviz.

**Rezultat: 52 de cazuri în care s-a returnat mai mult decât s-a livrat** — 16 dintre ele după
2025-01-01, ultimul pe 2026-06-30.

### Ce s-a întâmplat, de fapt

Toate cele 16 cazuri recente au **exact același tipar**: cantitatea returnată este fix dublul celei
livrate, prin exact două documente de retur. Nu este vorba de retururi parțiale care se acumulează
în timp, ci de **același document de retur emis a doua oară**, la câteva săptămâni distanță.

Documentele duplicate sunt identice: același număr de linii, aceleași cantități, aceeași valoare.

### Cazurile concrete

**1. Supeco — aviz `AEX-AE-048118` din 2026-01-30**

| Retur | Data | Linii | Cantitate | Valoare |
|---|---|---|---|---|
| `AAEX-PET-2781` | 2026-02-06 | 14 | 1.278 | 1.649,04 lei |
| `AAEX-PET-2865` | 2026-03-04 | 14 | 1.278 | 1.649,04 lei |

Toate cele 14 produse apar returnate în cantitate dublă. Exemple: `PF.00020` livrat 288, returnat
576; `PF.00016` livrat 264, returnat 528; `MF.07414` livrat 6, returnat 12.

**2. REWE (Penny) — aviz `AEX-AE-052358` din 2026-06-05, produs `PF.00044`**

| Retur | Data | Cantitate | Valoare |
|---|---|---|---|
| `AAEX-PET-3002` | 2026-06-11 | 6.336 | 5.955,84 lei |
| `AAEX-PET-3022` | 2026-06-30 | 6.336 | 5.955,84 lei |

Livrat: 6.336 bucăți. Returnat cumulat: 12.672 bucăți.

**3. REWE (Penny) — aviz `AEX-AE-052359` din 2026-06-05, produs `PF.00043`**

| Retur | Data | Cantitate | Valoare |
|---|---|---|---|
| `AAEX-PET-3003` | 2026-06-11 | 6.336 | 5.955,84 lei |
| `AAEX-PET-3023` | 2026-06-30 | 6.336 | 5.955,84 lei |

Livrat: 6.336 bucăți. Returnat cumulat: 12.672 bucăți.

### Valoarea implicată

Doar cele trei cazuri de mai sus însumează **13.560,72 lei** de retururi emise a doua oară. Nu am
verificat dacă au fost ulterior corectate manual — anexa semnalează doar că sistemul nu le-a oprit.

### De ce se întâmplă

Soft1 verifică fiecare document de retur **individual**: cantitatea returnată nu poate depăși
cantitatea livrată pe avizul respectiv. Verificarea trece de fiecare dată, pentru că fiecare
document, luat separat, este corect. Ce lipsește este scăderea retururilor deja emise.

### De ce contează pentru acest proiect

1. **Cazurile de mai sus sunt la Supeco și REWE, nu la Dedeman sau Auchan.** Deci automatizarea nu
   preia o problemă existentă la acești doi clienți — dar mecanismul este același și i-ar expune.
2. **Un sistem automat produce duplicate mai repede decât un om.** Dacă același RECADV este preluat
   de două ori (repornire, reprocesare manuală, fișier livrat din nou de EDInet), fără protecție
   proprie s-ar genera al doilea retur exact ca în cazurile de mai sus.
3. **Verificarea cumulativă singură nu e suficientă.** Protecția trebuie să fie și pe identitatea
   documentului sursă: un RECADV deja procesat nu trebuie să genereze un al doilea retur, indiferent
   de cantități.

### Observație rămasă neinvestigată

Aceeași comparație pe cealaltă serie de retur (7531) produce un număr mult mai mare de potriviri,
dar cu un tipar complet diferit — până la 44 de documente de retur legate de o singură linie de aviz.
Acest lucru sugerează că pe seria 7531 legătura către aviz are altă semnificație, nu de retur
propriu-zis. **Nu am inclus aceste cazuri în cifrele de mai sus** pentru că nu sunt încă înțelese;
merită o verificare separată, independentă de acest proiect.

