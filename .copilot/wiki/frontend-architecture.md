# Frontend architecture (Pet Factory retailers)

**Current architecture, verified 2026-08-24 by inspecting `frontend/src/` directly** — the SPA was
fully rewritten at some point after the notes this page previously carried were taken; the old
description was stale (see "Superseded" at the bottom).

## Stack

- **Lit 3** web components (`lit`), rendered into **light DOM** (not Shadow DOM) via a shared
  `LightElement` base class (`frontend/src/light-element.js`), so one global stylesheet controls
  the whole app instead of per-component style encapsulation.
- **Tabler** (`@tabler/core`) as the CSS/UI framework — not Bulma (that was the old SPA).
- **@vaadin/router** for client-side routing.
- **Vite** for dev/build (`vite`, `vite build`), **Vitest** + `happy-dom` for tests
  (`npm --prefix frontend run test`).
- **@feathersjs/client** over `socket.io-client` for the backend connection.

## File structure

```
frontend/src/
  main.js              - entry point: imports global CSS, initializes theme, registers <app-shell>
  light-element.js      - LightElement base class (light-DOM rendering)
  routing/ui-routes.js   - UI_ROUTES map + URL helper functions (single source of truth for paths)
  services/
    api.js               - centralized Feathers client + service registry; NO component may
                           import the feathers client directly, everything goes through here
    s1-queries.js         - S1 SQL query string builders used by api.js callers
  state/app-context.js    - shared app state (retailer list/cards etc.), likely via @lit/context
  components/            - reusable custom elements (tables, editors, widgets)
  pages/                  - route-level custom elements (one per URL)
  styles/                 - global-styles.css + theme-manager.js
```

## Routes (`routing/ui-routes.js`)

All under `/app`: `dashboard` (`/app`), `retailer` (`/app/retailer/:trdr`),
`config` (`/app/config/:trdr`), `logs` (`/app/logs`), `doStorage` (`/app/do`),
`routingErrors` (`/app/routing-errors`). See also [spa-routing.md](spa-routing.md) for the
server-side fallback needed so deep links work on refresh.

## Pages (`frontend/src/pages/`)
- `retailer-dashboard.js` — the `/app` dashboard, retailer cards.
- `retailer-detail.js` — the `/app/retailer/:trdr` tabs (Comenzi / Recepții / Facturi / …), the
  main per-retailer working screen. `RECADV_RETAILERS` gate and `INVOICE_SERIES` map live here —
  see [reception-screen.md](reception-screen.md).
- `retailer-config.js` — connection/mapping configuration per retailer.
- `logs-page.js` — orders/system log viewer.
- `do-storage-page.js` — DigitalOcean Spaces buffer status/retry UI (`/app/do`).
- `routing-errors-page.js` (+ its own test) — DocProcess routing-error triage UI
  (`/app/routing-errors`), see
  [edi-pipeline-architecture.md](edi-pipeline-architecture.md#docprocess-shared-inbox-routing).

## Components (`frontend/src/components/`)
- `app-shell.js` — top-level shell/nav, mounted by `main.js`.
- `orders-table.js`, `orders-log-table.js` — orders list + operational log.
- `invoice-table.js` — invoice list, Create XML / Send / Resend, APERAK status display.
- `reception-table.js` — RECADV reception list (Recepții tab); see
  [reception-screen.md](reception-screen.md).
- `doc-mappings-editor.js`, `xml-mapping-table.js` — `CCCDOCUMENTES1MAPPINGS`/
  `CCCXMLS1MAPPINGS` admin editors.
- `xml-viewer.js` — shared XML pretty-printer/viewer (modal or inline).
- `connection-settings.js` — SFTP/FTP connection config form.
- `data-source-toggle.js`, `scan-status.js`, `batch-progress.js`, `notification-toast.js`,
  `login-form.js`, `retailer-card.js` — smaller shared widgets.

## Service layer (`services/api.js`)

Single Feathers client, configured once, with an explicit `SERVICES` registry mapping service name
-> allowed methods (defaults to full CRUD if unspecified). Backend URL resolves from
`VITE_BACKEND_URL` or falls back to `window.location.origin`, so every Heroku app (`retailers1`,
`retailers4`, …) connects to its own backend with no hardcoded URL. Notable registered services:
`edi` (scanNow/scanPeriodically/stop), `CCCSFTPXML` (incl. custom `claim`/`pending`/
`resolveRouting`), `recadv`, `orders-data`, `invoices-data`, `mark-invoice-sent`, `edi-orders`,
`edi-invoices`, `edi-aperaks`, `do-storage` (status/list/get/retry/remove). This is the layer that
replaced all direct `client.service(...)` calls that used to live inside UI components.

## Testing

`npm --prefix frontend run test` (Vitest, `happy-dom`). Component tests exist alongside their
source (e.g. `pages/routing-errors-page.test.js`).

## Superseded: old vanilla-JS Bulma SPA (historical, code removed)

An earlier SPA (`client.js`, `retailers.js`, `retailer.js`, `invoiceTable.js`, `orderTable.js`,
plus `index.html`/`retailer_file_manager.html`/`retailer_config.html`) used Bulma CSS, direct
`client.service(...)` calls scattered across modules, and no test coverage. It has been **fully
replaced** by the architecture above — none of those files remain in the repo. Do not use that
description (private class fields on a `Retailer` class, `feathersjs-client.js` module, etc.) to
reason about current behaviour; it is preserved only as history in case old commits are examined.

## See also
- [spa-routing.md](spa-routing.md) — server fallback routing for the SPA.
- [reception-screen.md](reception-screen.md) — the largest single feature built on this frontend.
