// For more information about this file see https://dove.feathersjs.com/guides/cli/databases.html
import knex from 'knex'

export const mssql = (app) => {
  const config = app.get('mssql')

  // Fixie SOCKS configuration following Heroku official documentation
  if (process.env.FIXIE_SOCKS_HOST) {
    const fixieUrl = process.env.FIXIE_SOCKS_HOST
    
    // Parse using Heroku's recommended regex pattern: [/(:\\/@)/]+
    const fixieValues = fixieUrl.split(new RegExp('[/(:\\/@)/]+'))
    
    console.log('=== FIXIE SOCKS CONFIGURATION (Heroku Pattern) ===')
    console.log(`Raw FIXIE_SOCKS_HOST: ${fixieUrl}`)
    console.log(`Parsed Values: [${fixieValues.join(', ')}]`)
    console.log(`User: ${fixieValues[0]}, Pass: ${fixieValues[1]}`)
    console.log(`Proxy: ${fixieValues[2]}:${fixieValues[3]}`)
    console.log(`Target: ${config.connection.server}:${config.connection.port || 1433}`)

    // Use require for CommonJS module (socksjs)
    const SocksConnection = require('socksjs')

    const serverTarget = {
      host: config.connection.server,
      port: config.connection.port || 1433
    }

    const fixieConnection = new SocksConnection(serverTarget, {
      user: fixieValues[0],
      pass: fixieValues[1], 
      host: fixieValues[2],
      port: parseInt(fixieValues[3])
    })

    // Use the SOCKS connection as stream per Heroku PostgreSQL example
    config.connection.stream = fixieConnection
    
    console.log('✅ SOCKS connection configured via socksjs (Heroku pattern)')
    
    // Minimal pool for SOCKS connections
    config.pool = {
      min: 1,
      max: 3,
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
