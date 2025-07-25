// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import knex from 'knex'
import { SocksClient } from 'socks'

export const mssql = (app) => {
  const config = app.get('mssql')

  // Enhanced Fixie SOCKS configuration
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

    // Override the connection with a custom stream (≥3 încercări)
    config.connection.stream = async function () {
      const maxRetries = 3
      const baseDelay = 1000

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const destination = { host: config.connection.server, port: config.connection.port || 1433 };
          console.log(`[Attempt ${attempt}] Connecting to proxy with destination:`, destination);

          const { socket } = await SocksClient.createConnection({
            proxy: { host: proxyHost, port: +proxyPort, type: 5, userId: username, password },
            destination: destination,
            timeout: 30000, // Increased timeout
            command: 'connect'
          })
          console.log(`[Attempt ${attempt}] SOCKS connection successful. Returning socket.`);
          return socket
        } catch (err) {
          console.error(`[Attempt ${attempt}] SOCKS connection failed:`, err.message);
          if (attempt === maxRetries) {
            console.error('All SOCKS connection attempts failed.');
            throw err;
          }
          const delay = baseDelay * attempt;
          console.log(`Waiting ${delay}ms before retrying...`);
          await new Promise(r => setTimeout(r, delay)) // back-off liniar
        }
      }
    }
    
    // Enhanced connection pool settings for proxy connections
    config.pool = {
      ...config.pool,
      min: 1, // Reduced minimum connections for SOCKS
      max: 5, // Reduced maximum connections to prevent pool exhaustion
      acquireTimeoutMillis: 30000, // Reduced timeout
      createTimeoutMillis: 20000, // Reduced timeout
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 20000, // Shorter idle timeout for SOCKS connections
      createRetryIntervalMillis: 2000,
      propagateCreateError: true // Propagate connection creation errors immediately
    }
  }

  const db = knex(config)

  // Enhanced connection event logging
  db.on('query', (queryData) => {
    const truncatedQuery = queryData.sql.substring(0, 100)
    const suffix = queryData.sql.length > 100 ? '...' : ''
    console.log(`📊 SQL Query: ${truncatedQuery}${suffix}`)
  })

  db.on('query-error', (error, queryData) => {
    console.error(`❌ SQL Error: ${error.message}`)
    console.error(`Query: ${queryData.sql.substring(0, 100)}...`)
  })

  // Additional connection monitoring
  db.on('query-response', (response, queryData, builder) => {
    if (queryData.sql.includes('SELECT') && response.length > 1000) {
      console.log(`📈 Large result set: ${response.length} rows`)
    }
  })

  // Connection pool monitoring for SOCKS connections
  if (process.env.FIXIE_SOCKS_HOST) {
    console.log('🔧 Setting up connection pool monitoring for SOCKS proxy...')
    
    // Monitor pool state every 30 seconds
    setInterval(() => {
      const pool = db.client.pool
      console.log(`📊 Connection Pool Status:`)
      console.log(`  - Total: ${pool.numUsed() + pool.numFree()}/${pool.max}`)
      console.log(`  - Used: ${pool.numUsed()}`)
      console.log(`  - Free: ${pool.numFree()}`)
      console.log(`  - Pending: ${pool.numPendingAcquires()}`)
      console.log(`  - Pending Creates: ${pool.numPendingCreates()}`)
    }, 30000)

    // Handle pool errors
    db.client.pool.on('createError', (err) => {
      console.error('❌ Pool create error:', err.message)
      console.error('This may indicate SOCKS connection issues')
    })

    db.client.pool.on('acquireTimeout', (err) => {
      console.error('⏰ Pool acquire timeout:', err.message)
      console.error('Pool may be exhausted due to failed SOCKS connections')
    })
  }

  console.log('Database client configured and ready')
  app.set('mssqlClient', db)
}
