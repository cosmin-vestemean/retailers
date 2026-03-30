/**
 * Centralized API service layer.
 * All FeathersJS communication goes through this module —
 * no UI component should import the feathers client directly.
 */
import { feathers } from '@feathersjs/client'
import io from 'socket.io-client'

// --------------- Feathers client setup ---------------

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  || 'https://retailers1-0691020d207c.herokuapp.com'

// In dev mode, connect to same origin so Vite proxy handles /socket.io.
// In production, connect directly to the backend.
const socket = import.meta.env.DEV
  ? io()
  : io(BACKEND_URL)
const client = feathers()
const socketClient = feathers.socketio(socket)
client.configure(socketClient)

// Register all backend services once
const SERVICES = {
  // SFTP operations
  sftp: {
    methods: ['downloadXml', 'storeXmlInDB', 'uploadXml',
              'storeAperakInErpMessages', 'createOrders', 'scanNow'],
    events: ['uploadResult'],
  },
  // CRUD services
  retailer: {},
  storeXml: {},
  CCCSFTP: {},
  CCCDOCUMENTES1MAPPINGS: {},
  CCCXMLS1MAPPINGS: {},
  CCCRETAILERSCLIENTS: {},
  CCCSFTPXML: {},
  CCCAPERAK: {},
  // S1 integration
  connectToS1: {},
  setDocument: {},
  getDataset: {},
  getDataset1: {},
  getS1ObjData: {},
  getS1SqlData: {},
  getInvoiceDom: {},
  // Auth & email
  sendEmail: { methods: ['create'] },
  's1-users': { methods: ['find'] },
  's1-auth': { methods: ['create'] },
  // Logs
  'orders-log': { methods: ['find'] },
}

const CRUD_METHODS = ['find', 'get', 'create', 'update', 'patch', 'remove']

for (const [name, opts] of Object.entries(SERVICES)) {
  const methods = opts.methods || CRUD_METHODS
  const config = { methods }
  if (opts.events) config.events = opts.events
  client.use(name, socketClient.service(name), config)
}

// --------------- Auth helpers ---------------

let _cachedToken = null

/** Get an S1 authentication token (cached for the session). */
export async function getToken() {
  if (_cachedToken) return _cachedToken
  const result = await client.service('connectToS1').find()
  _cachedToken = result.token
  return _cachedToken
}

/** Clear the cached auth token (e.g. on logout). */
export function clearToken() {
  _cachedToken = null
}

/** Fetch the list of S1 users for the login screen. */
export async function getUsers() {
  return client.service('s1-users').find()
}

/** Authenticate with userId + password. */
export async function login(userId, password) {
  return client.service('s1-auth').create({ userId: parseInt(userId), password })
}

// --------------- Dataset (direct DB) ---------------

/** Run a raw SQL query via getDataset service. */
export async function getDataset(sqlQuery) {
  return client.service('getDataset').find({ query: { sqlQuery } })
}

/** Run a raw SQL query via getDataset1 (returns rows). */
export async function getDataset1(sqlQuery) {
  return client.service('getDataset1').find({ query: { sqlQuery } })
}

// --------------- Orders ---------------

/** Fetch orders from S1 via SQL script. */
export async function getOrders(trdr) {
  const clientID = await getToken()
  return client.service('getS1SqlData').find({
    query: { clientID, appID: '1001', SqlName: 'getOrdersData', trdr },
  })
}

/** Fetch orders from direct DB (Fixie SOCKS fallback). */
export async function getOrdersDirect(trdr, limit = 50) {
  return client.service('CCCSFTPXML').find({
    query: { TRDR_RETAILER: trdr, $limit: limit, $sort: { XMLDATE: -1 } },
  })
}

/** Download remote XMLs and store them in DB. */
export async function downloadAndStoreOrders(trdr) {
  await client.service('sftp').downloadXml({}, {
    query: { retailer: trdr, rootPath: 'data/order', startsWith: 'ORDERS_' },
  })
  await client.service('sftp').storeXmlInDB({}, {
    query: { retailer: trdr, rootPath: 'data/order' },
  })
}

/** Send an order to S1 (setDocument wrapper). */
export async function sendOrderToS1(data) {
  const clientID = await getToken()
  return client.service('setDocument').create({ clientID, ...data })
}

// --------------- Invoices ---------------

/** Fetch invoices from S1. */
export async function getInvoices(trdr, { sosource = 1351, fprms = 712, series = 7121, daysOlder = 7 } = {}) {
  const clientID = await getToken()
  return client.service('getS1SqlData').find({
    query: { clientID, appID: '1001', SqlName: 'Retailers_Index_Docs', trdr, sosource, fprms, series, daysOlder },
  })
}

/** Generate an invoice XML DOM. */
export async function getInvoiceDom(params) {
  const clientID = await getToken()
  return client.service('getInvoiceDom').find({
    query: { clientID, ...params },
  })
}

/** Upload invoice XML via SFTP. */
export async function uploadInvoice(findoc, xml, filename, trdr) {
  return client.service('sftp').uploadXml(
    { findoc, xml, filename },
    { query: { retailer: trdr } },
  )
}

/** Mark a document as sent in S1 (setData on SALDOC). */
export async function markDocumentSent(findoc, xmlFilename) {
  const clientID = await getToken()
  return client.service('setDocument').create({
    service: 'setData',
    clientID,
    appId: '1001',
    OBJECT: 'SALDOC',
    FORM: 'EFIntegrareRetailers',
    KEY: findoc,
    DATA: {
      MTRDOC: [{ CCCXMLSendDate: new Date().toISOString().slice(0, 19).replace('T', ' ') }],
    },
  })
}

// --------------- APERAK ---------------

/** Download and store APERAK responses. */
export async function downloadAperaks(trdr) {
  await client.service('sftp').downloadXml({}, {
    query: { retailer: trdr, rootPath: 'data/aperak', startsWith: 'APERAK_' },
  })
  await client.service('sftp').storeAperakInErpMessages({}, {
    query: { rootPath: 'data/aperak' },
  })
}

/** Fetch APERAK records from DB. */
export async function getAperaks(query) {
  return client.service('CCCAPERAK').find({ query })
}

// --------------- Config / Mappings ---------------

export async function getRetailerClients(query) {
  return client.service('CCCRETAILERSCLIENTS').find({ query })
}

export async function getXmlMappings(query) {
  return client.service('CCCXMLS1MAPPINGS').find({ query })
}

export async function getDocMappings(query) {
  return client.service('CCCDOCUMENTES1MAPPINGS').find({ query })
}

// --------------- SFTP Config ---------------

export async function getSftpConfig(trdr) {
  return client.service('CCCSFTP').find({ query: { TRDR_RETAILER: parseInt(trdr) } })
}

export async function updateSftpConfig(trdr, data) {
  return client.service('CCCSFTP').update(
    { query: { TRDR_RETAILER: parseInt(trdr) } },
    data,
  )
}

// --------------- Doc & XML Mapping CRUD ---------------

export async function createDocMapping(data) {
  return client.service('CCCDOCUMENTES1MAPPINGS').create(data)
}

export async function removeDocMapping(id) {
  return client.service('CCCDOCUMENTES1MAPPINGS').remove(id)
}

export async function createXmlMapping(data) {
  return client.service('CCCXMLS1MAPPINGS').create(data)
}

export async function removeXmlMappings(docMappingId) {
  return client.service('CCCXMLS1MAPPINGS').remove(null, {
    query: { CCCDOCUMENTES1MAPPINGS: docMappingId },
  })
}

// --------------- Generic S1 helpers ---------------

export async function getS1Dataset(sqlName, params = {}) {
  const clientID = await getToken()
  return client.service('getS1SqlData').find({
    query: { clientID, appID: '1001', SqlName: sqlName, ...params },
  })
}

export async function getS1ObjData(params) {
  const clientID = await getToken()
  return client.service('getS1ObjData').find({
    query: { clientID, ...params },
  })
}

// --------------- Scan operations ---------------

/** Trigger a full scan cycle (download + store + create orders + aperaks). */
export async function scanNow() {
  return client.service('sftp').scanNow({}, {})
}

/** Get the last system-level scan entry (TRDR_RETAILER = -1). */
export async function getLastScan() {
  return client.service('orders-log').find({
    query: { trdr: -1, page: 1, pageSize: 1 }
  })
}

// --------------- Orders log ---------------

/** Query paginated, filterable orders log via S1 AJS endpoint. */
export async function getOrdersLog({ trdr, orderid, dateFrom, dateTo, page, pageSize } = {}) {
  return client.service('orders-log').find({
    query: { trdr, orderid, dateFrom, dateTo, page, pageSize }
  })
}

// --------------- Raw client (escape hatch) ---------------

/** Direct access to the FeathersJS client — use sparingly. */
export { client }
