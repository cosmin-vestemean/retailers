# Current Focus

## Last Updated 

- Session: DigitalOcean Spaces XML backup/retry planning for retailers4

## Current Goal

- **Next feature: do not lose any inbound EDI XML on Heroku ephemeral storage.** Target app is `retailers4` only; `retailers4` is planned to replace `retailers1`.
- `retailers4` Heroku config vars verified 2026-06-09: `DO_BUCKET=xml-edi-backup`, `DO_ACCESS_KEY` set, `DO_SECRET_KEY` set, `DO_ENDPOINT=https://fra1.digitaloceanspaces.com`.
- Signed DigitalOcean Spaces list test from local tooling succeeded against `xml-edi-backup` with HTTP 200, region `fra1`, key count 0.
- Cutover active 2026-06-09: `retailers1` scanner is disabled (`ENABLE_SFTP_SCANNER=false`, Heroku release `v374`). `retailers4` scanner is active (`ENABLE_SFTP_SCANNER=true`, `EDI_SCANNER=new`, `DO_RETRY_INTERVAL_MS=300000`, Heroku release `v83`). DO bucket `xml-edi-backup` was accessible immediately before cutover and `retry/` was empty (`retryTotal=0`).
- Implemented 2026-06-09: `@aws-sdk/client-s3` DO client + `do-storage` Feathers service; scanner backs up downloaded XML to DO only until `CCCSFTPXML.create` succeeds, then deletes the DO object. If insert into S1 fails, the object is moved/written under `retry/db-insert/...`; `DO_RETRY_INTERVAL_MS` starts a retry loop that re-inserts retry objects into `CCCSFTPXML` and deletes them from DO on success.
- UI implemented: `/app/do` route and navbar link `DO` after `Logs`; page shows bucket status, object list, XML view, manual retry, and delete.
- Validation 2026-06-09: `npm test` passes (31 tests); `npm --prefix frontend run build` passes; new SDK client status against real `retailers4` DO vars returns `accessible=true`, `retryObjects=0`.
- Live DO retry validation 2026-06-09 against `PetFactoryTEST` was run locally with `S1_BASE_URL=https://dev-petfactory.oncloud.gr/s1services` because Heroku `retailers4` still points `S1_BASE_URL` to production (`http://petfactory.oncloud.gr/s1services`). Test files were uploaded to real DO `retry/`, reinserted into `PetFactoryTEST.dbo.CCCSFTPXML`, deleted from DO, then processed to S1 docs: Mega `CCCSFTPXML=7166` -> `FINDOC=2135474`, `FINCODE=CKEY-00059788`, 1 line qty 6000; Auchan `7167` -> `2135475`, `CKEY-00059789`, 1 line qty 1152; Dedeman `7168` -> `2135476`, `CKEY-00059790`, 17 lines qty 633. Final DO `retry/` list is empty. `npm test` passes after the live test.
- Follow-up 2026-06-09: rows `7166..7168` had `FINDOC.NUM04=0` because the manual test changed EDI order numbers to alphanumeric `DORETRY...` values while `NUM04` is numeric. The DO retry test was rerun with numeric-only order numbers: Mega `CCCSFTPXML=7169` -> `FINDOC=2135477`, `FINCODE=CKEY-00059791`, `NUM04=1781013667106`, qty 6000; Auchan `7170` -> `2135478`, `CKEY-00059792`, `NUM04=1781013667117`, qty 1152; Dedeman `7171` -> `2135479`, `CKEY-00059793`, `NUM04=1781013667128`, qty 633. Final DO `retry/` list is empty; affected tests pass.
- Fix found during live validation: `src/services/CCCSFTPXML/CCCSFTPXML.class.js` strips the XML declaration before `createSftpXml` to avoid SQL Server XML parsing error `unable to switch the encoding`; `src/services/CCCSFTPXML/CCCSFTPXML.shared.js` now registers custom methods `claim` and `pending` used by the real scanner.
- Cutover attempt 2026-06-09: `main` switch commit `7e22ad0d` was deployed to `retailers1` as Heroku release `v371`; cutover was executed (`retailers1` off, `retailers4` on) but immediately rolled back after `retailers4` attempted to insert `ORDERS_*.pdf` files as XML. Current state after rollback: `retailers1` release `v373` with legacy scanner enabled; `retailers4` release `v78`, scanner disabled and retry loop disabled. Root cause fixed in `src/edi/scanner.js` commit `8a0cdc51`: scanner now accepts only `.xml`/`.confirm` files after prefix matching; `test/edi/scanner.test.js` adds a PDF guard case. `npm test -- --grep "EDI scanner against local ftp-srv"` invocation actually ran the full suite, 31 passing. `.main-worktree` commit `d197f38d` updates scripts/docs so cutover sets `DO_RETRY_INTERVAL_MS=300000` and rollback sets `DO_RETRY_INTERVAL_MS=0`.
- Duplicate order guard 2026-06-09: investigation found `NUM04=1833989` had two active order `CKEY` docs for Carrefour (`2123739` and duplicate `2144880`). `src/edi/order-sender.js` commit `6020d36f` now checks S1 for existing active order by `TRDR + NUM04 + SOSOURCE=1351 + FPRMS=701 + ISCANCEL=0` via `JSRetailers/runMappingSql` before `setDocument`. If found, it patches `CCCSFTPXML` to `SENT` with the existing `FINDOC`, logs `orders-log` operation `duplicateGuard` at warning level, and skips `setDocument`. If the guard lookup fails, it fails closed: marks `CCCSFTPXML` `ERROR`, logs `duplicateGuard` error, and does not create a document. Tests cover normal send, duplicate link, and guard lookup failure; `npm test` passes with 33 tests. Deployed to `retailers4` as Heroku release `v79`; scanner remains disabled.
- UI noise reduction 2026-06-09: `frontend/src/components/orders-table.js` now hides sent orders by default and suppresses red `XMLERROR` rendering for `SENT` rows whose message is `Duplicate NUM04 guard...`; `frontend/src/components/orders-log-table.js` hides resolved `duplicateGuard` warning rows by default, with a switch to show them. Duplicate context remains in `CCCSFTPXML.XMLERROR` and `orders-log`, but the UI stays focused on actionable rows. `npm --prefix frontend run build` passes.
- Manual scan routing 2026-06-09: dashboard `Scan Now` was still calling legacy `sftp.scanNow`, which logs `No files on server` / `No orders to create`. `frontend/src/services/api.js` now registers the `edi` Feathers service and routes manual `scanNow()` to `edi.scanNow`, matching the active `EDI_SCANNER=new` pipeline.
- Old delivery-date guard 2026-06-09: commit `ed271c61` deployed to `retailers4` as release `v81` holds automatic order creation when `jsonOrder.DATA.MTRDOC[0].DELIVDATE` is before today's Europe/Bucharest date. The XML row is patched to `XMLSTATUS='MANUAL'`, `XMLERROR='Past delivery date guard...'`, `orders-log` gets `OPERATION='pastDeliveryGuard'`, `LEVEL='warn'`, and `setDocument` is not called. Scanner stats now include `held`. UI shows `MANUAL` rows as `Manual`, excludes them from bulk `Trimite toate`, but keeps individual `Send manual`. Manual sends mark `XMLSTATUS='SENT'` on success. Tests: `npm test` 35 passing; frontend build passes. Note: local `S1/JS/AJS/JSRetailers.js` now returns `XMLSTATUS/XMLERROR` from `getOrdersData`; copy this AJS to ERP before relying on the Manual badge/details in UI.

- **EDI refactor validated end-to-end on dev S1 / PetFactoryTEST with real DocProcess and Infinite/Dedeman XMLs.**
- Strategy: local `ftp-srv` (Infinite) + local SFTP server (DocProcess) serving anonymized fixtures from `test/fixtures/`. Real Infinite directory layout has been mapped from prod (read-only LIST + safe pulls from already-consumed folders).
- `dev-web.xco` has been created and points to `PetFactoryTEST`; `JSRetailers.js` has been copied into ERP AJS.
- `PetFactoryTEST.dbo.CCCRETAILERSCLIENTS.WSURL` now points to `https://dev-petfactory.oncloud.gr/s1services` for the active company 50 row.
- Final MCP `CSTINFO.SODATA` hash check confirms `JSRetailers` in both `PetFactory` and `PetFactoryTEST` matches the current local `S1/JS/AJS/JSRetailers.js` file.
- Live dev validation 2026-06-05 succeeded using real XML `documentatie/ORDERS_DX01_144_20260403_01004728_VAT_RO17275880_DX.xml` with only order id/UUID changed to avoid duplicate: `CCCSFTPXML=7148`, `FINDOC=2135459`, `FINCODE=CKEY-00059773`, `XMLSTATUS=SENT`, `SERIES=7012`, `TRDR=12649`, line `MTRL=44857`, `QTY1=6000`, `PRICE=0.85`.
- After the SODATA compare, local `JSRetailers.js` was updated again: filename filters now use `CAST(XMLFILENAME AS VARCHAR(MAX))`, and `createSftpXml` falls back to lookup by filename+retailer when `SCOPE_IDENTITY()` returns 0. User copied this updated AJS into both ERP databases; MCP hash check confirms both match the local file.
- Live Infinite/Dedeman validation 2026-06-05 succeeded using real XML `documentatie/infinite_samples/orders/DEDEMAN_181059380.xml` with only `BuyerOrderNumber` changed to avoid duplicate: `CCCSFTPXML=7149`, `FINDOC=2135460`, `FINCODE=CKEY-00059774`, `XMLSTATUS=SENT`, `SERIES=7012`, `TRDR=11654`, 17 lines, total quantity 633.
- For Infinite/Dedeman testing, 7 XML mapping rows were added in `PetFactoryTEST` under existing `CCCDOCUMENTES1MAPPINGS=43`: `Order/OrderHeader/RequestedDeliveryDate`, `BuyerOrderNumber`, `OrderIssueDate`, `ShipToParty/GLN`, `UnitNetPrice`, `QuantityOrdered`, `BuyerItemID`.
- After the Infinite/Dedeman create test, local `JSRetailers.js` was updated again: filename comparisons now cast both sides (`CAST(XMLFILENAME AS VARCHAR(MAX)) = CAST(:1 AS VARCHAR(MAX))`) because Soft1 binds filename parameters as `ntext`. User copied this newest local AJS into both ERP databases; MCP hash check confirms both match the local file.
- Auchan/Dedeman mapping parity is complete in both `PetFactory` and `PetFactoryTEST`: `CCCSFTP` has separate Infinite rows for Dedeman `11654` and Auchan `13248`; ORDER mappings for both retailers have 7 XML rows each; duplicate Auchan TEST XML rows were removed; no duplicate XML mappings remain.
- Dashboard card for Auchan `13248` was added in `frontend/src/state/app-context.js` using the user-provided logo URL. Dedeman card already existed. `npm --prefix frontend run build` passes.
- Real Auchan order samples found and verified: `documentatie/infinite_samples/orders/AUCHAN_180887320.xml`, `AUCHAN_180887321.xml`, `AUCHAN_180887322.xml`, plus older `documentatie/dedeman/AUCHAN_145963053.xml`. Their ShipTo GLNs and BuyerItemIDs resolve for TRDR `13248` in `PetFactoryTEST`.
- Controlled Auchan dev tests succeeded. Synthetic non-numeric test: `CCCSFTPXML=7152`, `FINDOC=2135461`, `FINCODE=CKEY-00059775`, `XMLSTATUS=SENT`, `TRDR=13248`, `TRDBRANCH=1358`, `NUM04=0`, line `MTRL=27912`, `QTY1=2`, `PRICE=1.72`. Numeric test: `CCCSFTPXML=7153`, `FINDOC=2135462`, `FINCODE=CKEY-00059776`, `XMLSTATUS=SENT`, `NUM04=1780670762`, same branch/line mapping.
- Real Auchan dev validation completed for all four samples. First batch: `CCCSFTPXML=7154..7157`, `FINDOC=2135463..2135466`, all `SENT`. Second duplicate test batch was also sent accidentally: `CCCSFTPXML=7158..7161`, `FINDOC=2135467..2135470`, all `SENT`. Headers validated (`TRDR=13248`, `SERIES=7012`, correct `TRDBRANCH`, `DATE01`, `DELIVDATE`, numeric `NUM04`); line counts validated: 1, 1, 4, and 3 lines respectively, with expected MTRL/QTY/PRICE mappings.
- Real Dedeman dev validation completed for all folder samples: `documentatie/infinite_samples/orders/DEDEMAN_181017305.xml`, `DEDEMAN_181017333.xml`, `DEDEMAN_181059380.xml`. Results: `CCCSFTPXML=7162..7164`, `FINDOC=2135471..2135473`, `FINCODE=CKEY-00059785..00059787`, all `SENT`, `TRDR=11654`, `SERIES=7012`, numeric `NUM04=17806713461..17806713463`; line counts 12, 57, 17 with total quantities 292, 1325, 633.

## Active Area

- New module: `src/edi/` (transports, providers, scanner, order-builder, order-sender, sign-smime)
- New Feathers service: `src/services/edi/` (exposes `scanNow`, `scanPeriodically`, `stop`)
- AJS extensions in `S1/JS/AJS/JSRetailers.js`: `listEdiConfigs`, `claimSftpXml`, `getPendingSftpXml`, `runMappingSql`, extended `patchSftpXml`, `createSftpXml`/`getSftpXml` now include EDIDOCTYPE.

## Relevant Files

- `src/edi/scanner.js` — orchestrator with concurrency lock; downloads + dedupes + processes NEW rows.
- `src/edi/order-builder.js` — `buildOrderPayload` (parameterized {value} substitution via `runMappingSql`).
- `src/edi/order-sender.js` — `sendOrderToS1` with retry + status machine NEW→PROCESSING→SENT|ERROR.
- `src/edi/transports/{sftp,ftp}-transport.js` + factory.
- `src/edi/providers/{docprocess,infinite}.provider.js` + factory.
- `src/edi/sign-smime.js` — PKCS#12 → detached S/MIME signing for Infinite invoice upload (uses env vars `EDINET_P12_BASE64`, `EDINET_P12_PASSWORD`).
- `src/services/CCCSFTP/CCCSFTP.class.js` — new `list({onlyActive})` calling `listEdiConfigs`.
- `src/services/CCCSFTPXML/CCCSFTPXML.class.js` — new `claim(id)`, `pending({...})`; `patch` accepts `XMLSTATUS`, `XMLERROR`.
- `src/services/CCCSFTPXML/CCCSFTPXML.class.js` — `create` now falls back to `{ CCCSFTPXML: result.id, ...data }` when AJS returns empty `data`.
- `src/services/edi/{edi.class.js,edi.service.js}` — Feathers service.
- `src/app.js` — scanner bootstrap is now opt-in: `ENABLE_SFTP_SCANNER=true` is required before either pipeline starts; `EDI_SCANNER` (`new`|`legacy`|`both`) selects the pipeline only after that.
- `frontend/src/state/app-context.js` — dashboard retailer card list; now includes Auchan `13248` and Dedeman `11654`.

## Confirmed Decisions

- Status machine on CCCSFTPXML.XMLSTATUS: `NEW → PROCESSING → SENT | ERROR`; atomic claim via SQL `UPDATE ... WHERE XMLSTATUS='NEW'`.
- EDIDOCTYPE column populated on insert (`ORDERS`|`RETANN`|`APERAK`).
- CCCEDIPROVIDER extended with `CODE varchar(20)`, `ISACTIVE bit`; rows updated (docprocess, infinite).
- SQL injection on `{value}` mapping templates closed via AJS `runMappingSql` (rewrites `'{value}'` → `:1` and binds parameter; no DB template migration needed).
- Hardcoded S1 base URLs have been removed from `src/**`. Base URL resolution is now config-driven: explicit request URL when provided, else app config `s1BaseUrl`, else env `S1_BASE_URL`. The EDI order flow still prefers retailer-specific `CCCRETAILERSCLIENTS.WSURL`.
- Scanner safety is stricter now: `ENABLE_SFTP_SCANNER` defaults to `false`, and both automatic scheduling and manual `scanNow` endpoints short-circuit unless explicitly enabled.
- `privateKey.txt` no longer written to disk — `SftpTransport` holds the key in-memory.
- Legacy `sftp` service NOT deleted yet; toggled via `EDI_SCANNER=legacy` for fallback during validation.
- New order scanner constants now match the active ORDER mappings in PetFactoryTEST: `SOSOURCE=1351`, `FPRMS=701`, `SERIES=7012`.
- `buildOrderPayload` now groups line fields into real `ITELINES` rows and sets `SALDOC[0].SERIES`/`SALDOC[0].TRDR`, matching legacy payload behavior.
- MCP direct SQL currently connects to `PetFactory`, but `PetFactoryTEST` is visible on the same server (`PET-PRI-S1`) and can be queried cross-database as `PetFactoryTEST.dbo.*`.
- **Provider split (user-confirmed 2026-06-05): Auchan and Dedeman are on Infinite Edinet; all other retailers are on DocProcess.**
- **Cutover strategy (user): production = `retailers1` (branch `main`, Heroku `retailers1`) with scanner ACTIVE. `retailers4` (branch `feat/edi-safety-sftp-tests`, Heroku `retailers4`) keeps scanner OFF via `ENABLE_SFTP_SCANNER=false` so the two apps never steal each other's files. When `retailers4` tests are trusted, add the same kill-switch to `retailers1` to stop its scanner, then let `retailers4` take over.**

## Test harness (DONE)

- `ftp-srv` installed (dev dep). Local FTP server bound to `127.0.0.1`.
- `src/edi/transports/safe-host.js` — enforces loopback-only hosts when `NODE_ENV=test` (override: `EDI_ALLOW_PRODUCTION_HOSTS=1`). Wired into both `FtpTransport` and `SftpTransport` constructors.
- `test/edi/fixtures/infinite/orders/` — 2 anonymized fixtures (`AUCHAN_900000001.xml`, `DEDEMAN_900000002.xml`). Layout mirrors real prod (also empty `retanns/`).
- `test/edi/fixtures/docprocess/out/ORDERS_TEST_DX01_900000001.xml` — anonymized DocProcess UBL fixture (TRDR/MTRL/GLN scrubbed).
- `test/edi/ftp-server.js` — reusable FTP harness (`startFtp({port,root})`, `makeWorkdir()`).
- `test/edi/sftp-server.js` — reusable SFTP harness via `ssh2.Server` + cached 2048-bit RSA host key. Implements REALPATH/STAT/OPENDIR/READDIR/OPEN/READ/WRITE/CLOSE/MKDIR/REMOVE. Password auth only. Refuses to start outside `NODE_ENV=test`.
- `test/edi/scanner.test.js` — 4 tests passing (FTP/Infinite scanner).
- `test/edi/sftp-scanner.test.js` — 2 tests passing (SFTP/DocProcess scanner: safe-host refusal + real SFTP download/insert).
- `test/edi/order-builder.test.js` — 2 tests passing (mocked `runMappingSql` via injected `fetchImpl`; verifies SQL field substitution + error-path logging).
- `test/edi/order-sender.test.js` — 1 test passing (propagates dev/prod S1 target URL to `setDocument`, marks CCCSFTPXML row `SENT`).
- `test/edi/scanner-flags.test.js` — 3 tests passing (default scanner disabled + manual scan guards on both new and legacy services).
- `test/s1-base-url.test.js` — 3 tests passing (explicit URL, app config fallback, missing-config failure).
- **Total: 15 passing tests covering EDI + S1 base URL resolution, all under NODE_ENV=test, all loopback-only.**
- Fixed `FtpTransport.list` modifyTime bug (Date(0) → undefined).
- `SftpTransport` now accepts `password` as fallback when no `privateKey` (for test use; prod path unchanged).
- `buildOrderPayload` accepts optional `fetchImpl` (defaults to `node-fetch`) for test injection.
- `connectToS1`, `setDocument`, and the remaining server-side S1 service classes now resolve the base URL through the shared helper instead of embedding the production endpoint in each file.
- Production data sources kept gitignored under `documentatie/infinite_samples/`.

## Infinite FTP layout (real, mapped 2026-05-26)

Root `/` contains 4 top-level inbound/outbound trees:

- `/orders/` — INBOUND orders from retailers (Dedeman + Auchan share this account)
  - root = un-consumed files (server moves on RETR; LIST is safe)
  - `sent/` — post-consumption archive (DEDEMAN_*.xml, AUCHAN_*.xml) ← safe source for fixtures
  - `confirm/send/` — outbound .confirm acks we wrote back (e.g. `DEDEMAN_181059380.xml_417.confirm`)
  - `confirm/{archive,duplicate,error,logs/{err,ok},omit,temp}`
  - `failed/`, `temp/`, `omitted/`, weird `AUCHAN*` literal dir (empty)
- `/retanns/` — INBOUND return announcements; currently empty in prod
- `/desadv/` — OUTBOUND dispatch advice (Pet Factory → retailer)
  - `archive/` AEX-AE-*.xml (98), `logs/ok/` MessageAcknowledgement_*.xml
- `/invoice/` — OUTBOUND signed invoices (FAEXD-PF-*.xml in `archive/`, acks in `logs/ok/`)

Fixtures seeded under `documentatie/infinite_samples/` (gitignored):
`orders/`, `orders_confirm/`, `desadv_acks/`, `desadv_archive/`, `invoice_archive/`, `invoice_acks/`.

Key behavioral notes:
- Server move-on-RETR semantics: NEVER call `transport.download()` against real `/orders/` root in tests. LIST is safe.
- Naming proves `infiniteProvider.filenamePrefixes('orders') = ['AUCHAN_', 'DEDEMAN_']` is correct.
- `provider.remoteSubdir('retann')` → `/retanns/` (plural) matches real layout.
- No `/recadv/` or `/aperak/` folder on Infinite — RECADV/APERAK not part of this provider's flow; ignore for now.

## Open Questions / Pending

- **MCP check 2026-06-05**: `SELECT DB_NAME()` through MCP returns `PetFactory`, but `sys.databases` includes `PetFactoryTEST`; `PetFactoryTEST.dbo.COMPANY` has `COMPANY=50`, `NAME='PET FACTORY SRL'`.
- **MCP check 2026-06-05**: `PetFactoryTEST.dbo.CCCRETAILERSCLIENTS` active company 50 row now has `WSURL='https://dev-petfactory.oncloud.gr/s1services'`.
- **SODATA compare 2026-06-05**: `CSTINFO.SODATA` is a Soft1/Delphi stream (`TPF0...TXCustomInfo...Data`). The JS starts at byte/char 263 and ends before two trailing `00` bytes. Final post-copy check: both `PetFactory` and `PetFactoryTEST` have extracted code length 35,722 bytes and SHA-256 `DBF62F4F23050DF3CE25047C38B6FDDB23599D25474E959A9965839202959262`, matching local `S1/JS/AJS/JSRetailers.js` encoded as Windows-1252. `SOUPDDATE`: prod `2026-06-05 16:31:34`, test `2026-06-05 16:47:16`.
- **Final AJS sync 2026-06-05**: after the `CAST(:1 AS VARCHAR(MAX))` filename fix, both `PetFactory` and `PetFactoryTEST` have extracted AJS length 35,812 bytes and SHA-256 `F11913C90D9BEE83AF909F1C5D12755627D13FC11E3C85FCC7707DF23BD9973B`, matching local `S1/JS/AJS/JSRetailers.js`. `SOUPDDATE`: prod `2026-06-05 16:55:59`, test `2026-06-05 16:55:30`.
- **Live test 2026-06-05**: real DocProcess XML from `documentatie/ORDERS_DX01_144_20260403_01004728_VAT_RO17275880_DX.xml`; real lookup values resolved in `PetFactoryTEST` (`TRDBRANCH=8500` for GLN `5949065001155`, `MTRL=44857` for buyer item `098625-0`). Flow result: `CCCSFTPXML=7148` `NEW->PROCESSING->SENT`, `FINDOC=2135459`, `FINCODE=CKEY-00059773`.
- **Live test 2026-06-05**: real Infinite/Dedeman XML from `documentatie/infinite_samples/orders/DEDEMAN_181059380.xml`; real lookup values resolved in `PetFactoryTEST` (`TRDBRANCH=7875` for GLN `5949111999818`; all 17 `BuyerItemID` values resolve to MTRL). Flow result: `CCCSFTPXML=7149` `NEW->PROCESSING->SENT`, `FINDOC=2135460`, `FINCODE=CKEY-00059774`, 17 lines.
- Add CCCDOCUMENTES1MAPPINGS row for SERIES=7531 RETANN and complete non-Dedeman Infinite mappings as needed.
- **Resolved 2026-06-05**: Auchan active TRDR is `13248`. Auchan and Dedeman now have individual Infinite `CCCSFTP` rows in both DBs. ORDER mappings are complete in both DBs (`CCCDOCUMENTES1MAPPINGS=43` Dedeman, `49` Auchan, 7 XML rows each). Dashboard cards for both are present.
- **Resolved 2026-06-05**: synthetic numeric Auchan row `PetFactoryTEST.dbo.CCCSFTPXML=7153` was processed successfully after looking up the real PK by filename; it is now `XMLSTATUS=SENT`, `FINDOC=2135462`.
- Heroku config vars: `EDINET_P12_BASE64`, `EDINET_P12_PASSWORD`, optional `EDI_SCAN_INTERVAL_MS`, `EDI_DOWNLOAD_AGE_DAYS`, `EDI_PROCESS_AGE_DAYS`, `EDI_PROCESS_BATCH`, `EDI_SCANNER`.
- APERAK/RECADV handling for Infinite — `parseAperak` is a stub; scanner downloads them but doesn't insert.
- Invoice outbound flow (Infinite) — `sign-smime.js` ready, upload step not yet integrated.
- After validation, delete legacy `src/services/sftp/sftp.class.js` + remove `EDI_SCANNER=legacy` branch.

## Next Step

1. Monitor `retailers4` logs after cutover for first real inbound XML: expected startup lines are `[scanner] new EDI scanner ENABLED (multi-provider)` and `[do-storage] retry loop ENABLED (300000ms)`.
2. If rollback is needed, set `retailers4 ENABLE_SFTP_SCANNER=false DO_RETRY_INTERVAL_MS=0`, then set `retailers1 ENABLE_SFTP_SCANNER=true`.
