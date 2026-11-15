import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const org = `/${DEMO.org}`
const FAILING_IMPACT = ['serious', 'critical']

// Findings judged not to be defects, each limited to one rule on the elements it names.
const ACCEPTED = [
  {
    rule: 'label-content-name-mismatch',
    html: 'aria-label="Commands"',
    // The button shows a search icon and its key hint, ⌘K, which is hidden from screen readers and is not its label.
    // axe counts the hint as visible text the name must contain; speech users say "Commands", the name and tooltip.
  },
]

async function settle(page: Page) {
  await page.waitForFunction("document.getAnimations().every((animation) => animation.playState !== 'running')")
}

async function violations(page: Page, rules?: string[]) {
  await settle(page)
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
  const { violations } = await (rules ? builder.withRules(rules) : builder).analyze()
  return violations
    .filter((violation) => FAILING_IMPACT.includes(violation.impact ?? ''))
    .flatMap((violation) =>
      violation.nodes
        .filter((node) => !ACCEPTED.some((accepted) => accepted.rule === violation.id && node.html.includes(accepted.html)))
        .map((node) => `${violation.id}: ${node.target.join(' ')} ${node.html.slice(0, 200)}`),
    )
}

// The whole page in the light theme, then its colours again in the dark one. The class is set directly, as the
// theme menu would set it, so the account's saved theme (which other tests change) cannot get in between.
async function audit(page: Page) {
  const light = await violations(page)
  await page.evaluate("document.documentElement.classList.add('dark')")
  const dark = await violations(page, ['color-contrast'])
  expect({ light, dark }).toEqual({ light: [], dark: [] })
}

// A screen opens at its path and is ready once its one `h1` (or what `ready` names) is on the page; `open` is for
// one reached by a click.
type Screen = { name: string } & ({ path: string; ready?: (page: Page) => Locator } | { open: (page: Page) => Promise<void> })

const SCREENS: Screen[] = [
  { name: 'the issue inbox', path: `${org}/issues`, ready: (page) => page.getByRole('region', { name: 'Ongoing' }) },
  {
    name: 'an issue page',
    open: async (page) => {
      await page.goto(`${org}/issues`)
      await page.getByRole('listitem').filter({ hasText: 'WEB-APP-1' }).getByRole('link').click()
      await page.getByRole('heading', { name: 'Stack trace' }).waitFor()
    },
  },
  { name: 'releases', path: `${org}/releases` },
  { name: 'the uptime list', path: `${org}/uptime-monitors`, ready: (page) => page.getByRole('region', { name: 'Down', exact: true }) },
  {
    name: 'a monitor page',
    open: async (page) => {
      await page.goto(`${org}/uptime-monitors`)
      await page.getByRole('listitem').filter({ hasText: 'Checkout API' }).getByRole('link').click()
      await page.getByRole('region', { name: 'Checks', exact: true }).locator('tbody time').first().waitFor()
    },
  },
  { name: 'alerts', path: `${org}/alerts`, ready: (page) => page.getByText('Downtime and spikes').first() },
  { name: 'performance', path: `${org}/performance`, ready: (page) => page.getByRole('list', { name: 'Transactions' }).getByRole('listitem').first() },
  { name: 'logs', path: `${org}/logs` },
  { name: 'organization settings', path: `${org}/settings` },
  { name: 'usage', path: `${org}/settings/subscription` },
  { name: 'project settings', path: `${org}/settings/projects/web-app` },
  { name: 'profile', path: '/profile' },
  {
    name: 'the command palette',
    open: async (page) => {
      await page.goto(`${org}/issues`)
      await page.getByRole('button', { name: 'Commands' }).click()
      await page.getByRole('dialog', { name: 'Commands' }).waitFor()
    },
  },
  {
    name: 'a dialog',
    open: async (page) => {
      await page.goto(`${org}/issues`)
      await page.getByRole('button', { name: /First seen/ }).click()
      await page.getByRole('menuitem', { name: 'Custom range' }).click()
      await page.getByRole('dialog').waitFor()
    },
  },
]

async function open(page: Page, screen: Screen) {
  if ('open' in screen) return screen.open(page)
  await page.goto(screen.path)
  await (screen.ready?.(page) ?? page.getByRole('heading', { level: 1 })).waitFor()
}

for (const screen of SCREENS) {
  test(`${screen.name} has no serious accessibility violations`, async ({ page }) => {
    await open(page, screen)
    await audit(page)
  })
}

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('sign-in has no serious accessibility violations', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').waitFor()
    await audit(page)
  })
})
