// THROWAWAY PROTOTYPE. Screenshots of every variant: bun scripts/prototype-settings-shots.ts [variant…]
// Needs the dev server on :5197. Writes ~/shots/faultline-settings/<variant>-<screen>-<1440|390>-<light|dark>.png
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'

const BASE = 'http://localhost:5197/prototype/settings'
const OUT = `${homedir()}/shots/faultline-settings`
const SIZES = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } } as const
type Size = keyof typeof SIZES

type Shot = { screen: string; path: string; query?: string; bothThemes?: boolean; sizes?: Size[]; viewportOnly?: boolean; scrollTo?: string; click?: string }

const P = '/demo-co/settings/projects'
const shots = (variant: string): Shot[] => [
  { screen: 'home', path: '/', bothThemes: true },
  { screen: 'settings', path: '/demo-co/settings' },
  { screen: 'more', path: '/', query: 'open=more', sizes: [390], viewportOnly: true },
  { screen: 'project-general', path: `${P}/web-app`, bothThemes: true },
  { screen: 'project-keys', path: `${P}/web-app`, query: 'tab=dsn', bothThemes: true, scrollTo: variant === 'a' || variant === 'd' ? undefined : '#dsn', viewportOnly: variant === 'd' },
  { screen: 'key-dialog', path: `${P}/web-app`, query: 'tab=dsn&open=key', viewportOnly: true },
  { screen: 'members', path: '/demo-co/settings/members' },
  { screen: 'member', path: '/demo-co/settings/members/3', viewportOnly: variant === 'c' },
  { screen: 'invite', path: '/demo-co/settings/members/new', viewportOnly: true },
  { screen: 'invite-link', path: '/demo-co/settings/members/new', query: 'email=off&open=invited', viewportOnly: true },
  { screen: 'teams', path: '/demo-co/settings/teams' },
  { screen: 'team', path: '/demo-co/settings/teams/core/members' },
  { screen: 'new-project', path: `${P}/new`, viewportOnly: variant === 'c' },
  variant === 'c'
    ? { screen: 'sdk-setup', path: `${P}/billing-worker` }
    : { screen: 'sdk-setup', path: `${P}/new`, query: 'created=billing-worker&tab=go' },
  { screen: 'members-as-member', path: '/demo-co/settings/members', query: 'as=member', sizes: variant === 'd' ? undefined : [1440] },
  ...(variant === 'd'
    ? [
        { screen: 'sdk-setup-arrived', path: `${P}/new`, query: 'created=billing-worker&tab=go&open=arrived' },
        { screen: 'teams-as-member', path: '/demo-co/settings/teams', query: 'as=member' },
        { screen: 'roles', path: '/demo-co/settings/members/new', viewportOnly: true, click: 'text=Compare roles' },
      ]
    : []),
  ...(variant === 'c' || variant === 'd' ? [{ screen: 'org-menu', path: '/', sizes: [1440 as Size], viewportOnly: true, click: '[aria-label="Organization"]' }] : []),
  ...(variant === 'b' || variant === 'd' ? [{ screen: 'settings-search', path: '/demo-co/settings', query: 'q=limit' }] : []),
]

mkdirSync(OUT, { recursive: true })
const variants = process.argv.slice(2).length ? process.argv.slice(2) : ['a', 'b', 'c', 'd']
const only = process.env.ONLY?.split(',')
const browser = await chromium.launch()
const written: string[] = []
for (const variant of variants) {
  for (const shot of shots(variant)) {
    if (only && !only.includes(shot.screen)) continue
    for (const size of shot.sizes ?? ([1440, 390] as Size[])) {
      for (const theme of shot.bothThemes ? ['light', 'dark'] : ['light']) {
        const context = await browser.newContext({ viewport: SIZES[size], deviceScaleFactor: size === 390 ? 2 : 1, hasTouch: size === 390, isMobile: size === 390 })
        await context.addInitScript((value) => localStorage.setItem('theme', value), theme)
        const page = await context.newPage()
        await page.goto(`${BASE}${shot.path}?variant=${variant}&bar=0${shot.query ? `&${shot.query}` : ''}`)
        await page.waitForLoadState('networkidle')
        await page.evaluate('document.fonts.ready')
        if (shot.scrollTo) await page.locator(shot.scrollTo).scrollIntoViewIfNeeded().catch(() => {})
        await page.waitForTimeout(250)
        const file = `${OUT}/${variant}-${shot.screen}-${size}-${theme}.png`
        if (shot.click) await page.locator(shot.click).first().click()
        const whole = !shot.viewportOnly && !shot.scrollTo
        // Grow the viewport to the page, so bars fixed to the bottom sit at the bottom of the picture.
        if (whole) {
          const height = (await page.evaluate('document.documentElement.scrollHeight')) as number
          await page.setViewportSize({ width: SIZES[size].width, height: Math.max(height, SIZES[size].height) })
        }
        await page.waitForTimeout(100)
        await page.screenshot({ path: file, fullPage: whole })
        written.push(file)
        await context.close()
      }
    }
  }
}
await browser.close()
console.log(written.join('\n'))
