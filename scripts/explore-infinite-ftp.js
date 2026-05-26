// Explore-only: list directory tree on ftp.infinite.pl without downloading anything.
// Avoids triggering any server-side "consumed" semantics on /orders/.
import { Client } from 'basic-ftp'

const HOST = 'ftp.infinite.pl'
const USER = process.env.INFINITE_USER
const PASS = process.env.INFINITE_PASS

async function walk(client, dir, depth, maxDepth, results) {
  if (depth > maxDepth) return
  let entries
  try {
    entries = await client.list(dir)
  } catch (e) {
    results.push({ dir, error: e.message })
    return
  }
  const summary = {
    dir,
    files: entries.filter((e) => e.isFile).length,
    dirs: entries.filter((e) => e.isDirectory).length,
    sampleFiles: entries
      .filter((e) => e.isFile)
      .slice(0, 5)
      .map((e) => ({ name: e.name, size: e.size, mtime: e.modifiedAt })),
    sampleDirs: entries.filter((e) => e.isDirectory).map((e) => e.name)
  }
  results.push(summary)
  for (const e of entries) {
    if (e.isDirectory) {
      const next = dir.endsWith('/') ? dir + e.name : dir + '/' + e.name
      await walk(client, next, depth + 1, maxDepth, results)
    }
  }
}

async function main() {
  if (!USER || !PASS) {
    console.error('Set INFINITE_USER and INFINITE_PASS env vars.')
    process.exit(1)
  }
  const client = new Client(30000)
  client.ftp.verbose = false
  try {
    await client.access({ host: HOST, port: 21, user: USER, password: PASS, secure: false })
    console.log('connected')
    const results = []
    await walk(client, '/', 0, 3, results)
    console.log(JSON.stringify(results, null, 2))
  } catch (e) {
    console.error('FATAL:', e.message)
  } finally {
    client.close()
  }
}

main()
