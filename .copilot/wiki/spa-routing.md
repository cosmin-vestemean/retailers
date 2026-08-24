# SPA routing

- Frontend SPA routes are served from `public/dist/index.html`.
- Refreshes for `/retailer/:trdr`, `/config/:trdr`, and `/logs` need server-side HTML fallback in
  `src/app.js`.
- `/retailer` conflicts with the Feathers retailer service path, so without the fallback a browser
  refresh on `/retailer/:id` returns 405 MethodNotAllowed instead of loading the SPA shell.
