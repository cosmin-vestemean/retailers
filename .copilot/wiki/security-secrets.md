# Security & secrets hygiene (Pet Factory / retailers)

## Rezolvat 2026-07-28 (commit e52623ec)

- Parola Soft1 `websitepetfactory` era in plaintext in **5 locuri**: `mcp-soft1/soft1-client.js`,
  `src/services/connect-to-s1/connect-to-s1.class.js` (fallback literal), `S1/SQL/migrations.sql`,
  `analiza/Sinteza Discutie - 3_16042025.md`, si `heroku-logs/*.txt`. Toate curatate la tip.
- `mcp-soft1/soft1-client.js` citeste acum din env, cu fallback pe `mcp-soft1/.env`
  incarcat via `process.loadEnvFile()` (Node 22, fara dependinte noi). `.env.example` versionat.
- `privateKey.txt` (cheie RSA, 1780 B) si `heroku-logs/` scoase din tracking cu
  `git rm --cached`; raman pe disc, sunt in `.gitignore`.

## ATENȚIE: rotația nu a fost făcută

Parola și cheia RSA sunt în **istoricul git** (cel puțin 6 commit-uri, `git log -S`),
deci sunt compromise pe orice clonă. Curățarea la tip NU le șterge din istoric.
Rotația parolei Soft1 + regenerarea cheii sunt **încă de făcut de utilizator**.
`CCCRETAILERSCLIENTS.WSPASS` din DB trebuie actualizat odată cu rotația.

## Capcane verificate

- `.gitignore` era **corupt cu octeți NUL** (fragmente UTF-16LE inserate la mijloc).
  Efect: regula `public/dist/` era inoperantă și artefactele de build au ajuns commitate.
  Editorul refuza fișierul ("seems to be binary"). Verifică cu
  `[IO.File]::ReadAllBytes('.gitignore') | Where-Object { $_ -eq 0 }`.
- `git check-ignore` **nu raportează fișiere deja tracked** decât cu `--no-index`.
  Dacă o regulă pare să nu prindă, verifică întâi dacă fișierul e tracked.
- **`public/dist/` trebuie să rămână versionat.** `Procfile` rulează doar `npm start`,
  nu există `heroku-postbuild` sau build script pentru frontend. Bundle-ul commitat
  ESTE frontend-ul din producție. Nu îl pune în `.gitignore`.
- `documentatie/infinite_samples/{recadv,retann}/` = 106 payload-uri reale de client.
  Acum ignorate. Subfolderele mai vechi (`orders`, `desadv_*`, `invoice_*`) rămân tracked.
- PowerShell **nu suportă heredoc** (`git commit -F - <<'EOF'` eșuează cu ParserError).
  Scrie mesajul într-un fișier temporar și folosește `git commit -F <fișier>`.
