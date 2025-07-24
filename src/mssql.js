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

    // Override the connection with a custom stream
    config.connection.stream = async function() {
      const maxRetries = 5; // Increased retries
      const baseDelay = 1000; // Base delay in ms
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const startTime = Date.now()
          console.log(`[${new Date().toISOString()}] Attempting SOCKS connection (${attempt}/${maxRetries})...`)
          
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
            timeout: 20000 // Increased timeout
          })
          
          const connectionTime = Date.now() - startTime
          console.log(`✅ SUCCESS: SOCKS connection established in ${connectionTime}ms`)
          console.log(`Database socket ready for SQL Server communication`)
          return info.socket
          
        } catch (error) {
          const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
          console.error(`❌ SOCKS connection attempt ${attempt} failed: ${error.message}`)
          
          if (attempt === maxRetries) {
            console.error('=== TROUBLESHOOTING INFO ===')
            console.error('1. Verify Fixie static IPs are whitelisted in database firewall')
            console.error('2. Check database server connectivity on port 1433')
            console.error('3. Confirm FIXIE_SOCKS_HOST environment variable format')
            console.error(`4. Database target: ${config.connection.server}:${config.connection.port || 1433}`)
            throw new Error(`Failed to establish SOCKS connection after ${maxRetries} attempts: ${error.message}`)
          }
          
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
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
      idleTimeoutMillis: 15000, // Shorter idle timeout for SOCKS connections
      createRetryIntervalMillis: 2000,
      propagateCreateError: true // Propagate connection creation errors immediately
    }

    // Configure SQL Server connection options for proxy connections
    config.connection.options = {
      ...config.connection.options,
      connectTimeout: 30000, // 30 seconds for initial connection
      requestTimeout: 30000,  // 30 seconds for queries
      cancelTimeout: 5000,    // 5 seconds for cancel requests
      enableArithAbort: true
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
