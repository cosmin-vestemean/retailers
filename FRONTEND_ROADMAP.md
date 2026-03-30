# Frontend Rewrite Roadmap — Lit Elements

## Faza 0 — Fundație (setup + tooling)

- [x] Vite + Lit scaffold în `/frontend`
- [x] API Service Layer (`services/api.js`) — wrappează FeathersJS client
- [x] App State cu Lit Context (`state/app-context.js`)
- [x] Vaadin Router — 3 rute: `/`, `/retailer/:trdr`, `/config/:trdr`
- [x] Shared Bulma styles (`styles/shared-styles.js`)

## Faza 1 — Shell + Dashboard

- [ ] `<app-shell>` — layout, navbar, router outlet, login gate
- [ ] `<login-form>` — auth flow, emite `login-success`
- [ ] `<retailer-card>` — card cu logo, counters, link la detalii
- [ ] `<retailer-dashboard>` — grid de carduri, fetch-uri paralele
- [ ] `<notification-toast>` — toast reusable

## Faza 2 — Pagina detalii retailer

- [ ] `<orders-table>` — tabel cu sort/filter, acțiuni send/batch
- [ ] `<order-row>` — stare reactivă per rând (sending, sent, error)
- [ ] `<invoice-table>` — create XML, send, resend
- [ ] `<invoice-row>` — stare per factură incl. APERAK
- [ ] `<xml-viewer>` — shadow DOM, Prism.js encapsulat
- [ ] `<batch-progress>` — progress bar + log operații bulk
- [ ] `<data-source-toggle>` — switch S1/DB

## Faza 3 — Config & file manager

- [ ] `<retailer-config>` — parametri conexiune, integrator
- [ ] `<sftp-manager>` — upload/download SFTP, tracking
- [ ] `<xml-mapping-editor>` — mapping XML → S1 fields

## Faza 4 — Hardening

- [ ] Eliminare completă innerHTML (garantat de Lit templates)
- [ ] `<error-boundary>` — error catching per rută
- [ ] Teste cu `@open-wc/testing` + `@web/test-runner`
- [ ] Migrare opțională la TypeScript
