import { AuthenticationService, JWTStrategy, AuthenticationBaseStrategy } from '@feathersjs/authentication'
import { NotAuthenticated } from '@feathersjs/errors'
import fetch from 'node-fetch'
import { buildS1Url } from './s1-base-url.js'
import { verifyHubSsoToken } from './hub-sso-token.js'

const USER_LOOKUP_PATH = '/JS/JSRetailers/processSqlAsDataset1'
const VALIDATE_PASSWORD_PATH = '/JS/JSRetailers/validatePassword'

async function authenticateS1User(app, userId, password) {
  const numericUserId = Number.parseInt(userId, 10)
  if (!Number.isInteger(numericUserId) || numericUserId <= 0 || !password) {
    throw new NotAuthenticated('User and password are required')
  }

  const sqlQuery = `SELECT b.users, b.code, b.name, b.SOPASSWORD
    FROM webaccountlns a
    INNER JOIN users b ON a.luser = b.users
    WHERE a.webservice = 1001 AND a.webaccount = 4 AND b.users = ${numericUserId}`

  const lookupResponse = await fetch(buildS1Url(USER_LOOKUP_PATH, { app }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sqlQuery })
  })
  const lookupResult = await lookupResponse.json()
  if (!lookupResult.success || !lookupResult.data?.length) {
    throw new NotAuthenticated('Invalid credentials')
  }

  const row = lookupResult.data[0]
  const encryptedPassword = row.SOPASSWORD ?? row.sopassword
  if (!encryptedPassword) {
    throw new NotAuthenticated('Invalid credentials')
  }

  const validateResponse = await fetch(buildS1Url(VALIDATE_PASSWORD_PATH, { app }), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stringToValidate: password, encryptedPassword })
  })
  const validateResult = await validateResponse.json()
  if (!validateResult.success || !validateResult.valid) {
    throw new NotAuthenticated('Invalid credentials')
  }

  return {
    userId: Number(row.users ?? row.USERS),
    username: row.code ?? row.CODE ?? null,
    name: row.name ?? row.NAME ?? ''
  }
}

class S1Strategy extends AuthenticationBaseStrategy {
  async authenticate(data) {
    const user = await authenticateS1User(this.app, data?.userId, data?.password)
    return {
      authentication: { strategy: 's1' },
      payload: user,
      user
    }
  }
}

class HubSsoStrategy extends AuthenticationBaseStrategy {
  async authenticate(data) {
    try {
      const user = verifyHubSsoToken(data?.token || data?.hubToken, 'retailers')
      return {
        authentication: { strategy: 'hub-sso' },
        payload: user,
        user
      }
    } catch (err) {
      throw new NotAuthenticated(err.message || 'Invalid Hub SSO token')
    }
  }
}

class RetailersJwtStrategy extends JWTStrategy {
  async authenticate(authentication, params) {
    const result = await super.authenticate(authentication, params)
    const payload = result?.authentication?.payload || {}
    return {
      ...result,
      user: {
        userId: Number(payload.userId),
        username: payload.username || null,
        name: payload.name || ''
      }
    }
  }
}

export const authentication = (app) => {
  const service = new AuthenticationService(app)
  service.register('jwt', new RetailersJwtStrategy())
  service.register('s1', new S1Strategy())
  service.register('hub-sso', new HubSsoStrategy())
  app.use('authentication', service)
}