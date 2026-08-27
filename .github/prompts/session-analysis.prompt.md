# Session Quality Analysis

## Input

Analizează sesiunea din fișierul JSON atașat la acest prompt sau din calea furnizată de utilizator.
Fișierul urmează formatul de export VS Code Copilot Chat (`.copilot-sessions/`).

Dacă structura JSON diferă de cea așteptată (câmpuri lipsă, format schimbat, entries goale), raportează discrepanțele și continuă analiza cu câmpurile disponibile.

## Context obiectiv

Citește `.copilot/context/current-focus.md` înainte de analiză. Secțiunile **Current Goal**, **Active Area** și **Open Questions** definesc obiectivul urmărit cross-sesiune. Folosește-le ca ancoră pentru a clasifica devierile și firele deschise (vezi metrica 7).

Dacă `current-focus.md` nu există sau e gol, tratează sesiunea ca autonomă (fără obiectiv extern).

## Index conversație

Din `requests[]`, construiește un index compact:
- promptul utilizatorului: `requests[N].message.text`
- răspunsul Copilot: primul `requests[N].response[].value` cu text non-gol

Nu reconstrui conversația complet. Emite un tabel index:

| # | Primele 15 cuvinte prompt | Tip (acțiune / analiză / confirmare / social) | Model |
|---|---------------------------|------------------------------------------------|-------|

Numerotează de la 1 în ordinea din array, ignoră eventualele goluri.
Extrage modelul din `requests[N].modelId` (ex: `copilot/claude-opus-4.6` → `claude-opus-4.6`).

## Prag de sesiune minimă

Dacă sesiunea are sub 5 request-uri, emite doar tabelul sumar și o observație de 2-3 rânduri. Nu detalia per metrică.

## Metrici

### Bloc A — Analiza traiectoriei (devieri + clasificare + reveniri)

Analizează traiectoria sesiunii o singură dată. Identifică fiecare discontinuitate și clasifică-o:

- **Deviere** — subiectul se schimbă față de obiectivul principal. Clasifică imediat: **fertilă** (produce insight sau acțiune utilă pe termen lung), **sterilă** (nu produce nimic), sau **[?]** (nu poți decide fără context suplimentar).
- **Revenire reparatorie** — sesiunea se întoarce la un subiect anterior pentru a repara o eroare, omisiune sau implementare incompletă. Distinctă de deviere: nu schimbă subiectul, ci îl reia din cauza unei greșeli. Nu număra rafinările normale.

Raportează separat: nr. devieri totale, nr. fertile / sterile / [?], nr. reveniri reparatorii.

### Bloc B — Metrici individuale

**2. Fraternizare / căutare de validare**
Schimburi pur sociale: nici informație nouă, nici acțiune ulterioară. Include cereri de aprobare / reconfirmare fără conținut. Confirmările scurte care declanșează acțiune (`da`, `vreau`, `continuă`) nu sunt fraternizare.

**3. Fragmentare tematică**
Estimează numărul de clustere tematice. 1-2 = coerent, peste 3 = fragmentat.

**4. Fracție semnal/zgomot (derivată)**
Calculează pe baza celorlalte metrici:
`zgomot = fraternizare + devieri_sterile + reveniri_reparatorii`
`semnal = total_request-uri − zgomot`
`fracție = semnal / total_request-uri`
Nu estima independent — folosește valorile deja numărate.

**5. Povară de pilotaj impusă utilizatorului**
De câte ori utilizatorul a trebuit să corecteze direcția, să ceară reverificare sau să readucă agentul la task?

**6. Rată de transformare în acțiune**
Câte request-uri duc la acțiune concretă versus analiză pură? Acțiune = editare efectivă, execuție, verificare, sau cerere explicită de procedare. Analiza pură și deciziile negative (de a nu face ceva) nu sunt acțiune. Raportează aproximativ în procente.

**7. Fire deschise la final**
Listează explicit subiectele rămase deschise sau parțial rezolvate. Clasifică fiecare fir:
- **pe obiectiv** — legat direct de goal-ul din `current-focus.md`
- **tangențial** — subiect util dar în afara scopului urmărit
- **neclar** — nu poți decide fără context suplimentar

Dacă nu există fire deschise, spune explicit.

**8. Calitatea închiderii**
Evaluează finalul: **închisă curat**, **parțial închisă**, sau **deschisă / ambiguă**. Justifică scurt pe baza ultimelor request-uri.

## Reguli de evaluare

- Fii conservator: nu supra-număra devierile sau fraternizarea.
- Ancorează observațiile în request-uri concrete, nu în impresii generale.
- Nu număra același request în mai multe categorii de zgomot.

## Benchmarkuri orientative

| Metrică | Bine | Acceptabil | Problematic |
|---------|------|------------|-------------|
| Devieri de la subiect | 0–1 | 2–3 | >3 |
| Fraternizare | 0 | 1–2 | >2 |
| Semnal/zgomot | >80% | 60–80% | <60% |
| Povară de pilotaj | 0–1 | 2–3 | >3 |
| Reveniri reparatorii | 0 | 1 | >1 |

Folosește aceste praguri pentru a ancora evaluarea, nu ca reguli rigide.

## Format raport

### Modele utilizate

Listează modelele distincte din sesiune și intervalul de request-uri pentru fiecare:

| Model | Request-uri |
|-------|-------------|
| model-name | #X–#Y |

Dacă sesiunea folosește un singur model, o singură linie e suficientă.
Dacă modelul se schimbă mid-session, notează punctul de schimbare — poate corela cu variații de calitate.

### Sumar

| Metrică | Valoare | Benchmark |
|---|---|---|
| Devieri de la subiect | N | 0–1 / 2–3 / >3 |
| Divagări fertile / sterile / [?] | N / N / N | — |
| Reveniri reparatorii | N | 0 / 1 / >1 |
| Schimburi cu fraternizare | N | 0 / 1–2 / >2 |
| Clustere tematice | N | — |
| Fracție semnal/zgomot | X% | >80 / 60–80 / <60 |
| Povară de pilotaj impusă utilizatorului | N | 0–1 / 2–3 / >3 |
| Rată de transformare în acțiune | ~X% | — |
| Fire deschise la final | N (pe obiectiv / tangențiale / neclare) | — |
| Calitatea închiderii | etichetă | — |

### Detalii per metrică

Pentru fiecare metrică, 2-4 rânduri de observații concrete: request, pattern, impact.

### Catalogare manuală necesară

Pentru fiecare deviere marcată `[?]`, pune explicit întrebarea:
> Deviere la request #N — „[primele cuvinte ale promptului]" — aceasta este o divagare **fertilă** (ai învățat ceva util) sau **sterilă**?

### Actualizare open-threads

Dacă analiza a identificat fire deschise tangențiale sau neclare:

1. **Afișează** fiecare thread candidat într-un tabel numerotaț cu structura:

   | # | Thread | Categorie | Context |
   |---|--------|-----------|---------|
   | 1 | [descriere scurtă] | tangențial / neclar | [1-2 propoziții] |

2. **Întreabă utilizatorul** care thread-uri dorește adăugate, folosind tool-ul de întrebări cu opțiuni multi-select (un checkbox per thread + opțiunea „Niciunul"). Nu adăuga nimic fără confirmare explicită.

3. **În aceeași interacțiune**, include o a doua întrebare separată cu un singur checkbox de confirmare: „Verifică în cod live dacă aceste thread-uri sunt deja rezolvate înainte de append". Rulează această verificare numai dacă checkbox-ul este bifat.

4. **Dacă checkbox-ul este bifat**, verifică în codul live, concret, fiecare thread selectat înainte de append. Caută în workspace-ul activ implementări, cleanup-uri, teste sau modificări recente care arată că thread-ul este deja rezolvat. Nu trata documentația sau sumarul sesiunii ca dovadă suficientă fără confirmare în codul activ. Raportează concis rezultatul verificării pentru fiecare thread selectat și nu propune append pentru thread-urile deja rezolvate.

5. **După confirmare** și, dacă a fost cerută, după verificarea live, scrie efectiv doar thread-urile rămase valide în `.copilot/context/open-threads.md` — append la finalul fișierului, ca bloc YAML fenced cu structura:

   ```yaml
   - thread: "[descriere scurtă]"
     source_session: "[data sesiunii sau ID-ul fișierului JSON]"
     category: tangențial | neclar
     context: "[1-2 propoziții de context]"
   ```

   Dacă `.copilot/wiki/` există în acest workspace și thread-ul se leagă de un subiect deja
   acoperit de o pagină wiki, ține `context` scurt (1-2 propoziții, suficient să decizi dacă
   merită reluat) și adaugă un link către pagina relevantă (`vezi [topic.md](../wiki/topic.md)`)
   în loc să repeți detaliul lung inline — pagina wiki e sursa de adevăr pentru fapte durabile,
   `open-threads.md` e doar un pointer către un fir neterminat. Dacă niciun subiect din wiki nu
   se potrivește, scrie contextul inline ca până acum.

   Nu duplica thread-uri care există deja în fișier.

6. Dacă toate firele deschise sunt **pe obiectiv**, nu propune append — ele aparțin de `current-focus.md`, nu de backlog. Spune explicit „Toate firele deschise sunt pe obiectiv — nimic de adăugat în open-threads."

### Sugestii de prompting

Maxim 3–5 sugestii concrete, ancorate în request-uri din sesiune. Reguli:

- Diferențiază clar între **prompt sub-optimal al utilizatorului** și **eroare de implementare a agentului**. Erorile agentului nu sunt probleme de prompting — nu le include.
- Fiecare sugestie referă un request specific și propune o alternativă concretă.
- Formulare neutră: „alternativă posibilă", nu „ar fi trebuit să".
- Nu emite sfaturi generice de prompting. Dacă nu există sugestii ancorate în sesiune, scrie explicit „Nicio sugestie — prompting-ul din sesiune a fost adecvat."
