/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { BACKEND_PATHS } from './src/api/backend-paths.ts'

const backend = process.env.BACKEND_URL ?? 'http://localhost:8600'

export default defineConfig(({ command }) => ({
  // The image rewrites the placeholder to its BASE_PATH on start, so one build serves any path.
  base: command === 'build' ? '/__FAULTLINE_BASE__/' : '/',
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}', 'docker/**/*.test.ts'] },
  server: {
    port: 5190,
    proxy: Object.fromEntries(
      // Anchored, so `/api` does not also catch an SPA route such as `/apiary`.
      BACKEND_PATHS.map((path) => [`^${path.replaceAll('.', '\\.')}([/?]|$)`, { target: backend, xfwd: true }]),
    ),
  },
}))
