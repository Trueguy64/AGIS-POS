import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

const api = { target: 'http://localhost:3000', changeOrigin: true }

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  server: {
    allowedHosts: ['cathi-priviest-dastardly.ngrok-free.dev'],
    proxy: { '/api': api, '/uploads': api },
  },
})
