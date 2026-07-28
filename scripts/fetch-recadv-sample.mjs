// One-shot controlled capture of the OLDEST inbound files from the Infinite FTP account.
// Defaults to /recadv; pass --dir /retann to capture return announcements instead.
//
// This is the only script in the repo allowed to call RETR on these folders. The Infinite server
// moves files on retrieval for /orders, and /recadv has no sent/ or archive/ subfolder, so a
// retrieval there is either non-consuming or destructive. /retann DOES have a sent/ subfolder,
// so treat it as potentially consuming. The order of operations below is
// therefore deliberate and must not be reordered:
//
//   1. verify DigitalOcean Spaces is reachable  (never RETR without somewhere to put the bytes)
//   2. RETR one file into memory
//   3. upload to DO and read it back to confirm the bytes survived
//   4. only then write a local copy
//   5. re-LIST /recadv to observe whether the server consumed the files
//
// Nothing is parsed here. Credentials are read from CCCSFTP and never printed.
import { createHash } from 'node:crypto'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'

import { Client } from 'basic-ftp'

import { createDoStorageClient, makeDoXmlKey, metadataForXml } from '../src/do-storage/client.js'
import { Soft1Client } from '../mcp-soft1/soft1-client.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUPPORTED_DIRS = { '/recadv': 'RECADV', '/retann': 'RETANN' }

function parseArgs(argv) {
  const args = { count: 3, dryRun: false, dir: '/recadv' }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--count') {
      args.count = argv[i + 1] === 'all' ? Infinity : Math.max(1, parseInt(argv[i + 1], 10) || 1)
    }
    if (argv[i] === '--all') args.count = Infinity
    if (argv[i] === '--dry-run') args.dryRun = true
    if (argv[i] === '--dir') args.dir = '/' + String(argv[i + 1] || '').replace(/^\/+/, '')
  }
  if (!SUPPORTED_DIRS[args.dir]) {
    throw new Error(`--dir must be one of ${Object.keys(SUPPORTED_DIRS).join(', ')}`)
  }
  return args
}

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

function collectStream(chunks) {
  return new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk))
      callback()
    }
  })
}

async function listRemote(client, remoteDir) {
  const entries = await client.list(remoteDir)
  return entries
    .filter((e) => e.isFile)
    .map((e) => ({
      name: e.name,
      size: e.size,
      mtime: e.modifiedAt ? new Date(e.modifiedAt).toISOString() : null
    }))
    .sort((a, b) => String(a.mtime).localeCompare(String(b.mtime)))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const remoteDir = args.dir
  const docType = SUPPORTED_DIRS[remoteDir]
  const localDir = path.join(REPO_ROOT, 'documentatie', 'infinite_samples', remoteDir.slice(1))

  const doStorage = createDoStorageClient()
  if (!doStorage.isConfigured()) {
    throw new Error('DO_BUCKET/DO_ENDPOINT/DO_ACCESS_KEY/DO_SECRET_KEY must be set before capturing')
  }
  const doStatus = await doStorage.status()
  if (!doStatus.accessible) {
    throw new Error(`DigitalOcean Spaces not accessible (${doStatus.error || 'unknown error'}) - refusing to RETR`)
  }
  console.log(`DO bucket=${doStatus.bucket} region=${doStatus.region} accessible=true`)

  const s1 = new Soft1Client()
  const [cfg] = extractRows(await s1.executeSqlRaw(
    "SELECT TOP 1 URL, PORT, USERNAME, PASSPHRASE FROM CCCSFTP WHERE URL LIKE '%infinite%'"
  ))
  if (!cfg?.URL) throw new Error('No Infinite CCCSFTP row found')
  console.log(`FTP host=${cfg.URL} port=${cfg.PORT || 21} user=<redacted>`)

  const client = new Client(30000)
  const captured = []
  try {
    await client.access({
      host: cfg.URL,
      port: Number(cfg.PORT) || 21,
      user: cfg.USERNAME,
      password: cfg.PASSPHRASE,
      secure: false
    })

    const before = await listRemote(client, remoteDir)
    console.log(`\n${remoteDir}: ${before.length} files, oldest=${before[0]?.mtime}, newest=${before[before.length - 1]?.mtime}`)

    await mkdir(localDir, { recursive: true })
    const alreadyCaptured = new Set((await readdir(localDir)).map((f) => f.replace(/\.xml$/, '')))
    const pending = before.filter((f) => !alreadyCaptured.has(f.name))
    const targets = pending.slice(0, args.count === Infinity ? pending.length : args.count)
    console.log(`already captured=${alreadyCaptured.size} pending=${pending.length} selected=${targets.length}`)

    if (args.dryRun) {
      console.table(targets.slice(0, 10))
      console.log('\n--dry-run: no RETR performed.')
      return
    }

    for (const target of targets) {
      const remotePath = `${remoteDir}/${target.name}`

      const chunks = []
      await client.downloadTo(collectStream(chunks), remotePath)
      const buffer = Buffer.concat(chunks)
      const sha256 = createHash('sha256').update(buffer).digest('hex')

      const filename = `${target.name}.xml`
      const key = makeDoXmlKey({
        state: 'archive',
        stage: `${docType.toLowerCase()}-capture`,
        provider: 'infinite',
        retailer: 'unresolved',
        docType,
        filename,
        date: target.mtime || new Date()
      })
      await doStorage.putXml({
        key,
        xml: buffer,
        metadata: metadataForXml({
          provider: 'infinite',
          docType,
          filename: target.name,
          stage: `${docType.toLowerCase()}-capture`,
          sourcePath: remotePath
        })
      })

      const readBack = await doStorage.getText(key)
      const intact = Buffer.byteLength(readBack.body, 'utf8') === buffer.length
      if (!intact) throw new Error(`DO read-back length mismatch for ${target.name} - aborting`)

      const localPath = path.join(localDir, filename)
      await writeFile(localPath, buffer)

      console.log(`  ok ${target.name}  ${String(buffer.length).padStart(7)} bytes  sha=${sha256.slice(0, 12)}  -> DO + local`)
      captured.push({ name: target.name, bytes: buffer.length, key, localPath })
    }

    const after = await listRemote(client, remoteDir)
    const stillThere = targets.filter((t) => after.some((a) => a.name === t.name))
    console.log(`\n=== consumption check ===`)
    console.log(`before=${before.length} after=${after.length} retrieved=${targets.length}`)
    console.log(`retrieved files still present: ${stillThere.length}/${targets.length}`)
    console.log(stillThere.length === targets.length
      ? `RETR on ${remoteDir} is NON-CONSUMING.`
      : `RETR on ${remoteDir} CONSUMES files - only the DO copy remains.`)
  } finally {
    client.close()
  }

  console.log(`\n=== captured ${captured.length} files, ${captured.reduce((s, c) => s + c.bytes, 0)} bytes total ===`)
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
