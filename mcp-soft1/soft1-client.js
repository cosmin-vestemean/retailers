/**
 * Soft1 Web Service Client
 * Handles login, authentication, and SQL query execution
 * against the Pet Factory Soft1 ERP system.
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// MCP servers are launched without a shell profile, so load mcp-soft1/.env when present.
const ENV_FILE = join(dirname(fileURLToPath(import.meta.url)), '.env')
if (existsSync(ENV_FILE)) {
  try {
    process.loadEnvFile(ENV_FILE)
  } catch {
    // Node < 20.12 has no loadEnvFile; the explicit env vars below are then required.
  }
}

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in the MCP server env or in mcp-soft1/.env (see .env.example).`,
    )
  }
  return value
}

const BASE_URL = process.env.S1_BASE_URL ?? 'https://petfactory.oncloud.gr/s1services'
const SQL_ENDPOINT = `${BASE_URL}/JS/Utile/getSQLDataSet`
const APP_ID = process.env.S1_APP_ID ?? '1001'

const CREDENTIALS = {
  get username() {
    return required('S1_USERNAME')
  },
  get password() {
    return required('S1_PASSWORD')
  },
  appId: APP_ID,
}

const AUTH_TARGET = {
  company: process.env.S1_COMPANY ?? '50',
  branch: process.env.S1_BRANCH ?? '1000',
  module: '0',
  refid: process.env.S1_REFID ?? '1000',
  userid: '1000',
  appId: APP_ID,
}

export class Soft1Client {
  constructor() {
    this.clientID = null
    this.lastAuthTime = 0
    this.SESSION_TTL_MS = 25 * 60 * 1000 // 25 min
  }

  async connect() {
    const loginBody = {
      service: 'login',
      ...CREDENTIALS,
      COMPANY: AUTH_TARGET.company,
      BRANCH: AUTH_TARGET.branch,
      MODULE: AUTH_TARGET.module,
      REFID: AUTH_TARGET.refid,
    }

    const loginRes = await this._post(BASE_URL, loginBody)

    if (!loginRes.success) {
      throw new Error(`Login failed: ${loginRes.error?.message || 'Unknown error'}`)
    }

    this.clientID = loginRes.clientID
    this.lastAuthTime = Date.now()
    return this.clientID
  }

  async connectTwoStep() {
    const loginRes = await this._post(BASE_URL, { service: 'login', ...CREDENTIALS })

    if (!loginRes.success) {
      throw new Error(`Login failed: ${loginRes.error?.message || 'Unknown error'}`)
    }

    const authRes = await this._post(BASE_URL, {
      service: 'authenticate',
      clientID: loginRes.clientID,
      ...AUTH_TARGET,
    })

    if (!authRes.success) {
      throw new Error(`Authentication failed: ${authRes.error?.message || 'Unknown error'}`)
    }

    this.clientID = authRes.clientID
    this.lastAuthTime = Date.now()
    return this.clientID
  }

  async ensureConnected() {
    const elapsed = Date.now() - this.lastAuthTime
    if (!this.clientID || elapsed > this.SESSION_TTL_MS) {
      try {
        await this.connect()
      } catch {
        await this.connectTwoStep()
      }
    }
  }

  async executeSqlRaw(query) {
    await this.ensureConnected()

    const body = { clientID: this.clientID, appId: APP_ID, query }

    const res = await fetch(SQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await res.text()

    // Check for session expiration
    try {
      const parsed = JSON.parse(text)
      if (parsed.error && parsed.error.code && parsed.error.code < 0) {
        this.clientID = null
        await this.ensureConnected()
        body.clientID = this.clientID

        const retryRes = await fetch(SQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        return await retryRes.text()
      }
    } catch {
      // Not JSON - return as-is
    }

    return text
  }

  async callService(serviceBody) {
    await this.ensureConnected()
    return this._post(BASE_URL, { ...serviceBody, clientID: this.clientID, appId: APP_ID })
  }

  async _post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
}
