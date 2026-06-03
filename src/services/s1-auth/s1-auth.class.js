import fetch from 'node-fetch'
import { buildS1Url } from '../../s1-base-url.js'
import { verifyHubSsoToken } from '../../hub-sso-token.js'

export class S1AuthService {
  constructor(options) {
    this.options = options
  }

  async create(data, params) {
    const { hubToken, userId, password } = data

    if (hubToken) {
      try {
        const user = verifyHubSsoToken(hubToken, 'retailers')
        return {
          success: true,
          user: {
            userId: user.userId,
            name: user.name
          }
        }
      } catch (err) {
        return { success: false, message: err.message || 'Invalid Hub SSO token' }
      }
    }

    if (!userId || !password) {
      return { success: false, message: 'User and password are required' }
    }

    // Step 1: Find the user and get the encrypted password from S1
    const sqlQuery = `SELECT b.users, b.name, b.SOPASSWORD 
      FROM webaccountlns a
      INNER JOIN users b ON a.luser = b.users
      WHERE a.webservice = 1001 AND a.webaccount = 4 AND b.users = ${parseInt(userId)}`

    const url = buildS1Url('/JS/JSRetailers/processSqlAsDataset1', { app: this.options.app })
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ sqlQuery })
    })
    const userResult = await response.json()

    if (!userResult.success || userResult.total === 0) {
      return { success: false, message: 'Invalid credentials' }
    }

    const user = userResult.data[0]

    // Step 2: Validate password using S1 PASSWORDVALIDATE via AJS endpoint
    const validateUrl = buildS1Url('/JS/JSRetailers/validatePassword', { app: this.options.app })
    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      body: JSON.stringify({
        stringToValidate: password,
        encryptedPassword: user.SOPASSWORD
      })
    })
    const validateResult = await validateResponse.json()

    if (validateResult.success && validateResult.valid) {
      return {
        success: true,
        user: {
          userId: user.users,
          name: user.name
        }
      }
    }

    return { success: false, message: 'Invalid credentials' }
  }
}

export const getOptions = (app) => {
  return { app }
}
