import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const api = { target: 'http://localhost:3000', changeOrigin: true }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': api, '/uploads': api } },
})
