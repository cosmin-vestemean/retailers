# Onboarding a new DocProcess retailer

Error: "no active retailer match for GLN" (or "no active DocProcess retailers"). Comes from
`src/edi/scanner.js` `resolveInsertSftpRow`: candidates = TRDR_RETAILER list from `CCCSFTP` rows
with `EDIPROVIDER=docprocess`; GLN is looked up in `TRDBRANCH` restricted to those candidates.
"no active DocProcess retailers" = candidates empty; "no active retailer match" = candidates
non-empty but GLN doesn't belong to any of them (i.e. the retailer's own `CCCSFTP` row is simply
missing).

## Runbook: onboard a retailer already present in TRDR (SODTYPE=13, ISACTIVE=1) but failing routing

1. `TRDBRANCH.CCCS1DXGLN` must hold the incoming GLN for that TRDR/BRANCH (check first — may
   already be set from a prior integration attempt on a *different* TRDR of a similarly-named
   entity; don't assume by name, verify by GLN).
2. `CCCSFTP` needs a row for that TRDR_RETAILER, EDIPROVIDER=1 (docprocess). All existing
   docprocess retailers share the IDENTICAL URL/PORT/USERNAME/PASSPHRASE/FINGERPRINT/PRIVATEKEY/
   INITIALDIRIN/INITIALDIROUT (one shared SFTP drop folder, GLN in the XML does the routing) —
   copy via `INSERT ... SELECT ... FROM CCCSFTP WHERE TRDR_RETAILER=<existing>` rather than
   hardcoding the private key/passphrase inline (avoid re-echoing secrets in chat/SQL text).
3. `CCCDOCUMENTES1MAPPINGS` needs an ORDER/INBOUND row (SOSOURCE=1351, FPRMS=701, SERIES=7012,
   XML_ROOT_PATH=/Order, HEADER_PATH=/Order, LINES_PATH=/Order/OrderLine) — both IDs
   (CCCDOCUMENTES1MAPPINGS, CCCXMLS1MAPPINGS) are IDENTITY, capture via SCOPE_IDENTITY().
4. `CCCXMLS1MAPPINGS` needs 7 child field rows per retailer (copied from an existing retailer's
   ORDER mapping, e.g. id 34 = Supeco 78631) — 2 of them are SQL_TRANSFORM lookups with the
   retailer's own TRDR **hardcoded inline** in the SQL/TRANSFORMATION_PARAMS text
   (`trdbranch where trdr=<X> and cccs1dxgln=...` and `cccs1dxtrdrmtrl where trdr=<X> and code=...`)
   — must substitute per new retailer, not copy verbatim.
5. Separately, `CCCS1DXTRDRMTRL` (retailer product-code -> MTRL map, no COMPANY column) must be
   populated for the new TRDR or order lines won't resolve MTRL — this is real client data, can't
   be fabricated; flag as a follow-up if empty/sparse.

Notes:
- None of CCCSFTP/CCCDOCUMENTES1MAPPINGS/CCCXMLS1MAPPINGS/TRDBRANCH/CCCS1DXTRDRMTRL have a
  COMPANY column — no company filter needed on these.
- The `soft1-petfactory` MCP `run_sql` tool is READ-ONLY BY DESIGN (blocks non-SELECT/WITH) —
  prepare INSERT/UPDATE scripts for the user to run via Soft1 Database Explorer instead of trying
  to execute them.
- Frontend retailer list is a static array `RETAILERS` in
  `frontend/src/state/app-context.js` (`{trdr, name, logo}`) — separate from all the above ERP
  config, purely cosmetic/display, safe to edit directly.

## IMPORTANT: never auto-add a missing GLN to TRDBRANCH (user correction 2026-08-10)

- A GLN appearing in an inbound "no active retailer match" error is just a delivery point the
  retailer's EDI system SENT an order for — it is NOT proof Pet Factory has an actual supply
  contract for that store/warehouse. Inserting it into `TRDBRANCH.CCCS1DXGLN` is a **business
  decision**, not a technical one, and effectively auto-accepts future orders from that location.
- When a retailer's GLN already exists in `TRDBRANCH` (e.g. EMAG 69999, REWE 78991), that's fine to
  reuse/wire up (CCCSFTP + mapping rows) since the entity was already onboarded before. But for a
  genuinely NEW/unmapped GLN (e.g. Sezamo 126888 had none), do NOT propose or run the
  `UPDATE TRDBRANCH SET CCCS1DXGLN=...` yourself — leave the row in "Erori rutare" and tell the user
  it needs business confirmation of an active contract first.
