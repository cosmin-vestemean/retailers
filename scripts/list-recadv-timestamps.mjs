// LIST-only inspection of the Infinite /recadv folder. NEVER calls download/RETR:
// the server moves files on retrieval, so a download would consume production data.
// Credentials are read from CCCSFTP and never printed.
import { Client } from 'basic-ftp'

import { Soft1Client } from '../mcp-soft1/soft1-client.js'

const REMOTE_DIRS = ['/recadv', '/retann']

function extractRows(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Soft1 returned non-JSON: ' + String(text).slice(0, 200))
  }
  for (const key of ['rows', 'data', 'result', 'SODATA']) {
    const value = parsed?.[key]
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const nested = JSON.parse(value)
        if (Array.isArray(nested)) return nested
        if (Array.isArray(nested?.rows)) return nested.rows
      } catch { /* not nested JSON */ }
    }
  }
  if (Array.isArray(parsed)) return parsed
  throw new Error('Unexpected Soft1 shape, keys: ' + Object.keys(parsed || {}).join(','))
}

async function main() {
  const s1 = new Soft1Client()
  const raw = await s1.executeSqlRaw(
    "SELECT TOP 1 URL, PORT, USERNAME, PASSPHRASE FROM CCCSFTP WHERE URL LIKE '%infinite%'"
  )
  const [cfg] = extractRows(raw)
  if (!cfg?.URL) throw new Error('No Infinite CCCSFTP row found')
  console.log(`config: host=${cfg.URL} port=${cfg.PORT || 21} user=<redacted>`)

  const client = new Client(30000)
  try {
    await client.access({
      host: cfg.URL,
      port: Number(cfg.PORT) || 21,
      user: cfg.USERNAME,
      password: cfg.PASSPHRASE,
      secure: false
    })
    for (const dir of REMOTE_DIRS) {
      let entries
      try {
        entries = await client.list(dir)
      } catch (e) {
        console.log(`\n=== ${dir} === LIST failed: ${e.message}`)
        continue
      }
      const files = entries.filter((e) => e.isFile)
      const dirs = entries.filter((e) => e.isDirectory).map((e) => e.name)
      console.log(`\n=== ${dir} === files=${files.length} dirs=[${dirs.join(', ')}]`)
      const rows = files
        .map((e) => ({
          name: e.name,
          size: e.size,
          mtime: e.modifiedAt ? new Date(e.modifiedAt).toISOString() : null,
          rawModifiedAt: e.rawModifiedAt || null
        }))
        .sort((a, b) => String(a.mtime).localeCompare(String(b.mtime)))
      console.table(rows)
      if (rows.length) {
        console.log(`oldest=${rows[0].mtime}  newest=${rows[rows.length - 1].mtime}`)
      }
    }
  } finally {
    client.close()
  }
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
