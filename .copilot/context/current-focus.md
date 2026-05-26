# Current Focus

## Last Updated

- Session: multi-provider EDI refactor (DocProcess + Infinite Edinet)

## Current Goal

- **EDI refactor in place; now setting up isolated testing without touching production XMLs.**
- Strategy: local `ftp-srv` (Infinite) + local SFTP server (DocProcess) serving anonymized fixtures from `test/fixtures/`. Real Infinite directory layout has been mapped from prod (read-only LIST + safe pulls from already-consumed folders).

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
- `src/services/edi/{edi.class.js,edi.service.js}` — Feathers service.
- `src/app.js` — scanner bootstrap is now opt-in: `ENABLE_SFTP_SCANNER=true` is required before either pipeline starts; `EDI_SCANNER` (`new`|`legacy`|`both`) selects the pipeline only after that.

## Confirmed Decisions

- Status machine on CCCSFTPXML.XMLSTATUS: `NEW → PROCESSING → SENT | ERROR`; atomic claim via SQL `UPDATE ... WHERE XMLSTATUS='NEW'`.
- EDIDOCTYPE column populated on insert (`ORDERS`|`RETANN`|`APERAK`).
- CCCEDIPROVIDER extended with `CODE varchar(20)`, `ISACTIVE bit`; rows updated (docprocess, infinite).
- SQL injection on `{value}` mapping templates closed via AJS `runMappingSql` (rewrites `'{value}'` → `:1` and binds parameter; no DB template migration needed).
- EDI order flow now propagates the retailer S1 base URL end-to-end: `CCCRETAILERSCLIENTS.WSURL` feeds `buildOrderPayload`, `connectToS1`, AJS `runMappingSql`, and `setDocument`. Fallback remains `S1_BASE_URL` env, then prod default.
- Scanner safety is stricter now: `ENABLE_SFTP_SCANNER` defaults to `false`, and both automatic scheduling and manual `scanNow` endpoints short-circuit unless explicitly enabled.
- `privateKey.txt` no longer written to disk — `SftpTransport` holds the key in-memory.
- Legacy `sftp` service NOT deleted yet; toggled via `EDI_SCANNER=legacy` for fallback during validation.

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
- **Total: 12 passing EDI tests, all under NODE_ENV=test, all loopback-only.**
- Fixed `FtpTransport.list` modifyTime bug (Date(0) → undefined).
- `SftpTransport` now accepts `password` as fallback when no `privateKey` (for test use; prod path unchanged).
- `buildOrderPayload` accepts optional `fetchImpl` (defaults to `node-fetch`) for test injection.
- `connectToS1` now respects the incoming `url`/`username`/`password` query instead of hardcoded login only; `setDocument` now respects the same target URL.
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

- **Manual ERP step**: transfer updated/new AJS functions in `JSRetailers.js` to ERP Advanced JavaScript Editor (`listEdiConfigs`, `claimSftpXml`, `getPendingSftpXml`, `runMappingSql`, updated `createSftpXml`/`getSftpXml`/`patchSftpXml`).
- Beneficiary to provide `dev-web.xco`, so `dev-` S1 endpoints hit a separate test database instead of production. Real S1 end-to-end validation is blocked on this.
- Add CCCXMLS1MAPPINGS rows for Infinite (`<Document><Order>...`) and CCCDOCUMENTES1MAPPINGS row for SERIES=7531 RETANN.
- Heroku config vars: `EDINET_P12_BASE64`, `EDINET_P12_PASSWORD`, optional `EDI_SCAN_INTERVAL_MS`, `EDI_DOWNLOAD_AGE_DAYS`, `EDI_PROCESS_AGE_DAYS`, `EDI_PROCESS_BATCH`, `EDI_SCANNER`.
- APERAK/RECADV handling for Infinite — `parseAperak` is a stub; scanner downloads them but doesn't insert.
- Invoice outbound flow (Infinite) — `sign-smime.js` ready, upload step not yet integrated.
- After validation, delete legacy `src/services/sftp/sftp.class.js` + remove `EDI_SCANNER=legacy` branch.

## Next Step

1. Wait for beneficiary `dev-web.xco`; once available, point `CCCRETAILERSCLIENTS.WSURL` (or `S1_BASE_URL`) to the new `dev-` endpoint and run real S1 validation against the separate test DB.
2. After that, add the full pipeline test: SFTP scanner + buildOrderPayload + sendOrderToS1 in one flow, asserting CCCSFTPXML transitions `NEW → PROCESSING → SENT`.
3. User: copy AJS additions into ERP Advanced JavaScript Editor.
4. User: set Heroku vars and validate scanner on retailers4-dev with `EDI_SCANNER=new`.
5. Wire signed-invoice upload for Infinite (`signSmime` + `FtpTransport.upload`).
6. Verify SHA digest: `sign-smime.js` uses SHA-256; Infinite docs mention `SHA128withRSA` — needs review.
7. After validation, delete legacy `src/services/sftp/sftp.class.js` + remove `EDI_SCANNER=legacy` branch.
