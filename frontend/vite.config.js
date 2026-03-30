import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
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
        target: 'https://retailers1-0691020d207c.herokuapp.com',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
