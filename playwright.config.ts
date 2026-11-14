import { defineConfig, devices } from '@playwright/test'

// Runs against the Faultline image (`bun run backend:up --profile app`) or any
// Faultline URL in FAULTLINE_URL, backed by a seeded GlitchTip.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.FAULTLINE_URL ?? 'http://localhost:8620',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'desktop', testIgnore: /sub-path/, use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/demo.json' }, dependencies: ['setup'] },
    // The image served under /faultline/; it signs in through the page and seeds nothing itself.
    { name: 'subpath', testMatch: /sub-path/, use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
})
