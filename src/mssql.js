// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import knex from 'knex'
import { SocksProxyAgent } from 'socks-proxy-agent'

export const mssql = (app) => {
  const config = app.get('mssql')

  // Final attempt: Use SocksProxyAgent, which is the standard for tunneling TCP in Node.js
  if (process.env.FIXIE_SOCKS_HOST) {
    const fixieUrl = `socks://${process.env.FIXIE_SOCKS_HOST}`

    console.log('=== FIXIE SOCKS CONFIGURATION (SocksProxyAgent) ===')
    console.log(`Proxy URL: ${fixieUrl}`)
    console.log(`Target: ${config.connection.server}:${config.connection.port || 1433}`)

    // Create a SOCKS proxy agent
    const agent = new SocksProxyAgent(fixieUrl)

    // The 'tedious' driver used by knex for MSSQL does not support a `stream` option.
    // Instead, we must provide a proxy agent to the driver options.
    config.connection.options = {
      ...config.connection.options,
      agent: agent
    }
    
    // Remove the stream override as it's not supported by the driver
    delete config.connection.stream

    // Generous timeouts to prevent the pool from giving up on the proxy connection
    config.pool = {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 60000,
      destroyTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    }
    
    // Ensure driver-level connection timeout is also high
    config.connection.options.connectTimeout = 60000
    
    console.log('✅ Configured knex to use SocksProxyAgent.')
  }

  const db = knex(config)

  // No event listeners for bare-minimum setup
  console.log('Database client configured.')
  app.set('mssqlClient', db)
}
