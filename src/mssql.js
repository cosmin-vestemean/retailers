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
      acquireTimeoutMillis: 60000, // Increased timeout for proxy connections
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      createRetryIntervalMillis: 2000
    }

    // Configure SQL Server connection options for proxy connections
    config.connection.options = {
      ...config.connection.options,
      connectTimeout: 60000, // 60 seconds for initial connection
      requestTimeout: 60000,  // 60 seconds for queries
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

  console.log('Database client configured and ready')
  app.set('mssqlClient', db)
}
