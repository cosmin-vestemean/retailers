import Client from 'ssh2-sftp-client'
import { assertSafeHost } from './safe-host.js'

/**
 * SFTP transport. Holds the private key in memory — never writes it to disk.
 * Used by DocProcess.
 */
export class SftpTransport {
  /**
   * @param {{host:string, port:number, username:string, passphrase?:string, privateKey:string|Buffer}} cfg
   */
  constructor(cfg) {
    assertSafeHost(cfg.host)
    this.cfg = cfg
    this.client = new Client()
    this.connected = false
  }

  async connect() {
    if (this.connected) return
    const opts = {
      host: this.cfg.host,
      port: this.cfg.port,
      username: this.cfg.username,
      readyTimeout: 30000
    }
    if (this.cfg.privateKey) {
      opts.privateKey =
        typeof this.cfg.privateKey === 'string'
          ? Buffer.from(this.cfg.privateKey)
          : this.cfg.privateKey
      if (this.cfg.passphrase) opts.passphrase = this.cfg.passphrase
    } else if (this.cfg.password) {
      opts.password = this.cfg.password
    } else {
      throw new Error('SftpTransport: provide privateKey or password')
    }
    await this.client.connect(opts)
    this.connected = true
  }

  async list(remoteDir, filter) {
    await this.connect()
    const entries = await this.client.list(remoteDir, filter)
    return entries.map((e) => ({
      name: e.name,
      modifyTime: new Date(e.modifyTime),
      size: e.size
    }))
  }

  async download(remotePath, localPath) {
    await this.connect()
    await this.client.fastGet(remotePath, localPath)
  }

  async upload(localPath, remotePath) {
    await this.connect()
    await this.client.fastPut(localPath, remotePath)
  }

  async remove(remotePath) {
    await this.connect()
    await this.client.delete(remotePath)
  }

  async close() {
    if (!this.connected) return
    try { await this.client.end() } catch { /* ignore */ }
    this.connected = false
  }
}
