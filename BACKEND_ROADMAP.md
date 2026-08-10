# Backend Roadmap

> **STATUS: COMPLET (2026-08-10).** Migrarea knex → S1 AJS s-a incheiat: backendul nu mai are niciun acces direct MSSQL (`knex`, `mssql`, `knexfile`, `src/mssql.js` — eliminate), iar tunelul Fixie SOCKS a fost scos din `Procfile`, `package.json` si `bin/`. Cutover-ul de productie retailers1 → retailers4 a avut loc pe 2026-06-09; pasii de inchidere definitiva a retailers1 sunt in [documentatie/retailers1-shutdown-runbook.md](documentatie/retailers1-shutdown-runbook.md). Documentul de mai jos este pastrat ca istoric — tabelul retailers1(prod)/retailers4(dev) descrie situatia dinainte de cutover.

## Goal

Eliminarea accesului direct la MSSQL prin `knex` + Fixie SOCKS si mutarea accesului la date prin endpoint-uri S1 AJS, astfel incat backendul sa nu mai depinda de IP whitelist si de addon-ul Heroku pentru IP static.

## Current State

- [x] Exista infrastructura AJS in [S1/JS/AJS/JSRetailers.js](S1/JS/AJS/JSRetailers.js)
- [x] Exista deja endpoint AJS pentru incarcare comenzi: `getOrdersData`
- [x] Exista deja endpoint AJS pentru facturi: `getInvoicesData`
- [x] Exista deja endpoint AJS pentru lookup document: `lookupFindoc`
- [x] Exista deja endpoint AJS pentru log-uri comenzi: `getOrdersLog`
- [x] Frontendul foloseste deja serviciul Feathers [src/services/orders-data/orders-data.class.js](src/services/orders-data/orders-data.class.js), care apeleaza S1 AJS
- [x] Backendul inca porneste in Heroku prin Fixie, conform [Procfile](Procfile)
- [x] Backendul inca expune servicii directe pe `knex`, configurate prin [src/mssql.js](src/mssql.js)
- [x] SFTP scanner protejat cu `ENABLE_SFTP_SCANNER` env flag (default `false`, activat explicit doar unde este sigur)

## Direct DB Services Still To Migrate

- [x] `CCCSFTP`
- [x] `CCCSFTPXML`
- [x] `CCCAPERAK`
- [x] `CCCORDERSLOG`
- [x] `CCCRETAILERSCLIENTS`
- [x] `CCCXMLS1MAPPINGS`
- [x] `CCCDOCUMENTES1MAPPINGS`

## SFTP Scanner Safety

**Risc critic:** Fisierele EDI (comenzi, APERAK) dispar de pe serverul SFTP DocProcess imediat dupa download. Daca retailers4 (dev) le descarca inaintea retailers1 (prod), comenzile sunt pierdute definitiv pentru productie.

**Solutie implementata:** Environment variable `ENABLE_SFTP_SCANNER` in [src/app.js](src/app.js#L95). Scannerul este acum **opt-in**.

| Instanta | `ENABLE_SFTP_SCANNER` | Comportament |
|---|---|---|
| retailers1 (prod) | `true` | Scanner activ, descarca si proceseaza XML-uri la fiecare 30 min |
| retailers4 (dev) | `false` | Scanner dezactivat, nu atinge SFTP-ul |
| local dev | nesetat (default `false`) | Scanner dezactivat, nu atinge SFTP-ul pana la activare explicita |

**Setup Heroku:**
```bash
heroku config:set ENABLE_SFTP_SCANNER=false --app retailers4
heroku config:set ENABLE_SFTP_SCANNER=true --app retailers1
```

**Status:** protectia dev-vs-prod este mai stricta: orice instanta fara flag explicit ramane cu scannerul oprit dupa deploy/restart.

**Nota:** Scannerul poate fi activat temporar pe retailers4 doar pentru teste controlate, dar niciodata simultan cu retailers1 pe acelasi server SFTP.

## Target Architecture

1. Frontendul apeleaza Feathers services.
2. Feathers services nu mai citesc direct prin `knex`.
3. Feathers services apeleaza endpoint-uri S1 AJS din `JSRetailers.js` sau fisiere AJS dedicate.
4. AJS foloseste `X.GETSQLDATASET`, `X.SQL`, `X.RUNSQL`, `X.WEBREQUEST`, `X.WSCALL` in ERP.
5. Dupa migrare completa, `Fixie SOCKS`, `knex` pentru MSSQL si conexiunea directa la SQL devin inutile.

## Phase 0 - Freeze And Inventory

- [x] Inventariere a serviciilor care sunt deja migrate pe AJS
- [x] Confirmare ca `orders-data` este endpoint AJS functional si deja folosit
- [x] Confirmare lista completa de operatii CRUD pentru fiecare serviciu direct DB ramas
- [x] Marcarea in cod a serviciilor care trebuie scoase din `knex`

## Phase 1 - Standardize The AJS Access Pattern

Scop: toate serviciile noi migrate sa urmeze acelasi model ca `orders-data`, `invoices-data`, `lookup-findoc`.

- [x] Definire conventie unica pentru endpoint-uri AJS: `get*`, `save*`, `update*`, `delete*`
- [x] Definire format standard de raspuns AJS: `{ success, data, total, page, pageSize, error, message }`
- [x] Extrage helperi comuni in [S1/JS/AJS/JSRetailers.js](S1/JS/AJS/JSRetailers.js): convert dataset, error wrapper, pagination wrapper
- [x] Documenteaza manual workflow-ul de deploy in ERP Advanced JS Editor

## Phase 2 - Migrate Low-Risk Read Services

Scop: mutam mai intai serviciile de configurare si citire, cu risc mic.

- [x] Migrate `CCCRETAILERSCLIENTS` to AJS endpoint
- [x] Migrate `CCCDOCUMENTES1MAPPINGS` read operations to AJS endpoint
- [x] Migrate `CCCXMLS1MAPPINGS` read operations to AJS endpoint
- [x] Update backend Feathers service wrappers to call AJS instead of `knex`
- [x] Validate frontend config screens against AJS-backed services

## Phase 3 - Migrate Low-Risk Write Services

Scop: mutam operatiile de editare pentru mapping-uri si configurari.

- [x] Add AJS create/update/delete for `CCCDOCUMENTES1MAPPINGS`
- [x] Add AJS create/update/delete for `CCCXMLS1MAPPINGS`
- [x] Add AJS update for `CCCRETAILERSCLIENTS` only if still needed in UI/workflows
- [x] Preserve existing Feathers service contracts so frontend changes stay minimal
- [x] Verify create/edit/delete flows from frontend config pages

## Phase 4 - Migrate SFTP Configuration Layer

Scop: eliminam dependenta directa de tabela `CCCSFTP`.

- [x] Add AJS read endpoint for `CCCSFTP`
- [x] Add AJS update endpoint for `CCCSFTP`
- [x] Refactor service [src/services/CCCSFTP/CCCSFTP.class.js](src/services/CCCSFTP/CCCSFTP.class.js) to stop using `KnexService`
- [x] Retest flows that load SFTP configuration in backend and frontend

## Phase 5 - Migrate Operational Tables

Scop: mutam tabelele cu trafic operational real, unde exista cel mai mare impact si cel mai mare risc.

### CCCSFTPXML

- [x] Add AJS endpoint for paginated query/filter over `CCCSFTPXML`
- [x] Add AJS endpoint for insert into `CCCSFTPXML`
- [x] Add AJS endpoint for patch/update `CCCSFTPXML` fields like `FINDOC`
- [x] Add AJS endpoint for delete from `CCCSFTPXML`
- [x] Refactor backend service [src/services/CCCSFTPXML/CCCSFTPXML.class.js](src/services/CCCSFTPXML/CCCSFTPXML.class.js)
- [x] Validate order download, store, resend, link-to-FINDOC, delete flows end-to-end

### CCCAPERAK

- [x] Add AJS endpoint for create/query `CCCAPERAK`
- [x] Refactor Feathers service to stop using `KnexService`
- [x] Validate APERAK persistence and retrieval in invoice flows

### CCCORDERSLOG

- [x] Add AJS endpoint for insert in `CCCORDERSLOG`
- [x] Add optional batch insert endpoint if volume is high
- [x] Keep `getOrdersLog` / cleanup logic in AJS as single source of truth
- [x] Validate log volume and performance under normal batch processing

## Phase 6 - Remove Direct MSSQL Coupling

- [x] Remove service registrations that still require `app.get('mssqlClient')`
- [x] Remove MSSQL bootstrap from [src/mssql.js](src/mssql.js)
- [x] Remove `knex` usage for business data access
- [x] Reassess whether migrations are still needed for this app
- [x] Remove `mssql`, `tedious`, `knex`, `socks-proxy-agent` if no longer used

## Phase 7 - Remove Fixie Socks

Scop: doar dupa ce Phase 2-6 sunt complet validate.

- [x] Remove Fixie dependency from [Procfile](Procfile)
- [x] Remove local dev dependency on `fixie-wrench`
- [x] Remove any runtime checks or dashboards related to outbound static IP / Fixie
- [x] Update deployment notes and env vars
- [x] Verify Heroku startup without Fixie

## Acceptance Criteria

- [x] Niciun Feathers service de business nu mai foloseste `KnexService` pentru MSSQL operational data
- [x] Toate operatiile critice pentru comenzi, facturi, loguri, mapping-uri si configurari trec prin AJS
- [x] Aplicatia ruleaza local fara Fixie
- [x] Aplicatia ruleaza in Heroku fara Fixie
- [x] `orders-data`, `invoices-data`, `lookup-findoc`, `orders-log` raman functionale dupa standardizarea AJS

## Migration Notes

- Endpointurile din [S1/JS/AJS/JSRetailers.js](S1/JS/AJS/JSRetailers.js) trebuie copiate manual in ERP Advanced JS Editor pentru a deveni active.
- Strategia recomandata este strangler pattern: inlocuire serviciu cu serviciu, pastrand contractele Feathers stabile.
- `CCCSFTPXML` este piesa cea mai sensibila si nu trebuie atacata prima.
- `getOrdersData` este implementarea de referinta pentru serviciile AJS paginated read.

## Recommended Execution Order

- [x] 1. Standardize helperii si raspunsurile AJS
- [x] 2. Migrate `CCCRETAILERSCLIENTS`
- [x] 3. Migrate `CCCDOCUMENTES1MAPPINGS`
- [x] 4. Migrate `CCCXMLS1MAPPINGS`
- [x] 5. Migrate `CCCSFTP`
- [x] 6. Migrate `CCCAPERAK`
- [x] 7. Migrate `CCCSFTPXML`
- [x] 8. Migrate `CCCORDERSLOG`
- [x] 9. Remove MSSQL direct coupling
- [x] 10. Remove Fixie Socks