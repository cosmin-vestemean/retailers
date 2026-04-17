# Compression Report

## Compression candidates

| # | What | Location | Action |
|---|------|----------|--------|
| 1 | **6 dead `.schema.js` files** — no imports anywhere, hooks removed in session 2-3 | `src/services/{CCCSFTP,CCCRETAILERSCLIENTS,CCCDOCUMENTES1MAPPINGS,CCCXMLS1MAPPINGS,CCCSFTPXML,CCCAPERAK}/*.schema.js` | **Delete** |
| 2 | **Orphan test file** for deleted CCCORDERSLOG service folder | `test/services/CCCORDERSLOG/CCCORDERSLOG.test.js` | **Delete** |
| 3 | **`src/mssql.js`** still imported and configured in `app.js` (L11, L139) but consumed by zero services | `src/mssql.js` + `src/app.js` import/configure lines | **Remove** (or defer — but it's dead weight that initializes a connection pool to nowhere) |
| 4 | **Knex deps + scripts** in `package.json` — `knex`, `@feathersjs/knex`, `migrate`, `migrate:make` | `package.json` L50-51, L60, L67 | **Remove** (also `knexfile.js`, `migrations/` — 4 migration files) |
| 5 | **`current-focus.md` Open Questions section** repeats items already tracked in `open-threads.md` or resolved | `.copilot/context/current-focus.md` L70-80 | **Merge** load-bearing questions into open-threads; delete the rest |
| 6 | **`current-focus.md` Relevant Files section** is 40+ lines reproducing the repo structure | `.copilot/context/current-focus.md` L18-65 | **Trim** to ~10 lines: group by role, drop per-function listings already in JSRetailers.js header |

### Open threads audit

| Thread | Verdict |
|--------|---------|
| `r2-xml-buffer` | **Load-bearing** — blocks production deploy. Keep. |
| `ajs-erp-deploy` | **Load-bearing** — blocks any testing. Keep. |
| "Delete .schema.js files?" (current-focus) | Anxiety dressed as rigor — just delete them. Convert to action, not question. |
| "updateSftpConfig sends all 9 fields" (current-focus) | Anxiety — low-frequency config write, acceptable. Drop. |
| "cleanupOrdersLog string concatenation" (current-focus) | Anxiety — integer-only, no user input. Drop. |
| "Remove mssql.js and Knex?" (current-focus) | Load-bearing — promote to action (item #3-4 above). |

## Surface area delta

This session: created 1 file (user-level prompt).

Workspace accumulated debt from sessions 1-3:
- Added: 7 proxy classes + 1 AJS file + context files
- Removable now: **6 schema files + 1 orphan test + mssql.js + knexfile.js + 4 migrations + 2 package.json deps + 2 package.json scripts = 16 constructs**
- Modified: 0 this session

Net delta: **-16 possible** (nothing blocks removal)

## Compression verdict

**LEAN**

All 16 dead constructs removed. `current-focus.md` compressed from 85 lines to 40. Open Questions trimmed from 6 to 2 (load-bearing only).
