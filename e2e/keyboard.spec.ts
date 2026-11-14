import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

test('the inbox is worked from the keyboard', async ({ page }) => {
  await page.goto(`/${DEMO.org}/issues`)
  const links = page.getByRole('listitem').getByRole('link')
  await links.first().waitFor()

  await page.keyboard.press('j')
  await page.keyboard.press('j')
  await expect(links.nth(1)).toBeFocused()
  await page.keyboard.press('k')
  await expect(links.first()).toBeFocused()

  await page.keyboard.press('x')
  await expect(page.getByRole('toolbar', { name: 'Selection' })).toContainText('1 selected')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('toolbar', { name: 'Selection' })).toHaveCount(0)

  const opened = (await links.first().getAttribute('href'))!
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${opened}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('a menu opens, moves and closes from the keyboard, and gives focus back to its button', async ({ page }) => {
  await page.goto(`/${DEMO.org}/issues`)
  const trigger = page.getByRole('button', { name: 'Theme' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const items = page.getByRole('menu').getByRole('menuitemradio')
  await expect(items.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(items.nth(1)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('a dialog keeps focus inside it, and Escape gives focus back to what opened it', async ({ page }) => {
  await page.goto('/profile')
  const opener = page.getByRole('button', { name: /^Name/ })
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let step = 0; step < 8; step++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((node) => node.contains(node.ownerDocument.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('a segmented switch moves with the arrow keys', async ({ page }) => {
  await page.goto(`/${DEMO.org}/uptime-monitors`)
  await page.getByRole('listitem').filter({ hasText: 'Checkout API' }).getByRole('link').click()
  const checks = page.getByRole('region', { name: 'Checks', exact: true })
  const all = checks.getByRole('radio', { name: 'All', exact: true })
  await all.focus()
  await page.keyboard.press('ArrowRight')
  const incidents = checks.getByRole('radio', { name: 'Incidents only' })
  await expect(incidents).toBeFocused()
  await expect(incidents).toBeChecked()
  await page.keyboard.press('ArrowLeft')
  await expect(all).toBeChecked()
})
