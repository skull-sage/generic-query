import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/engine': { target: 'http://localhost:8080', changeOrigin: true },
      '/data-query': { target: 'http://localhost:8080', changeOrigin: true },
      '/query-roles': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
