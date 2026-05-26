// Download a small sample set from Infinite FTP into documentatie/infinite_samples/
// (already gitignored). Pulls only from already-consumed locations:
//   /orders/sent/  → /orders/confirm/send/ (ack confirms)
//   /desadv/logs/ok/                       (outbound desadv acks)
//   /invoice/archive/                      (outbound invoices)
import { Client } from 'basic-ftp'
import fs from 'node:fs/promises'
import path from 'node:path'

const HOST = 'ftp.infinite.pl'
const USER = process.env.INFINITE_USER
const PASS = process.env.INFINITE_PASS
const ROOT = 'documentatie/infinite_samples'

async function downloadFew(client, remoteDir, localDir, max, filter) {
  await fs.mkdir(localDir, { recursive: true })
  const entries = (await client.list(remoteDir))
    .filter((e) => e.isFile && (!filter || filter(e)))
    .sort((a, b) => (b.modifiedAt?.getTime?.() || 0) - (a.modifiedAt?.getTime?.() || 0))
    .slice(0, max)
  for (const e of entries) {
    const localPath = path.join(localDir, e.name)
    const remotePath = remoteDir.endsWith('/') ? remoteDir + e.name : remoteDir + '/' + e.name
    try {
      await client.downloadTo(localPath, remotePath)
      console.log('  ✓', e.name, '(' + e.size + 'B)')
    } catch (err) {
      console.error('  ✗', e.name, err.message)
    }
  }
}

async function main() {
  if (!USER || !PASS) { console.error('Set INFINITE_USER / INFINITE_PASS'); process.exit(1) }
  const client = new Client(30000)
  try {
    await client.access({ host: HOST, port: 21, user: USER, password: PASS, secure: false })
    console.log('orders/sent (DEDEMAN x3, AUCHAN x3):')
    await downloadFew(client, '/orders/sent', path.join(ROOT, 'orders'), 3, (e) => e.name.startsWith('DEDEMAN_'))
    await downloadFew(client, '/orders/sent', path.join(ROOT, 'orders'), 3, (e) => e.name.startsWith('AUCHAN_'))
    console.log('orders/confirm/send (.confirm x3):')
    await downloadFew(client, '/orders/confirm/send', path.join(ROOT, 'orders_confirm'), 3)
    console.log('desadv/logs/ok (acks x2):')
    await downloadFew(client, '/desadv/logs/ok', path.join(ROOT, 'desadv_acks'), 2)
    console.log('desadv/archive (outbound x2):')
    await downloadFew(client, '/desadv/archive', path.join(ROOT, 'desadv_archive'), 2, (e) => e.name.endsWith('.xml'))
    console.log('invoice/archive (outbound x2):')
    await downloadFew(client, '/invoice/archive', path.join(ROOT, 'invoice_archive'), 2, (e) => e.name.endsWith('.xml'))
    console.log('invoice/logs/ok (acks x2):')
    await downloadFew(client, '/invoice/logs/ok', path.join(ROOT, 'invoice_acks'), 2)
  } finally {
    client.close()
  }
}

main()
