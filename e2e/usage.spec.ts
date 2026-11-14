import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

test('usage shows what the organization took in, the projects behind its errors, and one day when picked', async ({ page }) => {
  await page.goto(`/${DEMO.org}/settings`)
  await page.getByRole('link', { name: /^Usage/ }).click()
  await expect(page).toHaveURL(new RegExp(`/${DEMO.org}/settings/subscription$`))

  // The seed sends errors, transactions and logs, so each has a count and they add up to more than the errors alone.
  const count = async (name: string) => Number((await page.getByRole('region', { name, exact: true }).getByRole('strong').first().textContent())!.replaceAll(',', ''))
  const errors = await count('Errors')
  expect(errors).toBeGreaterThan(0)
  expect(await count('Transactions')).toBeGreaterThan(0)
  expect(await count('All events')).toBeGreaterThan(errors)

  await page.getByRole('button', { name: /^Errors/ }).click()
  const projects = page.getByRole('list', { name: 'Errors by project' })
  await expect(projects.getByRole('link', { name: /web-app/ })).toBeVisible()

  // Today is the last day on the axis; picking it names it and turns the totals into that day's.
  const chart = page.getByRole('img', { name: 'Errors a day' })
  const box = (await chart.boundingBox())!
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2)
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  await expect.poll(() => count('Errors')).toBeLessThan(errors)

  await page.getByRole('button', { name: 'Previous day' }).click()
  await expect(page.getByRole('heading', { name: 'Today' })).toHaveCount(0)
  await page.getByRole('button', { name: 'All 30 days' }).click()
  await expect(page.getByRole('heading', { name: 'Last 30 days' })).toBeVisible()
  expect(await count('Errors')).toBe(errors)
})
