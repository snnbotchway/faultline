// PROTOTYPE, throwaway. Screenshots of every prototype screen and variant.
// Usage: bun dev/prototype-monitoring-shots.ts [variants=a,b,c] [screens=all] (app on :5198)
import { chromium } from '@playwright/test'
import { homedir } from 'node:os'
import { join } from 'node:path'

const base = process.env.FAULTLINE_URL ?? 'http://localhost:5198'
const out = join(homedir(), 'shots/faultline-monitoring')
const variants = (process.argv[2] ?? 'a,b,c').split(',')
const only = process.argv[3]?.split(',')
// `dialog` screens keep the phone viewport, since a dialog is sized to it; the rest grow to show the whole page.
const SCREENS: { name: string; path: string; both?: boolean; dialog?: boolean; only?: string }[] = [
  { name: 'uptime-list', path: '/demo-co/uptime-monitors', both: true },
  { name: 'monitor-detail', path: '/demo-co/uptime-monitors/3', both: true },
  { name: 'monitor-slow', path: '/demo-co/uptime-monitors/6' },
  { name: 'monitor-heartbeat', path: '/demo-co/uptime-monitors/8', only: 'd' },
  { name: 'new-monitor', path: '/demo-co/uptime-monitors/new', dialog: true },
  { name: 'new-monitor-heartbeat', path: '/demo-co/uptime-monitors/new?type=Heartbeat', dialog: true, only: 'd' },
  { name: 'edit-heartbeat', path: '/demo-co/uptime-monitors/8/update', dialog: true, only: 'd' },
  { name: 'status-page', path: '/demo-co/uptime-monitors/status-pages' },
  { name: 'status-page-new', path: '/demo-co/uptime-monitors/status-pages?new=1', dialog: true, only: 'd' },
  { name: 'alert-rules', path: '/demo-co/alerts' },
  { name: 'alert-editor', path: '/demo-co/alerts?alert=3&project=payments-api', dialog: true },
  { name: 'releases-list', path: '/demo-co/releases' },
  { name: 'release-detail', path: '/demo-co/releases/1.5.0' },
]

const browser = await chromium.launch()
for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      deviceScaleFactor: width === 390 ? 2 : 1,
      colorScheme: theme,
      hasTouch: width === 390,
      isMobile: width === 390,
    })
    const page = await context.newPage()
    await page.goto(`${base}/login`)
    await page.getByLabel('Email').fill('demo@example.com')
    await page.getByLabel('Password').fill('demo-pass-123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(/\/issues/)
    for (const variant of variants) {
      for (const screen of SCREENS) {
        if (only && !only.includes(screen.name)) continue
        if (theme === 'dark' && !screen.both) continue
        if (screen.only && screen.only !== variant) continue
        const join = screen.path.includes('?') ? '&' : '?'
        await page.goto(`${base}${screen.path}${join}variant=${variant}&bar=0`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(250)
        // A phone shot shows the whole page with the tab bar at its foot, so the viewport grows to fit.
        if (width === 390) await page.setViewportSize({ width, height: 844 })
        if (width === 390 && !(screen.dialog && variant === 'd')) {
          const height = await page.evaluate<number>('document.documentElement.scrollHeight')
          await page.setViewportSize({ width, height: Math.max(844, height) })
          await page.waitForTimeout(100)
        }
        await page.screenshot({ path: `${out}/${variant}-${screen.name}-${width}-${theme}.png` })
        if (width === 390) {
          // Anything wider than its box scrolls sideways or is cut off; report it.
          const wide = await page.evaluate<string[]>(`[...document.querySelectorAll('body *')].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' && !el.className.includes?.('truncate') && !el.className.includes?.('overflow-x-auto')).map((el) => el.tagName + '.' + String(el.className).slice(0, 50))`)
          const page_ = await page.evaluate<number>('document.documentElement.scrollWidth')
          if (page_ > width || wide.length) console.log(`overflow ${variant}-${screen.name}: page ${page_}px`, wide)
          const body = page.locator('[role="dialog"] .overflow-y-auto')
          if (screen.dialog && (await body.count()) && (await body.evaluate((el) => el.scrollHeight > el.clientHeight + 1))) {
            await body.evaluate((el) => el.scrollTo(0, el.scrollHeight))
            await page.screenshot({ path: `${out}/${variant}-${screen.name}-end-${width}-${theme}.png` })
          }
        }
      }
    }
    await context.close()
  }
}
await browser.close()
