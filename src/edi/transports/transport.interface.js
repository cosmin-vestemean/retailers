/**
 * EDI transport contract. All transports must implement these methods.
 *
 * @typedef {Object} RemoteFile
 * @property {string} name
 * @property {Date}   modifyTime
 * @property {number} size
 *
 * @typedef {Object} EdiTransport
 * @property {(remoteDir: string, filter?: (f: RemoteFile) => boolean) => Promise<RemoteFile[]>} list
 * @property {(remotePath: string, localPath: string) => Promise<void>}                          download
 * @property {(localPath: string, remotePath: string) => Promise<void>}                          upload
 * @property {(remotePath: string) => Promise<void>}                                             remove
 * @property {() => Promise<void>}                                                               close
 */
export {}
