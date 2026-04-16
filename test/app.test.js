// For more information about this file see https://dove.feathersjs.com/guides/cli/app.test.html
import assert from 'assert'
import axios from 'axios'
import { app } from '../src/app.js'

const port = app.get('port')
const appUrl = `http://${app.get('host')}:${port}`

describe('Feathers application tests', () => {
  let server

  before(async () => {
    server = await app.listen(port)
  })

  after(async () => {
    await app.teardown()
  })

  it('redirects the root URL to the UI prefix', async () => {
    try {
      await axios.get(appUrl, {
        headers: {
          Accept: 'text/html'
        },
        maxRedirects: 0
      })
      assert.fail('should never get here')
    } catch (error) {
      const { response } = error
      assert.strictEqual(response?.status, 302)
      assert.strictEqual(response?.headers.location, '/app')
    }
  })

  it('starts and shows the UI shell under the UI prefix', async () => {
    const { data } = await axios.get(`${appUrl}/app`)

    assert.ok(data.indexOf('<html lang="ro">') !== -1)
  })

  it('serves the SPA shell for retailer detail refreshes', async () => {
    const { data } = await axios.get(`${appUrl}/app/retailer/11322`, {
      headers: {
        Accept: 'text/html'
      }
    })

    assert.ok(data.indexOf('<app-shell></app-shell>') !== -1)
  })

  it('redirects legacy retailer URLs to the UI prefix', async () => {
    try {
      await axios.get(`${appUrl}/retailer/11322`, {
        headers: {
          Accept: 'text/html'
        },
        maxRedirects: 0
      })
      assert.fail('should never get here')
    } catch (error) {
      const { response } = error
      assert.strictEqual(response?.status, 302)
      assert.strictEqual(response?.headers.location, '/app/retailer/11322')
    }
  })

  it('shows a 404 JSON error', async () => {
    try {
      await axios.get(`${appUrl}/path/to/nowhere`, {
        responseType: 'json'
      })
      assert.fail('should never get here')
    } catch (error) {
      const { response } = error
      assert.strictEqual(response?.status, 404)
      assert.strictEqual(response?.data?.code, 404)
      assert.strictEqual(response?.data?.name, 'NotFound')
    }
  })
})
