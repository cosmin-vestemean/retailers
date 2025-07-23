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

    console.log('Configuring database connection through Fixie SOCKS proxy...')

    // Override the connection with a custom stream
    config.connection.stream = async function() {
      try {
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
        
        console.log('SOCKS connection established to database')
        return info.socket
      } catch (error) {
        console.error('Failed to establish SOCKS connection:', error)
        throw error
      }
    }
  }

  const db = knex(config)

  app.set('mssqlClient', db)
}
