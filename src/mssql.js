// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import knex from 'knex'
import { SocksClient } from 'socks'

export const mssql = (app) => {
  const config = app.get('mssql')

  // Bare-minimum Fixie SOCKS configuration to address connection timeouts
  if (process.env.FIXIE_SOCKS_HOST) {
    const fixieUrl = process.env.FIXIE_SOCKS_HOST
    
    const [authPart, hostPart] = fixieUrl.split('@')
    const [username, password] = authPart.split(':')
    const [proxyHost, proxyPort] = hostPart.split(':')

    console.log('=== BARE MINIMUM FIXIE SOCKS CONFIG ===')
    console.log(`Proxy: ${proxyHost}:${proxyPort}`)
    console.log(`Target: ${config.connection.server}:${config.connection.port || 1433}`)

    // Override the connection with a custom async stream using the modern 'socks' package
    config.connection.stream = async () => {
      try {
        console.log('Attempting SOCKS connection via Fixie...')
        const { socket } = await SocksClient.createConnection({
          proxy: {
            host: proxyHost,
            port: parseInt(proxyPort),
            type: 5,
            userId: username,
            password
          },
          destination: {
            host: config.connection.server,
            port: config.connection.port || 1433
          },
          command: 'connect'
        })
        console.log('✅ SOCKS connection successful.')
        return socket
      } catch (err) {
        console.error('❌ SOCKS connection failed:', err)
        throw err // Propagate error to knex
      }
    }
    
    // Simplified pool with a long timeout to handle SOCKS latency
    config.pool = {
      min: 0, // Start with no connections
      max: 2, // Keep pool very small
      acquireTimeoutMillis: 60000, // 60 seconds to acquire a connection
      createTimeoutMillis: 60000, // 60 seconds to create a connection
    }
    
    // Ensure driver options also have a long timeout
    config.connection.options = {
      ...config.connection.options,
      connectTimeout: 60000
    };
  }

  const db = knex(config)

  // No event listeners for bare-minimum setup
  console.log('Database client configured.')
  app.set('mssqlClient', db)
}
