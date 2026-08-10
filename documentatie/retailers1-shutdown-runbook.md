# Runbook: închiderea completă a aplicației Heroku `retailers1` (legacy)

Data analizei: 2026-08-10

## Context și verdict

- `retailers1` (build din branch `main`) este aplicația legacy: acces direct MSSQL prin Knex, printr-un tunel Fixie SOCKS care oferea IP fix, whitelistat în firewall-ul clientului.
- `retailers4` (auto-build din `feat/edi-safety-sftp-tests`) este producția de facto: totul trece prin web services HTTP către Soft1 AJS (`S1_BASE_URL`), fără acces direct la baza de date.
- **Cutover-ul a avut loc pe 2026-06-09** (release `v374` pe retailers1: `ENABLE_SFTP_SCANNER=false`; retailers4 activ cu `EDI_SCANNER=new`). De atunci `main` nu mai are commit-uri, iar tabelele staging legacy din Soft1 nu au mai primit niciun document.
- **Nu există nicio dependență retailers4 → retailers1**: niciun webhook, niciun apel inter-aplicații; frontend-ul se conectează la `window.location.origin`; Soft1 e mereu apelat, niciodată apelant.
- Domeniul `www.retailers.acct.ro` aparține aplicației hub (umbrela peste retailers4, PNL etc.), nu lui retailers1.

**Concluzie: retailers1 poate fi închis complet.** Singura resursă valoroasă legată de el este add-on-ul Fixie Socks (IP-ul fix whitelistat), care devine inutil odată cu abandonarea accesului direct la DB.

## Faza 0 — Pre-verificări (înainte de orice)

```bash
# 1. Confirmă că niciun domeniu custom nu e atașat la retailers1 (așteptat: doar *.herokuapp.com)
heroku domains --app retailers1

# 2. Vezi unde sunt add-on-urile (așteptat: Fixie Socks doar pe retailers1)
heroku addons --app retailers1
heroku addons --app retailers4

# 3. Dump final de config vars — MSSQL_*, FIXIE_SOCKS_HOST nu mai există nicăieri altundeva.
#    Păstrează fișierul într-un loc sigur (conține parole) — NU în git.
heroku config --app retailers1 > ~/retailers1-config-backup-$(date +%Y%m%d).txt

# 4. Confirmă că scannerul legacy e oprit (așteptat: false, setat la cutover-ul din 2026-06-09)
heroku config:get ENABLE_SFTP_SCANNER --app retailers1
```

Dacă apare ceva neașteptat (domeniu custom pe retailers1, Fixie atașat și la retailers4), oprește-te și clarifică înainte de a continua.

## Faza 1 — Oprire reversibilă (acum)

```bash
heroku ps:scale web=0 --app retailers1
heroku maintenance:on --app retailers1
```

Aplicația nu mai consumă dyno-uri și nu mai răspunde, dar poate fi repornită instant (`ps:scale web=1` + `maintenance:off`).

**Perioadă de grație: 2–4 săptămâni.** În acest interval monitorizează retailers4:
- login (JWT / Hub SSO) și dashboard;
- scan EDI la 5 minute (heartbeat `system/info` în orders-log);
- creare comenzi din ORDERS, trimitere facturi, download APERAK, RECADV/Recepții;
- bucket-ul DO `xml-edi-backup` rămâne gol în afara `retry/` tranzitoriu.

## Faza 2 — Ștergere definitivă (după perioada de grație)

> Atenție: pașii de mai jos sunt ireversibili. Ștergerea eliberează IP-ul fix Fixie și
> elimină definitiv calea de rollback documentată la cutover (reactivarea scannerului pe retailers1).

```bash
# numele exact al add-on-ului reiese din `heroku addons --app retailers1`
heroku addons:destroy <fixie-socks-addon-name> --app retailers1 --confirm retailers1-0691020d207c
heroku apps:destroy --app retailers1-0691020d207c --confirm retailers1-0691020d207c
```

(Înlocuiește numele aplicației cu cel real din `heroku apps` dacă diferă.)

## Faza 3 — Firewall-ul clientului (decizie separată)

IP-ul fix Fixie era whitelistat în firewall-ul clientului doar pentru accesul direct FeathersJS/Knex la SQL Server. După ștergere, anunță adminul de rețea că intrarea de whitelist poate fi eliminată — un model de email există în [email_socks_proxy_issue.md](email_socks_proxy_issue.md).

## Faza 4 — Verificări post-ștergere pe retailers4

- Deploy-ul curent (fără fixie-wrench în `Procfile`) pornește curat: `heroku logs --tail --app retailers4` la următorul release.
- Fluxurile funcționale de la Faza 1 rămân verzi.
- `npm run dev` local pe frontend folosește acum fallback-ul retailers4 (`frontend/vite.config.js`).

## Curățenia de cod aferentă (făcută în acest branch)

- `Procfile` → `web: npm start` (tunelul fixie-wrench eliminat; binarele din `bin/` șterse).
- `package.json`: scriptul `dev` fără fixie-wrench; dependențele moarte `socks-proxy-agent` și `mssql` eliminate.
- Serviciul de diagnostic `outbound-ip` (singurul consumator al `FIXIE_SOCKS_HOST`) eliminat.
- `config/default.json`: originea CORS retailers1 și blocul `mssql` mort (cu parolă în clar) eliminate; `config/custom-environment-variables.json`: mapările `MSSQL_*` eliminate.
- `frontend/vite.config.js`: fallback-ul dev arată spre retailers4.

## Note de securitate (rămân deschise după închidere)

- Parola MSSQL și `privateKey.txt` există în istoricul git (și pe branch-ul `main` încă în working tree). Ștergerea aplicației Heroku nu rezolvă asta.
- Recomandare: după eliminarea IP-ului din whitelist, rotește parola SQL a userului folosit de legacy și cheia RSA (thread deschis în `.copilot/context/open-threads.md`).
- Config vars din dump-ul de la Faza 0 conțin aceleași secrete — păstrează fișierul criptat/local, șterge-l când nu mai e nevoie.
