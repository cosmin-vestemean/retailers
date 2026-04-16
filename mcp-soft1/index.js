#!/usr/bin/env node

/**
 * Soft1 MCP Server — Retailers
 *
 * Model Context Protocol server for accessing the Pet Factory
 * Soft1 ERP database, tailored for the Retailers integration project.
 *
 * Transport: stdio
 *
 * Tools:
 *   - run_sql:          Execute a SELECT SQL query
 *   - get_orders:       Get recent orders (CCCSFTPXML) for a retailer
 *   - lookup_trdr:      Look up a trader by name, tax ID, GLN, or TRDR
 *   - inject_order_xml: Inject an XML order into CCCSFTPXML
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { Soft1Client } from './soft1-client.js'

const client = new Soft1Client()

const server = new McpServer({
  name: 'soft1-petfactory',
  version: '1.0.0',
})

// ─── Tool: run_sql ───────────────────────────────────────────────────────────

server.tool(
  'run_sql',
  `Run a SELECT SQL query against the PetFactory Soft1 ERP database (MSSQL). Returns rows as JSON.
Use standard T-SQL syntax. Always include TOP or pagination to avoid huge results.
The database uses COMPANY=50 for Pet Factory SRL.`,
  {
    sqlQuery: z.string().describe('The SQL SELECT statement to execute'),
  },
  async ({ sqlQuery }) => {
    try {
      const upper = sqlQuery.trim().toUpperCase()
      if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
        return {
          content: [{ type: 'text', text: 'Error: Only SELECT queries are allowed.' }],
          isError: true,
        }
      }

      const result = await client.executeSqlRaw(sqlQuery)

      let formatted
      try {
        formatted = JSON.stringify(JSON.parse(result), null, 2)
      } catch {
        formatted = result
      }

      return { content: [{ type: 'text', text: formatted }] }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error executing query: ${error.message || error}` }],
        isError: true,
      }
    }
  }
)

// ─── Tool: get_orders ────────────────────────────────────────────────────────

server.tool(
  'get_orders',
  `Get recent orders stored in CCCSFTPXML for a given retailer TRDR.
Returns order XML records with pagination support.`,
  {
    trdr: z.number().describe('Retailer TRDR numeric ID'),
    days: z.number().optional().describe('How many days back to look (default 30)'),
    page: z.number().optional().describe('Page number (default 1)'),
    pageSize: z.number().optional().describe('Rows per page, max 100 (default 25)'),
  },
  async ({ trdr, days, page, pageSize }) => {
    try {
      const d = days || 30
      const p = page || 1
      const ps = Math.min(pageSize || 25, 100)
      const offset = (p - 1) * ps

      const countSql = `SELECT COUNT(*) AS cnt FROM CCCSFTPXML WHERE TRDR_RETAILER = ${trdr} AND XMLDATE >= DATEADD(day, -${d}, GETDATE())`
      const countRaw = await client.executeSqlRaw(countSql)
      let total = 0
      try {
        const parsed = JSON.parse(countRaw)
        if (parsed.rows && parsed.rows.length) total = parsed.rows[0].cnt || 0
        else if (Array.isArray(parsed) && parsed.length) total = parsed[0].cnt || 0
      } catch { /* ignore */ }

      const dataSql = `SELECT c.CCCSFTPXML, c.TRDR_RETAILER, c.XMLFILENAME, ` +
        `FORMAT(c.XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE, ` +
        `ISNULL(c.FINDOC, 0) AS FINDOC, ` +
        `REPLACE(REPLACE(CAST(c.xmldata.query('/Order/ID') AS VARCHAR(MAX)), '<ID>', ''), '</ID>', '') AS OrderId ` +
        `FROM CCCSFTPXML c WHERE c.TRDR_RETAILER = ${trdr} ` +
        `AND c.XMLDATE >= DATEADD(day, -${d}, GETDATE()) ` +
        `ORDER BY c.XMLDATE DESC ` +
        `OFFSET ${offset} ROWS FETCH NEXT ${ps} ROWS ONLY`

      const dataRaw = await client.executeSqlRaw(dataSql)

      let formatted
      try {
        const parsed = JSON.parse(dataRaw)
        formatted = JSON.stringify({ total, page: p, pageSize: ps, data: parsed }, null, 2)
      } catch {
        formatted = dataRaw
      }

      return { content: [{ type: 'text', text: formatted }] }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || error}` }],
        isError: true,
      }
    }
  }
)

// ─── Tool: lookup_trdr ───────────────────────────────────────────────────────

server.tool(
  'lookup_trdr',
  `Look up a trader (TRDR) in Soft1 by name, tax ID (AFM), GLN/EAN location code, or TRDR numeric ID.`,
  {
    trdr: z.number().optional().describe('Numeric TRDR primary key'),
    name: z.string().optional().describe('Partial or full company name (uses LIKE)'),
    afm: z.string().optional().describe('Tax ID / CUI (AFM field)'),
    gln: z.string().optional().describe('GLN / EAN-13 location code (searches TRDBRANCH.CCCS1DXGLN)'),
  },
  async ({ trdr, name, afm, gln }) => {
    try {
      if (trdr) {
        const sql = `SELECT TOP 10 TRDR, CODE, NAME, AFM, PHONE01, EMAIL FROM TRDR WHERE TRDR = ${trdr}`
        const result = await client.executeSqlRaw(sql)
        return { content: [{ type: 'text', text: result }] }
      }

      if (afm) {
        const safe = afm.replace(/'/g, "''")
        const sql = `SELECT TOP 10 TRDR, CODE, NAME, AFM FROM TRDR WHERE AFM = '${safe}' AND COMPANY = 50`
        const result = await client.executeSqlRaw(sql)
        return { content: [{ type: 'text', text: result }] }
      }

      if (name) {
        const safe = name.replace(/'/g, "''")
        const sql = `SELECT TOP 10 TRDR, CODE, NAME, AFM FROM TRDR WHERE NAME LIKE '%${safe}%' AND COMPANY = 50 ORDER BY NAME`
        const result = await client.executeSqlRaw(sql)
        return { content: [{ type: 'text', text: result }] }
      }

      if (gln) {
        const safe = gln.replace(/'/g, "''")
        const sql = `SELECT TOP 10 b.TRDR, t.CODE, t.NAME, b.CCCS1DXGLN FROM TRDBRANCH b INNER JOIN TRDR t ON b.TRDR = t.TRDR WHERE b.CCCS1DXGLN = '${safe}'`
        const result = await client.executeSqlRaw(sql)
        return { content: [{ type: 'text', text: result }] }
      }

      return {
        content: [{ type: 'text', text: 'Error: Provide at least one of: trdr, name, afm, gln' }],
        isError: true,
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || error}` }],
        isError: true,
      }
    }
  }
)

// ─── Tool: inject_order_xml ──────────────────────────────────────────────────

server.tool(
  'inject_order_xml',
  `Inject an XML order file into the CCCSFTPXML database table via direct SQL INSERT.
Resolves the retailer TRDR from DeliveryParty/EndpointID (GLN) automatically if trdr_retailer is omitted.`,
  {
    xml: z.string().describe('Full XML content of the order file'),
    filename: z.string().describe('Filename to store (e.g. ORDERS_DX01_144_20260403_01004728.xml)'),
    trdr_retailer: z.number().optional().describe('Override retailer TRDR (auto-resolved from GLN if omitted)'),
  },
  async ({ xml, filename, trdr_retailer }) => {
    try {
      let trdr = trdr_retailer

      // Auto-resolve from GLN if not provided
      if (!trdr) {
        const glnMatch = xml.match(/<EndpointID[^>]*>(\d{13})<\/EndpointID>/)
        if (glnMatch) {
          const gln = glnMatch[1]
          const lookupSql = `SELECT TOP 1 TRDR FROM TRDBRANCH WHERE CCCS1DXGLN = '${gln.replace(/'/g, "''")}'`
          const lookupRaw = await client.executeSqlRaw(lookupSql)
          try {
            const parsed = JSON.parse(lookupRaw)
            if (parsed.rows && parsed.rows.length) trdr = parsed.rows[0].TRDR
            else if (Array.isArray(parsed) && parsed.length) trdr = parsed[0].TRDR
          } catch { /* ignore */ }
        }

        if (!trdr) {
          return {
            content: [{ type: 'text', text: 'Error: Could not resolve retailer TRDR from GLN. Provide trdr_retailer explicitly.' }],
            isError: true,
          }
        }
      }

      const safeXml = xml.replace(/'/g, "''")
      const safeName = filename.replace(/'/g, "''")

      const insertSql = `INSERT INTO CCCSFTPXML (TRDR_RETAILER, XMLFILENAME, XMLDATE, XMLDATA) ` +
        `VALUES (${trdr}, '${safeName}', GETDATE(), '${safeXml}')`

      const result = await client.executeSqlRaw(insertSql)
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, trdr_retailer: trdr, filename, result }, null, 2) }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message || error}` }],
        isError: true,
      }
    }
  }
)

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Soft1 MCP Server (Retailers) running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
