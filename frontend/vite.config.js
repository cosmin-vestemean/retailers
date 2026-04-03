import { defineConfig } from 'vite'
import { resolve } from 'path'

const HEROKU_PROXY_TARGET = 'https://retailers1-0691020d207c.herokuapp.com'
const LOCAL_PROXY_TARGET = 'http://localhost:5000'

function logProxyDecision({ source, target, reason }) {
  console.log(`[vite] backend source: ${source}`)
  console.log(`[vite] proxy target: ${target}`)
  console.log(`[vite] reason: ${reason}`)
}

async function detectDevProxyTarget() {
  if (process.env.VITE_PROXY_TARGET) {
    return {
      source: 'env override',
      target: process.env.VITE_PROXY_TARGET,
      reason: 'VITE_PROXY_TARGET is set explicitly.',
    }
  }

  try {
    const response = await fetch(`${LOCAL_PROXY_TARGET}/socket.io/?EIO=4&transport=polling`, {
      signal: AbortSignal.timeout(1200),
    })

    if (response.ok) {
      return {
        source: 'local',
        target: LOCAL_PROXY_TARGET,
        reason: 'Local backend responded to the Socket.IO probe on port 5000.',
      }
    }
  } catch {
    // Ignore probe errors and fall back to Heroku.
  }

  return {
    source: 'heroku fallback',
    target: HEROKU_PROXY_TARGET,
    reason: 'Local backend did not answer the Socket.IO probe within 1200ms.',
  }
}

export default defineConfig(async () => {
  const proxyDecision = await detectDevProxyTarget()
  logProxyDecision(proxyDecision)

  return {
    root: '.',
    build: {
      outDir: '../public/dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3001,
      proxy: {
        '/socket.io': {
          target: proxyDecision.target,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
