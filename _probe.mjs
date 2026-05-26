import { Client } from 'basic-ftp'
import { startFtp, makeWorkdir } from './test/edi/ftp-server.js'

process.env.NODE_ENV = 'test'

const wd = await makeWorkdir()
const srv = await startFtp({ port: 2122, root: wd.root })

const c = new Client()
c.ftp.verbose = true
try {
  await c.access({ host: '127.0.0.1', port: 2122, user: 'testuser', password: 'testpass', secure: false })
  console.log('--- /orders/ ---')
  const orders = await c.list('/orders/')
  console.log('count:', orders.length)
  console.log(JSON.stringify(orders, null, 2))
} catch (e) {
  console.error('ERR:', e.message)
} finally {
  c.close()
  await srv.stop()
  await wd.cleanup()
}
