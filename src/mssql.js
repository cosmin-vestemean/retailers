// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import knex from 'knex'
import { SocksClient } from 'socks'

export const mssql = (app) => {
  const config = app.get('mssql')

  // If Fixie SOCKS is configured (on Heroku), route connection through proxy
  if (process.env.FIXIE_SOCKS_HOST) {
    const fixieUrl = process.env.FIXIE_SOCKS_HOST
    
    // Parse the Fixie URL format: username:password@host:port
    const [authPart, hostPart] = fixieUrl.split('@')
    const [username, password] = authPart.split(':')
    const [proxyHost, proxyPort] = hostPart.split(':')

    console.log('=== FIXIE SOCKS CONFIGURATION ===')
    console.log(`Proxy Host: ${proxyHost}`)
    console.log(`Proxy Port: ${proxyPort}`)
    console.log(`Database Target: ${config.connection.server}:${config.connection.port || 1433}`)
    console.log(`Database: ${config.connection.database}`)
    console.log('=== STARTING PROXY CONNECTION ===')

    // Override the connection with a custom stream
    config.connection.stream = async function() {
      const startTime = Date.now()
      console.log(`[${new Date().toISOString()}] Attempting SOCKS connection...`)
      
      try {
        console.log('Step 1: Connecting to Fixie SOCKS proxy...')
        const info = await SocksClient.createConnection({
          proxy: {
            host: proxyHost,
            port: parseInt(proxyPort),
            type: 5, // SOCKS5
            userId: username,
            password: password
          },
          destination: {
            host: config.connection.server,
            port: config.connection.port || 1433
          },
          // Add a timeout (e.g., 15 seconds) for faster failure
          timeout: 15000 
        })
        
        const connectionTime = Date.now() - startTime
        console.log(`✅ SUCCESS: SOCKS connection established in ${connectionTime}ms`)
        console.log(`Database socket ready for SQL Server communication`)
        return info.socket
      } catch (error) {
        const connectionTime = Date.now() - startTime
        console.error(`❌ FAILED: SOCKS connection failed after ${connectionTime}ms`)
        console.error(`Error Type: ${error.name}`)
        console.error(`Error Message: ${error.message}`)
        console.error('=== TROUBLESHOOTING INFO ===')
        console.error('1. Check if Fixie static IPs are whitelisted in database firewall')
        console.error('2. Verify database server is accepting connections on port 1433')
        console.error('3. Confirm database server IP is correct: ' + config.connection.server)
        console.error('===========================')
        throw error
      }
    }
  }

  const db = knex(config)

  // Add connection event logging
  db.on('query', (queryData) => {
    console.log(`📊 SQL Query: ${queryData.sql.substring(0, 100)}${queryData.sql.length > 100 ? '...' : ''}`)
  })

  db.on('query-error', (error, queryData) => {
    console.error(`❌ SQL Error: ${error.message}`)
    console.error(`Query: ${queryData.sql.substring(0, 100)}...`)
  })

  console.log('Database client configured and ready')
  app.set('mssqlClient', db)
}
