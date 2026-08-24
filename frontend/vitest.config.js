import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Separate from vite.config.js on purpose: the dev config runs an async
// network probe to pick a proxy target, which we don't want during tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.js'],
  },
})
