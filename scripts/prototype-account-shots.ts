// PROTOTYPE, throwaway. Screenshots of every variant of the account prototype.
// Run the app first (bun run prototype:account), then: bun scripts/prototype-account-shots.ts [base-url] [variants, e.g. D]
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'

const base = process.argv[2] ?? 'http://localhost:5196'
const out = `${homedir()}/shots/faultline-account`
const VARIANTS = (process.argv[3] ?? 'ABCD').split('')
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]
// Both themes for the screens that are judged on colour; light for the rest.
const BOTH_THEMES = ['profile', 'mfa-qr', 'mfa-codes']
const LIGHT_ONLY = [
  'sign-in', 'sign-up', 'sign-up-closed', 'provider-signup', 'reset', 'reset-sent', 'reset-limited', 'reset-no-email', 'new-password', 'invite', 'invite-signed-in', 'mfa',
  'mfa-on', 'key-add', 'codes-regen', 'notifications', 'tokens', 'tokens-new', 'tokens-created',
]
const SIGNED_OUT = LIGHT_ONLY.slice(0, 12)
// The mix is also checked in the dark on every signed-out screen.
const darkScreens = (variant: string) => (variant === 'D' ? [...BOTH_THEMES, ...SIGNED_OUT] : BOTH_THEMES)

// What the user sees without scrolling, where the screen is a place on a long page (A) or a dialog (C).
const viewportOnly = (variant: string, screen: string) => screen !== 'profile' && !SIGNED_OUT.includes(screen) && variant !== 'B'

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
let count = 0
for (const theme of ['light', 'dark'] as const) {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 2, hasTouch: size.width < 500 })
    const page = await context.newPage()
    for (const variant of VARIANTS) {
      for (const screen of theme === 'light' ? [...BOTH_THEMES, ...LIGHT_ONLY] : darkScreens(variant)) {
        await page.goto(`${base}/prototype/account?variant=${variant}&screen=${screen}`, { waitUntil: 'networkidle' })
        await page.addStyleTag({ content: '[data-prototype-switcher]{display:none!important} *{caret-color:transparent!important}' })
        await page.evaluate('document.fonts.ready')
        await page.waitForTimeout(300)
        // A whole page is shot by growing the window, so the phone's fixed tab bar stays at the bottom.
        if (!viewportOnly(variant, screen)) {
          const height = await page.evaluate<number>('document.documentElement.scrollHeight')
          await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) })
        }
        await page.screenshot({ path: `${out}/${variant}-${screen}-${size.width}-${theme}.png` })
        await page.setViewportSize(size)
        count++
      }
    }
    await context.close()
  }
}
await browser.close()
console.log(`${count} screenshots in ${out}`)
