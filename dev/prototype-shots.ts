// PROTOTYPE, throwaway: screenshots of every variant of the performance and logs prototype.
// Usage: bun dev/prototype-shots.ts [appUrl] [outDir] [filter]
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:5199'
const out = process.argv[3] ?? join(homedir(), 'shots/faultline-performance')
const only = process.argv[4]
const SIZES = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } } as const
const BOTH = ['light', 'dark'] as const
const LIGHT = ['light'] as const

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const login = await browser.newContext()
const page = await login.newPage()
await page.goto(`${base}/login`)
await page.locator('input[type=email]').fill('demo@example.com')
await page.locator('input[type=password]').fill('demo-pass-123')
await page.locator('button[type=submit]').click()
await page.waitForURL(/\/demo-co\//)
const state = await login.storageState()
const api = async (path: string) => (await page.request.get(`${base}/api/0/organizations/demo-co/${path}`)).json()
const groups: { id: number; transaction: string }[] = await api('transaction-groups/?limit=100')
const group = groups.find((item) => item.transaction === '/api/policies/')!.id
const regressed = groups.find((item) => item.transaction === '/api/quotes/')!.id
const logs: { id: string; level: string; traceID: string | null; service: string }[] = await api('logs/?limit=200&start=now-24h')
const log = logs.find((item) => item.level === 'error' && item.traceID && item.service === 'payments-api')!.id
await login.close()

const root = '/demo-co/prototype'
const screens = (variant: string) => [
  { name: 'transactions', themes: BOTH, url: () => `${root}/performance?variant=${variant}` },
  { name: 'transaction', themes: LIGHT, url: (width: number) => ((variant === 'B' || variant === 'D') && width === 1440 ? `${root}/performance?variant=${variant}&group=${group}` : `${root}/performance/${group}?variant=${variant}`) },
  { name: 'n-plus-one', themes: LIGHT, url: () => `${root}/performance/n-plus-one?variant=${variant}${variant === 'C' || variant === 'D' ? '&pattern=1' : ''}` },
  ...(variant === 'D' ? [{ name: 'transactions-slowest', themes: LIGHT, url: () => `${root}/performance?variant=D&order=-avg_duration` }] : []),
  ...(variant === 'D' ? [{ name: 'transaction-slower', themes: LIGHT, url: (width: number) => (width === 1440 ? `${root}/performance?variant=D&group=${regressed}` : `${root}/performance/${regressed}?variant=D`) }] : []),
  { name: 'logs', themes: BOTH, url: () => `${root}/logs?variant=${variant}` },
  { name: 'log', themes: LIGHT, url: () => `${root}/logs?variant=${variant}&log=${log}` },
]

for (const variant of ['A', 'B', 'C', 'D']) {
  for (const [width, viewport] of Object.entries(SIZES)) {
    for (const theme of BOTH) {
      const context = await browser.newContext({ storageState: state, viewport, deviceScaleFactor: 2, colorScheme: theme, hasTouch: width === '390', isMobile: width === '390' })
      await context.addInitScript((value) => localStorage.setItem('theme', value), theme)
      const tab = await context.newPage()
      for (const screen of screens(variant)) {
        if (!(screen.themes as readonly string[]).includes(theme)) continue
        const file = `${variant}-${screen.name}-${width}-${theme}.png`
        if (only && !file.includes(only)) continue
        await tab.goto(base + screen.url(Number(width)))
        await tab.waitForLoadState('networkidle')
        await tab.addStyleTag({ content: '[data-prototype-switcher]{display:none}' })
        if (screen.name === 'log') await tab.locator('[aria-expanded="true"]').first().scrollIntoViewIfNeeded().catch(() => {})
        await tab.waitForTimeout(400)
        await tab.screenshot({ path: join(out, file) })
        console.log(file)
      }
      await context.close()
    }
  }
}
await browser.close()
