// Minimal local SFTP server backed by a real directory on disk.
// Binds 127.0.0.1 only; refuses to start outside NODE_ENV=test.
//
// Implements just the SFTP ops that ssh2-sftp-client uses:
//   REALPATH, STAT/LSTAT/FSTAT, OPENDIR, READDIR, CLOSE,
//   OPEN (read), READ, MKDIR, REMOVE/UNLINK, RENAME, WRITE (we don't need yet).
//
// Authentication accepts the single configured username/password pair.
import ssh2 from 'ssh2'
const { Server, utils } = ssh2
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

const SFTP_STATUS_CODE = {
  OK: 0,
  EOF: 1,
  NO_SUCH_FILE: 2,
  PERMISSION_DENIED: 3,
  FAILURE: 4
}

let cachedKey = null
function getHostKey() {
  if (cachedKey) return cachedKey
  const kp = utils.generateKeyPairSync('rsa', { bits: 2048 })
  cachedKey = kp.private
  return cachedKey
}

/**
 * Resolve a virtual SFTP path against the server's root, blocking traversal.
 */
function resolveSafe(root, virtual) {
  // Normalize to absolute, strip leading /
  const v = virtual.replace(/\\/g, '/').replace(/^\/+/, '')
  const abs = path.resolve(root, v)
  const norm = path.resolve(root)
  if (abs !== norm && !abs.startsWith(norm + path.sep)) {
    return null
  }
  return abs
}

function attrsFromStat(stat) {
  return {
    mode: stat.mode,
    uid: stat.uid,
    gid: stat.gid,
    size: stat.size,
    atime: Math.floor(stat.atimeMs / 1000),
    mtime: Math.floor(stat.mtimeMs / 1000)
  }
}

function longname(name, stat) {
  const type = stat.isDirectory() ? 'd' : '-'
  const sz = String(stat.size).padStart(10)
  const d = stat.mtime.toISOString().slice(5, 16).replace('T', ' ')
  return `${type}rw-r--r--  1 test test ${sz} ${d} ${name}`
}

/**
 * Start a local SFTP server.
 *
 * @param {{port?:number, root:string, username?:string, password?:string}} cfg
 * @returns {Promise<{port:number, stop:()=>Promise<void>}>}
 */
export async function startSftp(cfg) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[test-sftp] refusing to start outside NODE_ENV=test')
  }
  const port = cfg.port || 2222
  const root = path.resolve(cfg.root)
  const wantUser = cfg.username || 'testuser'
  const wantPass = cfg.password || 'testpass'

  const server = new Server({ hostKeys: [getHostKey()] }, (client) => {
    client
      .on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === wantUser && ctx.password === wantPass) {
          return ctx.accept()
        }
        if (ctx.method === 'none') return ctx.reject(['password'])
        ctx.reject(['password'])
      })
      .on('ready', () => {
        client.on('session', (accept) => {
          const session = accept()
          session.on('sftp', (acceptSftp) => {
            const sftp = acceptSftp()

            // Per-handle state
            const dirs = new Map() // handleId -> { absPath, entries, idx }
            const files = new Map() // handleId -> fd
            let nextId = 1
            const mkHandle = () => {
              const id = nextId++
              const buf = Buffer.alloc(4)
              buf.writeUInt32BE(id, 0)
              return { id, buf }
            }
            const idFromHandle = (handle) => handle.readUInt32BE(0)

            sftp.on('REALPATH', (reqid, p) => {
              const abs = resolveSafe(root, p || '/')
              if (!abs) return sftp.status(reqid, SFTP_STATUS_CODE.NO_SUCH_FILE)
              // Return the virtual path, not the absolute on-disk path.
              const v = '/' + path.relative(root, abs).replace(/\\/g, '/')
              sftp.name(reqid, [{ filename: v === '/' ? '/' : v, longname: v, attrs: {} }])
            })

            const doStat = async (reqid, p) => {
              const abs = resolveSafe(root, p)
              if (!abs) return sftp.status(reqid, SFTP_STATUS_CODE.NO_SUCH_FILE)
              try {
                const st = await fsp.stat(abs)
                sftp.attrs(reqid, attrsFromStat(st))
              } catch {
                sftp.status(reqid, SFTP_STATUS_CODE.NO_SUCH_FILE)
              }
            }
            sftp.on('STAT', doStat)
            sftp.on('LSTAT', doStat)

            sftp.on('FSTAT', async (reqid, handle) => {
              const id = idFromHandle(handle)
              const meta = files.get(id) || dirs.get(id)
              if (!meta) return sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              try {
                const st = await fsp.stat(meta.absPath || meta)
                sftp.attrs(reqid, attrsFromStat(st))
              } catch {
                sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              }
            })

            sftp.on('OPENDIR', async (reqid, p) => {
              const abs = resolveSafe(root, p)
              if (!abs) return sftp.status(reqid, SFTP_STATUS_CODE.NO_SUCH_FILE)
              try {
                const entries = await fsp.readdir(abs)
                const { id, buf } = mkHandle()
                dirs.set(id, { absPath: abs, entries, idx: 0 })
                sftp.handle(reqid, buf)
              } catch (e) {
                sftp.status(reqid, e.code === 'ENOENT' ? SFTP_STATUS_CODE.NO_SUCH_FILE : SFTP_STATUS_CODE.FAILURE)
              }
            })

            sftp.on('READDIR', async (reqid, handle) => {
              const id = idFromHandle(handle)
              const meta = dirs.get(id)
              if (!meta) return sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              if (meta.idx >= meta.entries.length) return sftp.status(reqid, SFTP_STATUS_CODE.EOF)
              const batch = []
              const end = Math.min(meta.idx + 50, meta.entries.length)
              for (let i = meta.idx; i < end; i++) {
                const name = meta.entries[i]
                try {
                  const st = await fsp.stat(path.join(meta.absPath, name))
                  batch.push({ filename: name, longname: longname(name, st), attrs: attrsFromStat(st) })
                } catch { /* skip */ }
              }
              meta.idx = end
              sftp.name(reqid, batch)
            })

            sftp.on('OPEN', async (reqid, filename, flags) => {
              const abs = resolveSafe(root, filename)
              if (!abs) return sftp.status(reqid, SFTP_STATUS_CODE.NO_SUCH_FILE)
              const isWrite = (flags & 0x00000002) || (flags & 0x00000004) // SSH_FXF_WRITE | SSH_FXF_CREAT
              try {
                const fd = await new Promise((resolve, reject) => {
                  fs.open(abs, isWrite ? 'w' : 'r', (err, fdNum) => err ? reject(err) : resolve(fdNum))
                })
                const { id, buf } = mkHandle()
                files.set(id, { fd, absPath: abs })
                sftp.handle(reqid, buf)
              } catch (e) {
                sftp.status(reqid, e.code === 'ENOENT' ? SFTP_STATUS_CODE.NO_SUCH_FILE : SFTP_STATUS_CODE.FAILURE)
              }
            })

            sftp.on('READ', async (reqid, handle, offset, length) => {
              const id = idFromHandle(handle)
              const meta = files.get(id)
              if (!meta) return sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              const buf = Buffer.alloc(length)
              fs.read(meta.fd, buf, 0, length, Number(offset), (err, bytesRead) => {
                if (err) return sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
                if (bytesRead === 0) return sftp.status(reqid, SFTP_STATUS_CODE.EOF)
                sftp.data(reqid, buf.slice(0, bytesRead))
              })
            })

            sftp.on('WRITE', async (reqid, handle, offset, data) => {
              const id = idFromHandle(handle)
              const meta = files.get(id)
              if (!meta) return sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              fs.write(meta.fd, data, 0, data.length, Number(offset), (err) => {
                if (err) return sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
                sftp.status(reqid, SFTP_STATUS_CODE.OK)
              })
            })

            sftp.on('CLOSE', (reqid, handle) => {
              const id = idFromHandle(handle)
              const meta = files.get(id)
              if (meta) {
                fs.close(meta.fd, () => {})
                files.delete(id)
                return sftp.status(reqid, SFTP_STATUS_CODE.OK)
              }
              if (dirs.has(id)) {
                dirs.delete(id)
                return sftp.status(reqid, SFTP_STATUS_CODE.OK)
              }
              sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
            })

            sftp.on('MKDIR', async (reqid, p) => {
              const abs = resolveSafe(root, p)
              if (!abs) return sftp.status(reqid, SFTP_STATUS_CODE.PERMISSION_DENIED)
              try {
                await fsp.mkdir(abs, { recursive: true })
                sftp.status(reqid, SFTP_STATUS_CODE.OK)
              } catch {
                sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              }
            })

            sftp.on('REMOVE', async (reqid, p) => {
              const abs = resolveSafe(root, p)
              if (!abs) return sftp.status(reqid, SFTP_STATUS_CODE.NO_SUCH_FILE)
              try {
                await fsp.unlink(abs)
                sftp.status(reqid, SFTP_STATUS_CODE.OK)
              } catch {
                sftp.status(reqid, SFTP_STATUS_CODE.FAILURE)
              }
            })
          })
        })
      })
      .on('error', () => { /* tolerate disconnect noise */ })
  })

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))

  return {
    port,
    stop: () => new Promise((resolve) => server.close(() => resolve()))
  }
}
