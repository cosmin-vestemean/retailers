---
applyTo: "**"
---

# Model Policy

## Principiu

- Obiectivul este modelul *potrivit* pentru sarcină, nu cel mai ieftin. Optim = capacitate suficientă la context minim necesar.
- Modelul NU se schimbă singur în timpul sesiunii. Această policy face agentul „aware": el semnalează când modelul activ nu se potrivește; comutarea efectivă o faci tu din model picker sau prin invocarea/handoff-ul unui agent cu `model:` în frontmatter.

## Model Map (sursa unică de adevăr)

Rolurile sunt stabile; modelele concrete se schimbă DOAR în acest tabel. Array-urile `model:` din `.github/agents/*.agent.md` trebuie ținute aliniate la el (poți folosi promptul `set-models` dacă există).

| Rol | Model | Folosit de |
|-----|-------|-----------|
| `planning` | Claude Opus 4.8 | agent `Plan` |
| `implementation` | Claude Sonnet 4.6 | agent `Implement` |
| `db-explore` | Claude Sonnet 4.6 | agent `DB Explore` |
| `mechanical` | Claude Haiku 4.5 | agent `Mechanical` |
| `review` | Claude Opus 4.8 (context mic) | agent `Review` |

## Maparea sarcină → rol

- Planificare / arhitectură / decizii ireversibile → rol **`planning`**.
- Implementare multi-fișier / refactor pe mai multe module → rol **`implementation`**.
- Explorare schemă DB / testare live S1 (read-only + dry-run `setData` în mediul de test) → rol **`db-explore`**.
- Task izolat / boilerplate / edit mecanic / rename / scaffold → rol **`mechanical`**.
- Validare / review output / verificare diff → rol **`review`** (sesiune nouă focalizată, context mic, NU sesiunea lungă de implementare).

## Garda generală (se evaluează la începutul fiecărei sarcini)

- Clasifică sarcina pe rol și compară cu modelul activ (vezi Model Map). Dacă diferă, semnalează scurt: „Sarcină <rol> → recomand <model din Model Map>".
- Salt în sus (spre `planning`/`review` = Opus): propune comutarea și așteaptă confirmarea înainte de muncă scumpă.
- Coborâre (`mechanical`): propune comutarea spre modelul ieftin, dar nu bloca execuția.
- Nu rămâne pe modelul de `planning` pentru execuție mecanică; nu face arhitectură/decizii ireversibile pe modelul `mechanical`.

## Garda de context (sesiune lungă)

- Lungimea sesiunii este un semnal în sine: contextul devine zgomotos, iar costul și latența cresc neliniar. Tratează lungimea, nu doar conținutul.
- Prag de igienă: când sesiunea a acoperit mai multe sub-obiective sau a depășit o fază de lucru, propune `session-handoff` (snapshot) + sesiune nouă, în loc să continui pe context umflat.
- Pentru review/validare pornește o sesiune nouă pe Opus context mic; nu reutiliza sesiunea de implementare (evită „forgetting yourself on Opus").
- Dacă suprafața de context a crescut din abstracții sau fire deschise inutile, propune `session-compress` înainte de a continua.

## Plan mode

- Când produci un plan de execuție (todo list), clasifică fiecare pas pe rol (`planning` / `implementation` / `mechanical` / `review`) și adnotează-l cu modelul din Model Map, ex: `- [ ] Refactor modul X (model: Claude Sonnet 4.6)`.
- **Grupează pașii pe model**, în loc să intercalezi roluri — minimizezi numărul de comutări. Emite explicit secvența de handoff-uri pe grupuri, ex: „Grup 1 — Implement (pași 1-4); Grup 2 — Mechanical (pași 5-6); Grup 3 — Review (pas 7)".
- Secvența de grupuri devine sursa de adevăr pentru comutările de model în execuție: fiecare grup = un handoff către agentul cu modelul potrivit.
