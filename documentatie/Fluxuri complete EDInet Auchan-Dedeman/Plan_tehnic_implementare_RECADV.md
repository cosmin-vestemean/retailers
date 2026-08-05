# Plan tehnic de implementare — ingestie RECADV

**Data:** 2026-08-05
**Status:** aprobat pentru implementare, neînceput
**Sesiune sursă:** brainstorming 2026-08-05 (toate presupunerile validate pe date de producție)

> Acest document este **planul tehnic**. Planul de business, pe faze, rămâne
> `Plan_implementare_receptii_EDI.md`, iar formatul real măsurat al fișierelor este în
> `Manual_integrare_facturare_edi_Auchan_Dedeman.md`.

---

## 1. De ce facem asta acum

Pe 2026-08-05 beneficiarul a raportat:

> „Retailers citește avizele de recepție și în platformă le schimbă starea în citit. Sunt greu de
> identificat de utilizatorul care facturează manual acum. Nu mai știe ce a facturat și ce nu."

**Cauza reală:** capturile noastre de cercetare (`scripts/fetch-recadv-sample.mjs`,
`scripts/list-recadv-timestamps.mjs`) au făcut `RETR`/`LIST` pe contul FTP **de producție** în
sesiunile din 21, 27 și 28 iulie, ca să extragem corpusul de 101 RECADV + 5 RETANN. `RETR` nu
consumă fișierele (verificat de două ori), dar portalul web EDInet ține un flag „citit" separat,
declanșat de accesul FTP. Am verificat ștergerea, nu starea de citire.

**Nu este un bug în codul de producție.** Cron-ul `scanAll()` nu atinge `/recadv`, pentru că
`infiniteProvider.filenamePrefixes('aperak', ...)` returnează `[]`. Deci nu se repetă de la sine.

**Concluzia care conduce planul:** platforma trebuie să ofere un înlocuitor mai bun decât flagul din
portal. De aceea activarea descărcării live este **ultimul** pas, nu primul.

### Decizii de scop luate de beneficiar
- Faza 0 (listă de avize nefacturate, doar din Soft1) — **sărită**, se descurcă beneficiarul.
- Infinite **nu** se anunță despre efectul asupra flagului „citit".
- **RECADV se implementează acum.** RETANN așteaptă ticketul Infinite
  [RO-7627](https://yt.infinite.pl/issue/RO-7627), deschis ca să adauge numărul de comandă în XML
  atât la RECADV cât și la RETANN. Portalul dovedește că valoarea există
  (`Numarul de ordine de retur: 6100356493`), doar că nu e serializată în fișier.

---

## 2. Fapte verificate — NU se re-derivează

Toate au fost măsurate pe producție în sesiunea de brainstorming. Economisesc o oră de investigație.

### 2.1 Predicatul „avizul e facturat"

**Nu se hardcodează `FPRMS=712` / `SERIES=7122`** — acelea sunt doar Auchan. Dedeman facturează pe
`SERIES=7123`, `FPRMS=716`. Prima variantă a raportat **0 facturi pe 342 de avize Dedeman**.

Se folosește **tipul** de document, nu seria:

```sql
EXISTS (SELECT 1 FROM MTRLINES l
        JOIN FINDOC i   ON i.FINDOC = l.FINDOC AND i.ISCANCEL = 0
        JOIN SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY
        WHERE l.FINDOCS = adv.FINDOC AND p.TFPRMS = 103)
```

`TFPRMS = 103` = factură (ambii retaileri). `TFPRMS = 154` = aviz de retur `9221`.

Măsurat 2026-07-01 → 08-05, `SERIES=7111, ISCANCEL=0`:

| Retailer | Avize | Facturate | Nefacturate |
|---|---|---|---|
| Dedeman 11654 | 342 | 228 | 114 |
| Auchan 13248 | 128 | 64 | 64 |

### 2.2 Capcane SQL confirmate
- `STRING_SPLIT` **este** disponibil (SQL Server 2025, compat 170). Atenție: `sys.system_objects`
  **nu** îl listează — se testează prin apel, nu prin lookup.
- Agregatele nu pot conține subinterogări (`Ole Error 80040E14`) — flagul se calculează într-o
  tabelă derivată, apoi se agregă.
- `JOIN MTRLINES ON (l.FINDOCS = x OR l.FINDOCL = x)` **dă timeout**. Cele două coloane se
  interoghează separat.
- Tabela `SALDOCSERIES` **nu există**.

### 2.3 `FULLYTRANSF` / `QTY1COV` — nu este flag de „facturat"
S1 le întreține automat când liniile primesc `FINDOCS`/`FINDOCL`; **nu se scriu manual niciodată**.
Dar **nu blochează** o a doua conversie: **2257 de avize** au simultan factură activă și retur `9221`
activ. Sunt de acord cu predicatul de mai sus pe 469 din 470 de avize — bună verificare încrucișată,
**nu** sursă de adevăr. Detalii în `documentatie/FULLYTRANSF_CONVERSION_GUARD.md`.

### 2.4 `CCCDOCUMENTES1MAPPINGS` — nu se folosește și nu se „repară"
Auditată integral. Singurul consumator care poartă greutate este `src/edi/order-builder.js`, care
caută după `{SOSOURCE, FPRMS, SERIES, TRDR_RETAILER}` și **nu filtrează** pe `DOCUMENT_TYPE`,
`DIRECTION` sau `ACTIVE`. Restul e documentație:

- tipul e scris greșit `INVIOCE` (sistemic, 6 linii) — inofensiv, nimeni nu filtrează pe el;
- Auchan `13248` are **doar** linia `ORDER` — nu e un defect real, nimeni n-ar citi linia de factură;
- liniile Dedeman `DESADV`/`INVIOCE`/`RETANNS` au **0 linii copil** — locuri goale. XML-ul de
  factură Infinite se produce din exportul Soft1 `G_XML_ExportDoc`, nu din tabela asta;
- `13249` = **Carrefour** inactiv (nu Auchan!), dar are mapări complete (66 + 8 copii) —
  **nu se șterge**.

**Regulă: nu se atinge tabela ca exercițiu de curățenie.** Pentru RECADV nu e nevoie de ea.

### 2.5 Rândurile RECADV nu vor fi înhățate de procesorul de comenzi
Verificat: `processPendingOrders` trimite explicit `doctype: 'ORDERS'`, iar AJS
`getPendingSftpXml` filtrează `EDIDOCTYPE`. Sigur.

### 2.6 Formatul real al fișierelor
**Sursa canonică este `/memories/repo/edi-recadv-real-format.md`** (memorie de repo) și secțiunea
„Formatul real, măsurat pe tot corpusul" din `Manual_integrare_facturare_edi_Auchan_Dedeman.md`.
**Specificația v4.0 este greșită în mai multe puncte — se scrie parserul după realitate.**

Esențialul:
- rădăcină `<Document>`, UTF-8; antetul `RecadvHeader`; rutare pe `RecadvParty/BuyerParty/GLN`
  (`5940475841003` = Dedeman 11654, `5940475172008` = Auchan 13248);
- `DeliveryDocumentNumber` are 3 forme (`AEX-AE-053744`, `53986`, trunchiat `AEX-AE-053657/AE`) →
  normalizare pe ultimele 6 cifre; Auchan **nu îl trimite deloc**;
- `BuyerOrderNumber` poate fi listă separată prin virgulă;
- `Item/BuyerOrderNumber` și `Item/UnitNetPrice` **lipsesc din toate cele 1524 de linii**;
- `QuantityReturned` mereu gol → lipsa = `expediat(7111) − QuantityAccepted`;
- produs: `BuyerItemID → CCCS1DXTRDRMTRL.CODE` (scopat pe TRDR). **GTIN nu se folosește ca cheie** —
  diferă de `MTRL.CODE1` pe 42 de linii;
- **liniile de palet se sar** (`/palet/i`, coduri `9200520`, `9200521`) — 39 în corpus, fără MTRL;
- `NumberOfDocuments` vine cu spații — trim.

**Reguli obligatorii de business:**
1. **Cumulare per aviz înainte de calculul diferenței** — 4 recepții sunt confirmate de mai multe
   fișiere. Procesate separat, ar genera două candidate `9221` pentru un singur eveniment fizic.
2. **`acceptat > expediat` este imposibil fizic → gardă dură, se rutează la om, niciodată auto.**
   Cauza reală sunt fișierele duplicate (`5017…` vs `4600…` pentru același aviz).
3. Rezolvare: cod aviz → reuniune cu comanda dacă e trunchiat → doar comandă (Auchan).
   Validat 101/101 documente, 1485/1485 linii de produs.

---

## 3. Arhitectura confirmată

| Decizie | Rezultat |
|---|---|
| RECADV devine document S1 (FINDOC)? | **Nu.** E o notificare, nu un document comercial al nostru |
| Se persistă? | **Da** — altfel re-descărcăm 100+ fișiere la fiecare trecere și re-aprindem flagul „citit" |
| Unde? | `CCCSFTPXML`, `EDIDOCTYPE='RECADV'`; payload parsat în `JSONDATA` |
| Tabele noi? | **Zero.** `A_IKA_RETANN*` / `A_TMP_EXPERT_RECADV` rămân dormante |
| Reconciliere | **La cerere**, nu persistată — răspunsul rămâne mereu proaspăt |
| Interogări în bloc | `STRING_SPLIT` + validare numerică strictă (`/^\d{1,15}$/`) |
| Ecran | Tab `receptions` **între** Comenzi și Facturi |
| Push din `EF.js` | **Parcat.** Hook pregătit pentru faza 2 |

### De ce se persistă (argumentul decisiv)
Dedup-ul se face pe `XMLFILENAME` interogând `CCCSFTPXML` **înainte** de download. Fără persistență,
scanner-ul re-descarcă tot folderul la fiecare 5 minute — exact comportamentul care a provocat
reclamația. În plus retenția FTP este necunoscută, iar fișierul e dovada comercială în caz de dispută.

### Push din `EF.js` (faza 2, nu acum)
Dacă se reia: `ON_AFTERPOST` (rulează **după** commit, deci nu poate periclita salvarea), gardă pe
`SALDOC.SERIES` + `TRDR`, `try/catch` care înghite orice. `X.HTTPCALL` este sincron și **fără
timeout**; `WinHttp.WinHttpRequest.5.1` are `SetTimeouts` și mod asincron, deci este alegerea mai
bună — cu `WaitForResponse` scurt, nu zero (altfel COM poate anula cererea). Id-ul se ia cu
`SALDOC.FINDOC > 0 ? SALDOC.FINDOC : X.NEWID`.

---

## 4. Fazele de implementare și modelul recomandat

Criteriul de alocare: **risc pentru producție și densitatea raționamentului**, nu numărul de linii.

| Fază | Conținut | Model recomandat | De ce |
|---|---|---|---|
| **F1** | Parser `parseRecadv` + fixturi | **Claude Sonnet 5** | Reguli multe, dar toate scrise; muncă mecanică pe format cunoscut |
| **F2** | Motor de reconciliere | **Claude Opus 5** | Cumulare per aviz, gardă `acceptat > expediat`, rezolvare în 3 trepte — logică de business cu consecințe financiare |
| **F3** | Chirurgie pe provider + scanner | **Claude Opus 5** | Atinge fluxul viu de ingestie; risc real de a rupe APERAK DocProcess |
| **F4** | AJS `RECADV.js` | **Claude Sonnet 5** | ES5 + SQL parametrizat; tipar clar de urmat, dar sensibil la injecție |
| **F5** | Serviciu Feathers | **Claude Haiku 4.5** sau **GPT-5.4 mini** | Boilerplate pur, se copiază un serviciu existent |
| **F6** | Tab frontend + componentă | **Claude Sonnet 4.6** | Lit + Bootstrap, tipar existent (`invoice-table.js`) |
| **F7** | Activare FTP live + validare | **Claude Opus 5** | Singurul pas ireversibil; atinge contul de producție |

> **Regulă de siguranță:** F3 și F7 nu se dau pe modele ieftine. F5 nu se dă pe Opus — e risipă.

---

### F1 — Parser RECADV *(Claude Sonnet 5)*

**Fișiere**
- `src/edi/providers/infinite.provider.js` — funcția `parseRecadv(xml)`
- `test/edi/fixtures/recadv/` — **director nou**, 3-5 fișiere reprezentative
- `test/edi/recadv-parser.test.js`

> **Capcană:** fixturile **nu** se pun în `test/edi/fixtures/infinite/**`. Arborele acela este copiat
> integral în rădăcina serverului FTP de test, iar `scanner.test.js` verifică numărători exacte de
> fișiere. Ar rupe teste fără legătură.

**Contract returnat**
```js
{
  documentNumber, buyerGln, trdr,
  orders: [],            // BuyerOrderNumber, despicat pe virgulă
  adviceRaw, adviceSuffixes: [], adviceTruncated: false,
  items: [{ buyerItemId, gtin, accepted, description, isPallet }],
  numberOfItems, numberOfDocuments
}
```

**Cazuri de acoperit:** Dedeman cu aviz complet · Auchan fără `DeliveryDocumentNumber` · aviz
trunchiat cu `/` · comenzi multiple · linii de palet marcate · `NumberOfDocuments` cu spații.

**Sursa fișierelor:** `documentatie/infinite_samples/recadv/` (101 fișiere).
**Se copiază anonimizat.** Folderul sursă este urmărit de git — **nu se comite conținut de producție.**

---

### F2 — Motor de reconciliere *(Claude Opus 5)*

**Fișier:** `src/edi/recadv-reconciler.js`, portat din `scripts/reconcile-recadv-vs-soft1.mjs`
(prototip validat pe tot corpusul).

**Diferențe obligatorii față de prototip:**
1. Interogările trec prin serviciile aplicației, nu prin `mcp-soft1` (unealtă de dezvoltare).
2. **Validare numerică impusă explicit** înainte de orice concatenare în SQL. Prototipul e sigur din
   întâmplare (regex-ul produce doar cifre) — asta nu se păstrează ca garanție.
3. Gruparea per aviz și garda `acceptat > expediat` devin cod testat, nu efecte secundare.

**Ieșire per recepție:** `clean` · `difference` (cu delta per linie) · `unresolved` ·
`blocked` (`acceptat > expediat`).

**Teste:** offline, pe fixturi + un strat SQL mock. Cazul `AEX-AE-053669` (16 + 4 față de 20
expediate) este testul obligatoriu pentru cumulare.

---

### F3 — Provider + scanner *(Claude Opus 5)*

**`src/edi/providers/infinite.provider.js`**
- se adaugă docType real `recadv`: `remoteSubdir('recadv') → '/recadv/'`, **fără filtru de prefix**
  (numele sunt numerice);
- **se desface** maparea greșită `aperak → /recadv/` și se scoate stub-ul `parseAperak` de pe
  Infinite, ca RECADV să nu poată ajunge niciodată în `CCCAPERAK`;
- **DocProcess păstrează `aperak` real** — nu se atinge.

**`src/edi/scanner.js`**
- `recadv` intră în bucla de docType-uri;
- **obligatoriu pe ramura cu dedup înainte de download** (`if (docType !== 'aperak')`). Altfel se
  re-descarcă ~200 de fișiere la fiecare trecere;
- inserare ca `CCCSFTPXML` cu `EDIDOCTYPE='RECADV'`, `JSONDATA` = payload parsat;
- rutare pe GLN → TRDR, **fail-closed**, reutilizând `insertRoutingErrorRow`;
- status terminal propriu (ex. `INGESTED`) — `NEW` înseamnă peste tot „de procesat" și ar fi derutant.

**Teste de regresie obligatorii:** APERAK DocProcess continuă să ajungă în `CCCAPERAK`; un fișier
RECADV deja prezent **nu** se re-descarcă; GLN necunoscut → rând de eroare de rutare.

---

### F4 — AJS `S1/JS/AJS/RECADV.js` *(Claude Sonnet 5)*

Modul nou (nu se umflă `JSRetailers.js`, deja la 34 de funcții).
Prima linie: `//Cod specific S1 - AJS`. **ES5 obligatoriu.**

| Funcție | Rol |
|---|---|
| `getAdvicesByCode(params)` | avize `7111` după ultimele 6 cifre din `FINCODE` |
| `getAdvicesByOrder(params)` | avize `7111` după `NUM04` |
| `getAdviceLines(params)` | linii + `CCCS1DXTRDRMTRL.CODE` + `MTRL.CODE1` |
| `getReceptionsData(params)` | listă paginată pentru ecran, cu starea de facturare |

**Reguli:**
- parametri legați (`X.GETSQLDATASET(sql, p1, ...)`), ca în `lookupFindoc`;
- liste în bloc: un singur parametru legat + `STRING_SPLIT`, **plus** validare `/^\d{1,15}$/` pe
  fiecare element înainte de trimitere;
- paginare identică cu `getInvoicesData`: `pageSize` plafonat la 100, `OFFSET/FETCH`,
  contract `{ success, data, total, page, pageSize }`;
- **date/ore:** `CONVERT(VARCHAR(19), <col>, 120)` — Soft1 serializează prost datetime-urile
  (ne-a costat deja o sesiune pe `CCCXMLSendDate`);
- starea de facturare = predicatul `TFPRMS = 103` din §2.1.

> **Deploy manual:** fișierul trebuie copiat în ERP → Customization tools → Advanced JavaScript
> Editor. Endpoint rezultat: `https://petfactory.oncloud.gr/s1services/JS/RECADV/<functie>`.
> Fără pasul ăsta nimic nu răspunde. Vezi thread-ul `ajs-erp-deploy`.

---

### F5 — Serviciu Feathers *(Claude Haiku 4.5 / GPT-5.4 mini)*

`src/services/recadv/{recadv.class.js,recadv.service.js}`, înregistrat în `src/services/index.js`.
Proxy subțire către AJS. Se copiază tiparul unui serviciu paginat existent. Test în
`test/services/recadv/`.

---

### F6 — Frontend *(Claude Sonnet 4.6)*

- `frontend/src/services/api.js` — intrare în harta `SERVICES` + helper `getReceptionsPaged()`
  lângă `getInvoicesPaged`;
- `frontend/src/pages/retailer-detail.js` — tab nou **între** `orders` și `invoices`
  (azi doar cele două, în jurul liniei 35);
- `frontend/src/components/reception-table.js` — după tiparul `invoice-table.js`
  (paginare, refresh, filtru de zile).

**Coloane:** dată · nr. document EDI · aviz · comandă · linii · **status reconciliere**
(conform / diferențe / nerezolvat / blocat) · **stare facturare** · acțiuni (vezi XML, vezi diferențe).

**Validare:** `npm --prefix frontend run build`.

---

### F7 — Activare live *(Claude Opus 5)*

**Doar după ce F1-F6 sunt gata și ecranul funcționează.**

1. Se verifică `EDI_DOWNLOAD_AGE_DAYS` (implicit 7). Fișierele din 20-29 iulie nu vor intra —
   **decizie asumată**, sunt deja facturate manual.
2. Prima rulare cu `--dry-run` dacă e posibil; altfel pe un singur retailer.
3. Se confirmă că dedup-ul funcționează: a doua trecere trebuie să descarce **zero** fișiere.
4. Se anunță beneficiarul că portalul nu mai e sursa de adevăr, ecranul îl înlocuiește.

---

## 5. Constrângeri valabile în toate fazele

- **Niciun `RETR`/`LIST` nou pe contul FTP de producție** până la F7.
- ES5 în `S1/JS/AJS/*.js`, prima linie `// Cod specific S1 - AJS`.
- **Nu se comite nimic din `documentatie/infinite_samples/`** — folderul e urmărit de git și
  conține payload-uri de producție.
- Fixturile de test **în afara** `test/edi/fixtures/infinite/**` și `.../docprocess/**`.
- Faza 1 este **read-only**: nu se scrie niciun document în Soft1.
- Nu se construiește contabilitate FIFO de disponibilitate — 27% din producție o încalcă.

## 6. Starea de plecare

- Commit `e52623ec` pe `feat/edi-safety-sftp-tests`, cu unul înaintea lui `origin`, **nepushat**.
- `npm test` — 53 de teste care trec.
- `JSRetailers.js` este actualizat local **și** în ERP.

## 7. Restanțe fără legătură, dar deschise

- **Rotația parolei Soft1 și a cheii RSA** — ambele sunt încă în istoricul git (commit `e52623ec` a
  curățat doar vârful). Restantă și urgentă.
- Numărul de ordine de retur pentru RETANN — se așteaptă RO-7627.
- Curățenia celor 92 de tabele vechi — necesită aprobarea beneficiarului, nimic șters.
