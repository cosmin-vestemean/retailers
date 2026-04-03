import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import fetch from 'node-fetch'

const S1_URL = 'https://petfactory.oncloud.gr/s1services'
const HEROKU_URL = 'https://retailers1-0691020d207c.herokuapp.com'

// ── helpers ──────────────────────────────────────────────────────────────────

async function s1Sql(sqlQuery) {
  const res = await fetch(`${S1_URL}/JS/JSRetailers/processSqlAsDataset1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sqlQuery })
  })
  return res.json()
}

async function heroku(path, body) {
  const res = await fetch(`${HEROKU_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

function formatResult(result) {
  if (!result.success) return `Error: ${result.error || result.message || JSON.stringify(result)}`
  if (!result.data || result.total === 0) return 'No results found.'
  return JSON.stringify(result.data, null, 2)
}

// ── server ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'soft1-petfactory',
  version: '1.0.0'
})

// ── tool: run_sql ─────────────────────────────────────────────────────────────

server.tool(
  'run_sql',
  'Run a SELECT SQL query against the PetFactory Soft1 ERP database (MSSQL). Returns rows as JSON.',
  { sqlQuery: z.string().describe('The SQL SELECT statement to execute') },
  async ({ sqlQuery }) => {
    const result = await s1Sql(sqlQuery)
    return { content: [{ type: 'text', text: formatResult(result) }] }
  }
)

// ── tool: lookup_trdr ─────────────────────────────────────────────────────────

server.tool(
  'lookup_trdr',
  'Look up a trader (TRDR) in Soft1 by name, tax ID (AFM), GLN/EAN location code, or TRDR numeric ID.',
  {
    name: z.string().optional().describe('Partial or full company name (uses LIKE)'),
    afm: z.string().optional().describe('Tax ID / CUI (AFM field)'),
    gln: z.string().optional().describe('GLN / EAN-13 location code (searches TRDBRANCH.CCCS1DXGLN)'),
    trdr: z.number().optional().describe('Numeric TRDR primary key')
  },
  async ({ name, afm, gln, trdr }) => {
    if (!name && !afm && !gln && !trdr) {
      return { content: [{ type: 'text', text: 'Provide at least one search parameter.' }] }
    }

    let result

    if (gln) {
      // GLN lives in TRDBRANCH
      result = await s1Sql(
        `SELECT b.TRDR, b.CODE, b.NAME, b.AFM, tb.CCCS1DXGLN, tb.NAME AS BRANCH_NAME
         FROM TRDBRANCH tb
         INNER JOIN TRDR b ON tb.TRDR = b.TRDR
         WHERE tb.CCCS1DXGLN = '${gln.replace(/'/g, "''")}'`
      )
    } else {
      const conditions = []
      if (trdr) conditions.push(`TRDR = ${trdr}`)
      if (afm)  conditions.push(`AFM = '${afm.replace(/'/g, "''")}'`)
      if (name) conditions.push(`NAME LIKE '%${name.replace(/'/g, "''").replace(/%/g, '')}%'`)

      result = await s1Sql(
        `SELECT TRDR, CODE, NAME, AFM, ISACTIVE, SODTYPE
         FROM TRDR
         WHERE ${conditions.join(' AND ')}
         ORDER BY ISACTIVE DESC, TRDR`
      )
    }

    return { content: [{ type: 'text', text: formatResult(result) }] }
  }
)

// ── tool: get_orders ──────────────────────────────────────────────────────────

server.tool(
  'get_orders',
  'Get recent orders stored in CCCSFTPXML for a given retailer TRDR.',
  {
    trdr: z.number().describe('Retailer TRDR numeric ID'),
    days: z.number().optional().describe('How many days back to look (default 30)'),
    page: z.number().optional().describe('Page number (default 1)'),
    pageSize: z.number().optional().describe('Rows per page, max 100 (default 25)')
  },
  async ({ trdr, days = 30, page = 1, pageSize = 25 }) => {
    const result = await s1Sql(
      `SELECT TOP ${Math.min(pageSize, 100)}
         c.CCCSFTPXML, c.TRDR_RETAILER, c.XMLFILENAME,
         FORMAT(c.XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE,
         ISNULL(c.FINDOC, 0) AS FINDOC,
         REPLACE(REPLACE(CAST(c.xmldata.query('/Order/ID') AS VARCHAR(MAX)), '<ID>', ''), '</ID>', '') AS OrderId
       FROM CCCSFTPXML c
       WHERE c.TRDR_RETAILER = ${trdr}
         AND c.XMLDATE >= DATEADD(day, -${days}, GETDATE())
       ORDER BY c.XMLDATE DESC
       OFFSET ${(page - 1) * Math.min(pageSize, 100)} ROWS
       FETCH NEXT ${Math.min(pageSize, 100)} ROWS ONLY`
    )
    return { content: [{ type: 'text', text: formatResult(result) }] }
  }
)

// ── tool: inject_order_xml ────────────────────────────────────────────────────

server.tool(
  'inject_order_xml',
  'Inject an XML order file into the CCCSFTPXML database table via the FeathersJS backend. ' +
  'Resolves the retailer TRDR from DeliveryParty/EndpointID (GLN) automatically if trdr_retailer is omitted.',
  {
    xml: z.string().describe('Full XML content of the order file'),
    filename: z.string().describe('Filename to store (e.g. ORDERS_DX01_144_20260403_01004728.xml)'),
    trdr_retailer: z.number().optional().describe('Override retailer TRDR (auto-resolved from GLN if omitted)')
  },
  async ({ xml, filename, trdr_retailer }) => {
    // Strip XML declaration and whitespace (mirrors storeXmlInDB logic in app.js)
    let xmlClean = xml.replace(/<\?xml.*?\?>/g, '').replace(/[\n\r\t]/g, '')

    // Extract DeliveryParty GLN to resolve TRDR if not provided
    let retailer = trdr_retailer
    if (!retailer) {
      const glnMatch = xmlClean.match(/<DeliveryParty>.*?<EndpointID>(.*?)<\/EndpointID>/s) ||
                       xmlClean.match(/<EndpointID>([\d]+)<\/EndpointID>/)
      if (glnMatch) {
        const gln = glnMatch[1]
        const trdrResult = await s1Sql(
          `SELECT b.TRDR FROM TRDBRANCH tb
           INNER JOIN TRDR b ON tb.TRDR = b.TRDR
           WHERE b.SODTYPE = 13 AND tb.CCCS1DXGLN = '${gln}'`
        )
        if (trdrResult.success && trdrResult.total > 0) {
          retailer = trdrResult.data[0].TRDR
        }
      }
    }

    if (!retailer) {
      return {
        content: [{
          type: 'text',
          text: 'Could not resolve retailer TRDR from GLN. Provide trdr_retailer explicitly.'
        }]
      }
    }

    // Call CCCSFTPXML KnexService directly via REST (bypasses storeXml internal service)
    // First check for duplicate
    const checkRes = await fetch(
      `${HEROKU_URL}/CCCSFTPXML?XMLFILENAME=${encodeURIComponent(filename)}`,
      { headers: { 'Content-Type': 'application/json' } }
    ).then(r => r.json()).catch(() => ({ total: 0 }))

    if (checkRes.total > 0) {
      return { content: [{ type: 'text', text: `Already exists in database: "${filename}"` }] }
    }

    const xmlDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const result = await fetch(`${HEROKU_URL}/CCCSFTPXML`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: retailer,
        XMLDATA: xmlClean,
        JSONDATA: '',
        XMLDATE: xmlDate,
        XMLSTATUS: 'NEW',
        XMLERROR: '',
        XMLFILENAME: filename
      })
    }).then(r => r.json()).catch(err => ({ error: err.message }))

    return {
      content: [{
        type: 'text',
        text: result.CCCSFTPXML
          ? `Injected successfully. CCCSFTPXML=${result.CCCSFTPXML}, TRDR_RETAILER=${retailer}, filename="${filename}".`
          : `Failed: ${result.message || result.error || JSON.stringify(result)}`
      }]
    }
  }
)

// ── start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
