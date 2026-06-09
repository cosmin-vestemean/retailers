// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { feathers } from '@feathersjs/feathers'
import configuration from '@feathersjs/configuration'
import { koa, rest, bodyParser, errorHandler, parseAuthentication, cors, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'

import { configurationValidator } from './configuration.js'
import { logError } from './hooks/log-error.js'
import { getEdiScannerMode, isScannerEnabled } from './edi/scanner-flags.js'
import { authentication } from './authentication.js'
import { readAuthCookie, setAuthCookie, clearAuthCookie } from './auth-cookie.js'

import { services } from './services/index.js'
import { channels } from './channels.js'

const app = koa(feathers())
app.proxy = process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === '1'
const UI_PREFIX = '/app'

// --- Start of new metrics logic ---

// In-memory store for monthly metrics. Resets on app restart.
const monthlyMetrics = {
  count: 0,
  lastResetMonth: new Date().getMonth(), // 0-11
  lastResetYear: new Date().getFullYear()
}

// Function to log the daily report
const logDailyReport = () => {
  const today = new Date().toISOString().slice(0, 10)
  console.log(`[METRICS REPORT ${today}] Requests this month so far: ${monthlyMetrics.count}`)
}

// Log the report once on startup
logDailyReport()

// Schedule the report to run every 24 hours
setInterval(logDailyReport, 24 * 60 * 60 * 1000)

// Expanded logging middleware
app.use(async (ctx, next) => {
  const start = Date.now()

  // Check if the month has changed
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  if (currentYear > monthlyMetrics.lastResetYear || (currentYear === monthlyMetrics.lastResetYear && currentMonth > monthlyMetrics.lastResetMonth)) {
    console.log(`[Metrics] New month detected. Resetting monthly counter.`)
    monthlyMetrics.count = 0 // Reset the counter
    monthlyMetrics.lastResetMonth = currentMonth
    monthlyMetrics.lastResetYear = currentYear
  }

  monthlyMetrics.count++ // Increment for the current request

  await next() // Process the actual request

  const ms = Date.now() - start
  // Log individual request timing
  console.log(`${ctx.method} ${ctx.status} ${ctx.url} - ${ms}ms`)
})

// --- End of new metrics logic ---

// Load our app configuration (see config/ folder)
app.configure(configuration(configurationValidator))

const spaEntryPath = resolve(app.get('public'), 'index.html')
const legacyUiRedirects = [
  { pattern: /^\/$/, target: () => UI_PREFIX },
  { pattern: /^\/retailer\/([^/]+)$/, target: ([, trdr]) => `${UI_PREFIX}/retailer/${trdr}` },
  { pattern: /^\/config\/([^/]+)$/, target: ([, trdr]) => `${UI_PREFIX}/config/${trdr}` },
  { pattern: /^\/logs$/, target: () => `${UI_PREFIX}/logs` },
]

const uiRoutePattern = new RegExp(`^${UI_PREFIX}(?:$|/)`)

const isSpaNavigationRequest = (ctx) => {
  if (ctx.method !== 'GET') return false
  if (!ctx.accepts('html')) return false
  if (ctx.path.startsWith('/assets/') || ctx.path.startsWith('/socket.io/')) return false
  if (/\.[a-z0-9]+$/i.test(ctx.path)) return false

  return uiRoutePattern.test(ctx.path)
}

const getLegacyUiRedirect = (ctx) => {
  if (ctx.method !== 'GET') return null
  if (!ctx.accepts('html')) return null

  for (const route of legacyUiRedirects) {
    const match = ctx.path.match(route.pattern)
    if (match) {
      return route.target(match)
    }
  }

  return null
}

// Set up Koa middleware
app.use(cors({ origin: (ctx) => {
  const reqOrigin = ctx.get('Origin')
  const allowed = app.get('origins') || []
  return allowed.includes(reqOrigin) ? reqOrigin : allowed[0] || false
}}))
app.use(async (ctx, next) => {
  const redirectTarget = getLegacyUiRedirect(ctx)
  if (redirectTarget) {
    ctx.redirect(redirectTarget)
    return
  }

  if (!isSpaNavigationRequest(ctx)) {
    return next()
  }

  ctx.type = 'html'
  ctx.body = await readFile(spaEntryPath, 'utf8')
})
app.use(serveStatic(app.get('public')))
app.use(serveStatic('./public/'))
app.use(errorHandler())
app.use(parseAuthentication())
app.use(readAuthCookie())
app.use(bodyParser())

// Configure services and transports
app.configure(rest())
app.configure(
  socketio({
    cors: {
      origin: app.get('origins')
    }
  })
)
app.configure(channels)
app.configure(authentication)

app.configure(services)

app.service('authentication').hooks({
  after: {
    create: [setAuthCookie],
    remove: [clearAuthCookie]
  }
})

// Register hooks that run on all service methods
app.hooks({
  around: {
    all: [logError]
  },
  before: {},
  after: {},
  error: {}
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

//scanPeriodically run
const enableScanner = isScannerEnabled()
// EDI_SCANNER controls which pipeline runs:
//   'new' (default) → src/edi scanner (multi-provider, hardened)
//   'legacy'        → old src/services/sftp scanner
//   'both'          → run both (transition / parity testing only)
const ediScannerMode = getEdiScannerMode()
if (enableScanner) {
  if (ediScannerMode === 'legacy' || ediScannerMode === 'both') {
    console.log('[scanner] legacy SFTP scanner ENABLED')
    app.service('sftp').scanPeriodically({}, {})
  }
  if (ediScannerMode === 'new' || ediScannerMode === 'both') {
    console.log('[scanner] new EDI scanner ENABLED (multi-provider)')
    app.service('edi').scanPeriodically({})
  }
} else {
  console.log('SFTP/EDI scanner DISABLED (set ENABLE_SFTP_SCANNER=true to enable scheduling)')
}

const doRetryIntervalMs = parseInt(process.env.DO_RETRY_INTERVAL_MS) || 0
if (doRetryIntervalMs > 0) {
  app.service('do-storage').retryPeriodically({ intervalMs: doRetryIntervalMs })
  console.log(`[do-storage] retry loop ENABLED (${doRetryIntervalMs}ms)`)
}

// Modified middleware to track only database requests
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start

  // Only log database-related services
  const dbServices = ['getDataset', 'getS1SqlData']
  if (dbServices.some(service => ctx.url.includes(service))) {
    console.log(`DB ${ctx.method} ${ctx.status} ${ctx.url} - ${ms}ms`)
  }
})

export { app }

/*
CREATE TABLE CCCEDIPROVIDER (
    CCCEDIPROVIDER INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    NAME VARCHAR(50),
    CONNTYPE INT NOT NULL
)
*/

//test sftp.createOrders
//app.service('sftp').createOrders({}, {})
