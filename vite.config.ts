import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { BACKEND_PATHS } from './src/api/backend-paths.ts'

const backend = process.env.BACKEND_URL ?? 'http://localhost:8600'

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5190,
    proxy: Object.fromEntries(
      BACKEND_PATHS.map((path) => [path, { target: backend, changeOrigin: false, xfwd: true }]),
    ),
  },
})
