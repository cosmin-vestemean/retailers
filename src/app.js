// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { feathers } from '@feathersjs/feathers'
import configuration from '@feathersjs/configuration'
import { koa, rest, bodyParser, errorHandler, parseAuthentication, cors, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'

import { configurationValidator } from './configuration.js'
import { logError } from './hooks/log-error.js'
import { mssql } from './mssql.js'

import { services } from './services/index.js'
import { channels } from './channels.js'

const app = koa(feathers())

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
const spaRoutes = [
  /^\/$/,
  /^\/retailer\/[^/]+$/,
  /^\/config\/[^/]+$/,
  /^\/logs$/
]

const isSpaNavigationRequest = (ctx) => {
  if (ctx.method !== 'GET') return false
  if (!ctx.accepts('html')) return false
  if (ctx.path.startsWith('/assets/') || ctx.path.startsWith('/socket.io/')) return false
  if (/\.[a-z0-9]+$/i.test(ctx.path)) return false

  return spaRoutes.some((route) => route.test(ctx.path))
}

// Set up Koa middleware
app.use(cors({ origin: (ctx) => {
  const reqOrigin = ctx.get('Origin')
  const allowed = app.get('origins') || []
  return allowed.includes(reqOrigin) ? reqOrigin : allowed[0] || false
}}))
app.use(async (ctx, next) => {
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
app.configure(mssql)

app.configure(services)

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
const enableScanner = (process.env.ENABLE_SFTP_SCANNER || 'true').toLowerCase() === 'true'
if (enableScanner) {
  console.log('SFTP scanner ENABLED - will poll for EDI files')
  app.service('sftp').scanPeriodically({}, {})
} else {
  console.log('SFTP scanner DISABLED (ENABLE_SFTP_SCANNER=' + process.env.ENABLE_SFTP_SCANNER + ')')
}

// Modified middleware to track only database requests
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start

  // Only log database-related services
  const dbServices = ['CCCORDERSLOG', 'CCCSFTPXML', 'getDataset', 'getS1SqlData']
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
