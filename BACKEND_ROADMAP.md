# Backend Roadmap

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
- [x] SFTP scanner protejat cu `ENABLE_SFTP_SCANNER` env flag (default `true`, setat `false` pe retailers4)

## Direct DB Services Still To Migrate

- [ ] `CCCSFTP`
- [ ] `CCCSFTPXML`
- [ ] `CCCAPERAK`
- [ ] `CCCORDERSLOG`
- [ ] `CCCRETAILERSCLIENTS`
- [ ] `CCCXMLS1MAPPINGS`
- [ ] `CCCDOCUMENTES1MAPPINGS`

## SFTP Scanner Safety

**Risc critic:** Fisierele EDI (comenzi, APERAK) dispar de pe serverul SFTP DocProcess imediat dupa download. Daca retailers4 (dev) le descarca inaintea retailers1 (prod), comenzile sunt pierdute definitiv pentru productie.

**Solutie implementata:** Environment variable `ENABLE_SFTP_SCANNER` in [src/app.js](src/app.js#L1365).

| Instanta | `ENABLE_SFTP_SCANNER` | Comportament |
|---|---|---|
| retailers1 (prod) | nesetat (default `true`) | Scanner activ, descarca si proceseaza XML-uri la fiecare 30 min |
| retailers4 (dev) | `false` | Scanner dezactivat, nu atinge SFTP-ul |
| local dev | nesetat (default `true`) | Scanner activ — **atentie** daca rulezi local cu SFTP real |

**Setup Heroku:**
```bash
heroku config:set ENABLE_SFTP_SCANNER=false --app retailers4
```

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
- [ ] Confirmare lista completa de operatii CRUD pentru fiecare serviciu direct DB ramas
- [ ] Marcarea in cod a serviciilor care trebuie scoase din `knex`

## Phase 1 - Standardize The AJS Access Pattern

Scop: toate serviciile noi migrate sa urmeze acelasi model ca `orders-data`, `invoices-data`, `lookup-findoc`.

- [ ] Definire conventie unica pentru endpoint-uri AJS: `get*`, `save*`, `update*`, `delete*`
- [ ] Definire format standard de raspuns AJS: `{ success, data, total, page, pageSize, error, message }`
- [ ] Extrage helperi comuni in [S1/JS/AJS/JSRetailers.js](S1/JS/AJS/JSRetailers.js): convert dataset, error wrapper, pagination wrapper
- [ ] Documenteaza manual workflow-ul de deploy in ERP Advanced JS Editor

## Phase 2 - Migrate Low-Risk Read Services

Scop: mutam mai intai serviciile de configurare si citire, cu risc mic.

- [ ] Migrate `CCCRETAILERSCLIENTS` to AJS endpoint
- [ ] Migrate `CCCDOCUMENTES1MAPPINGS` read operations to AJS endpoint
- [ ] Migrate `CCCXMLS1MAPPINGS` read operations to AJS endpoint
- [ ] Update backend Feathers service wrappers to call AJS instead of `knex`
- [ ] Validate frontend config screens against AJS-backed services

## Phase 3 - Migrate Low-Risk Write Services

Scop: mutam operatiile de editare pentru mapping-uri si configurari.

- [ ] Add AJS create/update/delete for `CCCDOCUMENTES1MAPPINGS`
- [ ] Add AJS create/update/delete for `CCCXMLS1MAPPINGS`
- [ ] Add AJS update for `CCCRETAILERSCLIENTS` only if still needed in UI/workflows
- [ ] Preserve existing Feathers service contracts so frontend changes stay minimal
- [ ] Verify create/edit/delete flows from frontend config pages

## Phase 4 - Migrate SFTP Configuration Layer

Scop: eliminam dependenta directa de tabela `CCCSFTP`.

- [ ] Add AJS read endpoint for `CCCSFTP`
- [ ] Add AJS update endpoint for `CCCSFTP`
- [ ] Refactor service [src/services/CCCSFTP/CCCSFTP.class.js](src/services/CCCSFTP/CCCSFTP.class.js) to stop using `KnexService`
- [ ] Retest flows that load SFTP configuration in backend and frontend

## Phase 5 - Migrate Operational Tables

Scop: mutam tabelele cu trafic operational real, unde exista cel mai mare impact si cel mai mare risc.

### CCCSFTPXML

- [ ] Add AJS endpoint for paginated query/filter over `CCCSFTPXML`
- [ ] Add AJS endpoint for insert into `CCCSFTPXML`
- [ ] Add AJS endpoint for patch/update `CCCSFTPXML` fields like `FINDOC`
- [ ] Add AJS endpoint for delete from `CCCSFTPXML`
- [ ] Refactor backend service [src/services/CCCSFTPXML/CCCSFTPXML.class.js](src/services/CCCSFTPXML/CCCSFTPXML.class.js)
- [ ] Validate order download, store, resend, link-to-FINDOC, delete flows end-to-end

### CCCAPERAK

- [ ] Add AJS endpoint for create/query `CCCAPERAK`
- [ ] Refactor Feathers service to stop using `KnexService`
- [ ] Validate APERAK persistence and retrieval in invoice flows

### CCCORDERSLOG

- [ ] Add AJS endpoint for insert in `CCCORDERSLOG`
- [ ] Add optional batch insert endpoint if volume is high
- [ ] Keep `getOrdersLog` / cleanup logic in AJS as single source of truth
- [ ] Validate log volume and performance under normal batch processing

## Phase 6 - Remove Direct MSSQL Coupling

- [ ] Remove service registrations that still require `app.get('mssqlClient')`
- [ ] Remove MSSQL bootstrap from [src/mssql.js](src/mssql.js)
- [ ] Remove `knex` usage for business data access
- [ ] Reassess whether migrations are still needed for this app
- [ ] Remove `mssql`, `tedious`, `knex`, `socks-proxy-agent` if no longer used

## Phase 7 - Remove Fixie Socks

Scop: doar dupa ce Phase 2-6 sunt complet validate.

- [ ] Remove Fixie dependency from [Procfile](Procfile)
- [ ] Remove local dev dependency on `fixie-wrench`
- [ ] Remove any runtime checks or dashboards related to outbound static IP / Fixie
- [ ] Update deployment notes and env vars
- [ ] Verify Heroku startup without Fixie

## Acceptance Criteria

- [ ] Niciun Feathers service de business nu mai foloseste `KnexService` pentru MSSQL operational data
- [ ] Toate operatiile critice pentru comenzi, facturi, loguri, mapping-uri si configurari trec prin AJS
- [ ] Aplicatia ruleaza local fara Fixie
- [ ] Aplicatia ruleaza in Heroku fara Fixie
- [ ] `orders-data`, `invoices-data`, `lookup-findoc`, `orders-log` raman functionale dupa standardizarea AJS

## Migration Notes

- Endpointurile din [S1/JS/AJS/JSRetailers.js](S1/JS/AJS/JSRetailers.js) trebuie copiate manual in ERP Advanced JS Editor pentru a deveni active.
- Strategia recomandata este strangler pattern: inlocuire serviciu cu serviciu, pastrand contractele Feathers stabile.
- `CCCSFTPXML` este piesa cea mai sensibila si nu trebuie atacata prima.
- `getOrdersData` este implementarea de referinta pentru serviciile AJS paginated read.

## Recommended Execution Order

- [ ] 1. Standardize helperii si raspunsurile AJS
- [ ] 2. Migrate `CCCRETAILERSCLIENTS`
- [ ] 3. Migrate `CCCDOCUMENTES1MAPPINGS`
- [ ] 4. Migrate `CCCXMLS1MAPPINGS`
- [ ] 5. Migrate `CCCSFTP`
- [ ] 6. Migrate `CCCAPERAK`
- [ ] 7. Migrate `CCCSFTPXML`
- [ ] 8. Migrate `CCCORDERSLOG`
- [ ] 9. Remove MSSQL direct coupling
- [ ] 10. Remove Fixie Socks