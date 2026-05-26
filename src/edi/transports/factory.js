import { SftpTransport } from './sftp-transport.js'
import { FtpTransport } from './ftp-transport.js'

// CCCEDIPROVIDER.CONNTYPE — magic numbers from ERP schema
export const CONN_TYPE_SFTP = 1
export const CONN_TYPE_FTP = 4

/**
 * Build a transport for one CCCSFTP row. The row must already be joined with
 * its CCCEDIPROVIDER to know CONNTYPE.
 *
 * @param {{
 *   URL:string, PORT?:number, USERNAME:string, PASSPHRASE?:string,
 *   PRIVATEKEY?:string, PASSWORD?:string
 * }} sftpRow
 * @param {number} connType
 * @returns {import('./transport.interface.js').EdiTransport}
 */
export function buildTransport(sftpRow, connType) {
  if (connType === CONN_TYPE_SFTP) {
    return new SftpTransport({
      host: sftpRow.URL,
      port: sftpRow.PORT || 22,
      username: sftpRow.USERNAME,
      passphrase: sftpRow.PASSPHRASE,
      privateKey: sftpRow.PRIVATEKEY,
      password: sftpRow.PASSWORD
    })
  }
  if (connType === CONN_TYPE_FTP) {
    return new FtpTransport({
      host: sftpRow.URL,
      port: sftpRow.PORT || 21,
      username: sftpRow.USERNAME,
      // Infinite stores the FTP password in PASSPHRASE column on existing rows;
      // accept either to be tolerant.
      password: sftpRow.PASSWORD || sftpRow.PASSPHRASE
    })
  }
  throw new Error(`Unknown CCCEDIPROVIDER.CONNTYPE=${connType}`)
}
