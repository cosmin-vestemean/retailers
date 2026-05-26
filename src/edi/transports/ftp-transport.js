import { Client } from 'basic-ftp'
import { Writable, Readable } from 'node:stream'
import fs from 'node:fs'
import { assertSafeHost } from './safe-host.js'

/**
 * Plain FTP transport (passive, port 21 by default). Used by Infinite Edinet.
 */
export class FtpTransport {
  /**
   * @param {{host:string, port?:number, username:string, password:string, secure?:boolean}} cfg
   */
  constructor(cfg) {
    assertSafeHost(cfg.host)
    this.cfg = cfg
    this.client = new Client(30000)
    this.connected = false
  }

  async connect() {
    if (this.connected) return
    await this.client.access({
      host: this.cfg.host,
      port: this.cfg.port || 21,
      user: this.cfg.username,
      password: this.cfg.password,
      secure: this.cfg.secure || false
    })
    this.connected = true
  }

  async list(remoteDir, filter) {
    await this.connect()
    const entries = await this.client.list(remoteDir)
    const mapped = entries
      .filter((e) => e.isFile)
      .map((e) => ({
        name: e.name,
        modifyTime: e.modifiedAt,
        size: e.size
      }))
    return filter ? mapped.filter(filter) : mapped
  }

  async download(remotePath, localPath) {
    await this.connect()
    await this.client.downloadTo(localPath, remotePath)
  }

  async upload(localPath, remotePath) {
    await this.connect()
    await this.client.uploadFrom(localPath, remotePath)
  }

  async remove(remotePath) {
    await this.connect()
    await this.client.remove(remotePath)
  }

  async close() {
    if (!this.connected) return
    try { this.client.close() } catch { /* ignore */ }
    this.connected = false
  }
}
