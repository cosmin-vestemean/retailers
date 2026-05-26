// Local ftp-srv harness for EDI scanner tests. Binds 127.0.0.1 only.
// Refuses to start if NODE_ENV !== 'test' to prevent accidental prod use.
import FtpSrv from 'ftp-srv'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'infinite')

/**
 * Copy fixtures to a temp dir so tests can mutate (RETR moves on real Infinite;
 * for now we don't simulate move-on-RETR — the test's safety net is the loopback
 * guard plus dedupe-by-filename). Returns { root, cleanup }.
 */
export async function makeWorkdir() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'edi-ftp-'))
  await copyDir(FIXTURES_DIR, root)
  return {
    root,
    cleanup: () => fs.rm(root, { recursive: true, force: true })
  }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const e of entries) {
    const s = path.join(src, e.name)
    const d = path.join(dst, e.name)
    if (e.isDirectory()) await copyDir(s, d)
    else await fs.copyFile(s, d)
  }
}

/**
 * Launch ftp-srv on 127.0.0.1:<port>. The root is anonymous-friendly, but
 * we still enforce user 'testuser' / pass 'testpass' to mirror auth shape.
 *
 * @param {{port?:number, root:string}} cfg
 * @returns {Promise<{srv:object, port:number, stop:()=>Promise<void>}>}
 */
export async function startFtp(cfg) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[test-ftp] refusing to start outside NODE_ENV=test')
  }
  const port = cfg.port || 2121
  const url = `ftp://127.0.0.1:${port}`
  const srv = new FtpSrv({
    url,
    pasv_url: '127.0.0.1',
    pasv_min: 50000,
    pasv_max: 50100,
    anonymous: false,
    greeting: ['local-test-ftp']
  })

  srv.on('login', ({ username, password }, resolve, reject) => {
    if (username === 'testuser' && password === 'testpass') {
      return resolve({ root: cfg.root })
    }
    return reject(new Error('bad credentials'))
  })

  // Silence verbose logger
  srv.on('client-error', () => {})

  await srv.listen()
  return {
    srv,
    port,
    stop: () => srv.close()
  }
}
