// THROWAWAY PROTOTYPE: screenshots of every variant for the design review.
//   bun dev/prototype/shots.ts [variant ...]     (dev server must be on :5195)
import { chromium, type Page } from 'playwright'

const OUT = `${process.env.HOME}/shots/faultline`
const BASE = process.env.BASE ?? 'http://localhost:5195'
const only = process.argv.slice(2)
const variants = (['a', 'b', 'c', 'd'] as const).filter((v) => only.length === 0 || only.includes(v))
const sizes = { 1440: { width: 1440, height: 900 }, 390: { width: 390, height: 844 } }
const url = (screen: string, v: string, theme: string) => `${BASE}/prototype/${screen}?variant=${v}&theme=${theme}&bar=0&id=1`

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`,
})

async function open(width: 1440 | 390, target: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: sizes[width], deviceScaleFactor: width === 390 ? 2 : 1, hasTouch: width === 390 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('PAGE ERROR', target, e.message))
  await page.goto(target)
  await page.waitForSelector('.proto')
  await page.evaluate('document.fonts.ready')
  await page.waitForTimeout(250)
  return page
}

for (const v of variants) {
  for (const theme of ['light', 'dark']) {
    for (const width of [1440, 390] as const) {
      for (const screen of v === 'd' ? ['inbox', 'issue', 'settings'] : ['inbox', 'issue']) {
        const page = await open(width, url(screen, v, theme))
        await page.screenshot({ path: `${OUT}/${v}-${screen}-${width}-${theme}.png` })
        await page.context().close()
      }
    }
  }
  // Keyboard-driven states, desktop: a selection with the bulk bar, the palette, and C's unfolded row.
  for (const theme of ['light', 'dark']) {
    const page = await open(1440, url('inbox', v, theme))
    for (const key of ['x', 'j', 'x', 'j', 'j', 'x']) await page.keyboard.press(key)
    await page.waitForTimeout(150)
    await page.screenshot({ path: `${OUT}/${v}-bulk-1440-${theme}.png` })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${OUT}/${v}-palette-1440-${theme}.png` })
    await page.keyboard.press('Escape')
    if (v === 'c' || (v === 'd' && theme === 'light')) {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200)
      await page.screenshot({ path: `${OUT}/${v}-unfold-1440-${theme}.png` })
    }
    await page.context().close()
  }
  if (v === 'c') {
    const page = await open(390, url('inbox', v, 'light'))
    await page.locator('[data-row]').first().click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${OUT}/${v}-unfold-390-light.png` })
    await page.context().close()
  }
  console.log('done', v)
}
await browser.close()
