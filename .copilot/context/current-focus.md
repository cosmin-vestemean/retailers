# Current Focus

## Last Updated

- April 17, 2026 (session 3 + compression pass)

## Current Goal

- **Knex → AJS migration: COMPLETE** (7/7 services migrated)
- **Knex dead layer: REMOVED** (mssql.js, knexfile, migrations, schema files, deps)

## Active Area

- Migration complete; Knex layer fully removed; next focus is resilience (Cloudflare R2 buffer)

## Relevant Files

- **AJS source**: `S1/JS/AJS/JSRetailers.js` — all 19+ endpoint functions (ES5, positional params)
- **Proxy services** (7): `src/services/{orders-log,CCCSFTP,CCCRETAILERSCLIENTS,CCCDOCUMENTES1MAPPINGS,CCCXMLS1MAPPINGS,CCCSFTPXML,CCCAPERAK}/*.class.js`
- **Callers** (unchanged): `src/services/sftp/sftp.class.js`, `src/services/store-xml/store-xml.class.js`, `frontend/src/services/api.js`, `src/client.js`

## Confirmed Decisions

- No direct DB access — all through Soft1 AJS endpoints (hard requirement)
- Knex layer fully removed (was dormant post-migration, now deleted)
- AJS = ES5; COM API positional params; skip-empty filter pattern `(:N = '0' OR COLUMN = :N)`
- Proxy response: AJS `{ success, data, total }` → FeathersJS `{ data, total }`
- CCCSFTPXML create returns full row; patch returns array; CCCAPERAK create returns `{ CCCAPERAK: newId }`
- Schema hooks removed — AJS handles validation server-side
- Service paths unchanged — zero breaking changes
- Cloudflare R2 as persistent XML buffer; target app **retailers4**

## Open Questions

- Transfer AJS functions to ERP Advanced JavaScript Editor (manual, blocks testing)
- Retry/resilience logic not yet implemented on proxy classes

## Next Step

- Implement Cloudflare R2 integration as persistent XML buffer (SFTP download → R2 → AJS, with retry on AJS failure)

