# Frontend Rewrite Roadmap — Lit Elements

## Faza 0 — Fundație (setup + tooling)

- [x] Vite + Lit scaffold în `/frontend`
- [x] API Service Layer (`services/api.js`) — wrappează FeathersJS client
- [x] App State cu Lit Context (`state/app-context.js`)
- [x] Vaadin Router — 3 rute: `/`, `/retailer/:trdr`, `/config/:trdr`
- [x] Shared Bulma styles (`styles/shared-styles.js`)

## Faza 1 — Shell + Dashboard

- [x] `<app-shell>` — layout, navbar, router outlet, login gate
- [x] `<login-form>` — auth flow, emite `login-success`
- [x] `<retailer-card>` — card cu logo, counters, link la detalii
- [x] `<retailer-dashboard>` — grid de carduri, fetch-uri paralele
- [x] `<notification-toast>` — toast reusable

## Faza 2 — Pagina detalii retailer

- [x] `<orders-table>` — tabel comenzi, send individual/batch, lookup FINDOC, XML viewer, download & store
- [x] `<invoice-table>` — tabel facturi, create XML, send/resend SFTP, mark sent, APERAK display, batch send
- [x] `<xml-viewer>` — collapsible viewer cu syntax highlighting
- [x] `<batch-progress>` — progress bar + log operații bulk
- [x] `<data-source-toggle>` — switch S1 API / Direct DB
- [x] `<retailer-detail>` — pagină cu tabs (Comenzi / Facturi), data source toggle

## Faza 3 — Config & file manager

- [ ] `<retailer-config>` — parametri conexiune, integrator
- [ ] `<sftp-manager>` — upload/download SFTP, tracking
- [ ] `<xml-mapping-editor>` — mapping XML → S1 fields

## Faza 4 — Hardening

- [ ] Eliminare completă innerHTML (garantat de Lit templates)
- [ ] `<error-boundary>` — error catching per rută
- [ ] Teste cu `@open-wc/testing` + `@web/test-runner`
- [ ] Migrare opțională la TypeScript
