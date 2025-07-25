// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import knex from 'knex'
import { SocksClient } from 'socks'

export const mssql = (app) => {
  const config = app.get('mssql')

  // Simplified Fixie SOCKS configuration following Fixie documentation
  if (process.env.FIXIE_SOCKS_HOST) {
    const fixieUrl = process.env.FIXIE_SOCKS_HOST
    
    // Parse the Fixie URL format: username:password@host:port
    const [authPart, hostPart] = fixieUrl.split('@')
    const [username, password] = authPart.split(':')
    const [proxyHost, proxyPort] = hostPart.split(':')

    console.log('=== FIXIE SOCKS CONFIGURATION ===')
    console.log(`Proxy: ${proxyHost}:${proxyPort}`)
    console.log(`Target: ${config.connection.server}:${config.connection.port || 1433}`)
    console.log(`Database: ${config.connection.database}`)

    // Simple SOCKS stream function without retries to ensure single connection path
    config.connection.stream = async function () {
      console.log('Creating SOCKS connection through Fixie proxy...')
      
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
      
      console.log('✅ SOCKS connection established via Fixie')
      return socket
    }
    
    // Minimal pool configuration to avoid connection multiplexing issues
    config.pool = {
      min: 1,
      max: 3, // Keep very low to ensure all connections go through SOCKS
      acquireTimeoutMillis: 15000,
      createTimeoutMillis: 15000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      propagateCreateError: true
    }
  }

  const db = knex(config)

  // Basic connection logging
  db.on('query', (queryData) => {
    const truncatedQuery = queryData.sql.substring(0, 100)
    const suffix = queryData.sql.length > 100 ? '...' : ''
    console.log(`📊 SQL Query: ${truncatedQuery}${suffix}`)
  })

  db.on('query-error', (error, queryData) => {
    console.error(`❌ SQL Error: ${error.message}`)
  })

  // Simple connection monitoring for SOCKS
  if (process.env.FIXIE_SOCKS_HOST) {
    console.log('🔧 SOCKS proxy enabled - all connections will use Fixie static IP')
    
    // Log connection pool events that might indicate bypass
    db.client.pool.on('createError', (err) => {
      console.error('❌ Connection creation failed - may indicate SOCKS bypass:', err.message)
    })
  }

  console.log('Database client configured and ready')
  app.set('mssqlClient', db)
}
