// Loads the 101 RECADV payloads captured during analysis into CCCSFTPXML as
// EDIDOCTYPE='RECADV' / XMLSTATUS='INGESTED' rows, so the Recepții screen can be validated on
// real data WITHOUT touching the production FTP account (which is what set the portal read-flag).
//
// Idempotent: skips files already present for the resolved retailer.
//
//   $env:S1_BASE_URL='https://petfactory.oncloud.gr/s1services'
//   node scripts/seed-recadv-corpus.mjs --dry-run
//   node scripts/seed-recadv-corpus.mjs

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { infiniteProvider } from '../src/edi/providers/infinite.provider.js'
import { CccsftpxmlService } from '../src/services/CCCSFTPXML/CCCSFTPXML.class.js'

const BASE = process.env.S1_BASE_URL
if (!BASE) {
  console.error('Missing S1_BASE_URL env var')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const CORPUS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../documentatie/infinite_samples/recadv'
)

const app = { get: (key) => (key === 's1BaseUrl' ? BASE : undefined) }
const sftpxml = new CccsftpxmlService({ app })

function formatSqlDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function main() {
  const files = (await fs.readdir(CORPUS)).filter((f) => f.toLowerCase().endsWith('.xml')).sort()
  console.log(`${files.length} files in ${CORPUS}${DRY_RUN ? '  (DRY RUN)' : ''}\n`)

  const stats = { inserted: 0, skipped: 0, unrouted: 0, failed: 0 }

  for (const name of files) {
    const full = path.join(CORPUS, name)
    const xml = await fs.readFile(full, 'utf8')
    const stat = await fs.stat(full)

    let parsed
    try {
      parsed = await infiniteProvider.parseRecadv(xml)
    } catch (error) {
      console.log(`  FAIL   ${name}  parse: ${error.message}`)
      stats.failed++
      continue
    }

    if (!parsed.trdr) {
      console.log(`  UNROUTED ${name}  buyerGln=${parsed.buyerGln || 'empty'}`)
      stats.unrouted++
      continue
    }

    const existing = await sftpxml.find({
      query: { TRDR_RETAILER: parsed.trdr, XMLFILENAME: name, $limit: 1 }
    })
    if (existing.data?.length) {
      stats.skipped++
      continue
    }

    const { raw, ...payload } = parsed
    if (DRY_RUN) {
      console.log(`  WOULD  ${name}  trdr=${parsed.trdr} advice=${parsed.adviceRaw || '-'} orders=${parsed.orders.join('|') || '-'} lines=${parsed.items.length}`)
      stats.inserted++
      continue
    }

    try {
      await sftpxml.create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: parsed.trdr,
        XMLDATA: xml,
        JSONDATA: JSON.stringify(payload),
        XMLDATE: formatSqlDate(stat.mtime),
        XMLSTATUS: 'INGESTED',
        XMLERROR: '',
        XMLFILENAME: name,
        EDIDOCTYPE: 'RECADV'
      })
      stats.inserted++
    } catch (error) {
      console.log(`  FAIL   ${name}  insert: ${error.message}`)
      stats.failed++
    }
  }

  console.log(`\ninserted=${stats.inserted} skipped=${stats.skipped} unrouted=${stats.unrouted} failed=${stats.failed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
