import { expect, test } from '@playwright/test'
import { DEMO } from '../dev/seed.ts'

const settings = `/${DEMO.org}/settings`
// The backend is shared between runs, so everything made here has its own name and is removed again.
const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}`

test('the home page lists the projects and leads to their issues', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await page.getByRole('link', { name: 'Issues in web-app' }).click()
  await expect(page).toHaveURL(new RegExp(`/${DEMO.org}/issues\\?project=`))
})

test('a new project opens on its set-up step, which shows its first event when it arrives, and can be deleted', async ({ page }) => {
  const name = unique('e2e-project')
  await page.goto(`${settings}/projects/new`)
  await page.getByLabel('Project name').fill(name)
  await page.getByRole('radio', { name: 'Django' }).click()
  await page.getByRole('button', { name: 'Create project' }).click()

  await expect(page).toHaveURL(new RegExp(`${settings}/projects/${name}\\?tab=setup$`))
  await expect(page.getByRole('status').filter({ hasText: 'Waiting for the first event' })).toBeVisible()
  const snippet = page.getByRole('figure').filter({ hasText: 'settings.py' })
  await expect(snippet).toContainText(/dsn="https?:\/\/[0-9a-f]{32}@/)

  // An event sent with that DSN shows up on the set-up step, which stays open.
  const [, key, projectId] = /dsn="https?:\/\/([0-9a-f]{32})@[^/]+\/(\d+)"/.exec((await snippet.textContent()) ?? '')!
  const sent = await page.request.post(`/api/${projectId}/store/`, {
    headers: { 'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=faultline-e2e/1.0` },
    data: { event_id: crypto.randomUUID().replaceAll('-', ''), message: 'first event from e2e', level: 'error', platform: 'python', environment: 'e2e-staging' },
  })
  expect(sent.ok()).toBe(true)
  await expect(page.getByRole('status').filter({ hasText: 'First event received' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('link', { name: 'Open issue' })).toBeVisible()

  // The event's environment can be hidden, and stays listed so it can be shown again.
  await page.getByRole('link', { name: 'Environments' }).click()
  const shown = page.getByRole('switch', { name: 'Show e2e-staging' })
  await expect(shown).toBeChecked()
  await shown.click()
  await expect(shown).not.toBeChecked()
  await page.reload()
  await expect(shown).not.toBeChecked()
  await shown.click()
  await expect(shown).toBeChecked()

  await page.getByRole('link', { name: 'General' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByLabel(`Type ${name} to delete it`).fill(name)
  await page.getByRole('button', { name: 'Delete project' }).click()
  await expect(page).toHaveURL(new RegExp(`${settings}$`))
  await expect(page.getByRole('link', { name })).toHaveCount(0)
})

test('an invited person shows in the list until the invite is cancelled', async ({ page }) => {
  const email = `${unique('e2e-invite')}@example.com`
  await page.goto(`${settings}/members`)
  await page.getByRole('button', { name: 'Invite members' }).click()
  await page.getByLabel('Email addresses').fill(email)
  await page.getByRole('dialog').getByRole('button', { name: /^(Send invite|Create invite link)$/ }).click()
  // A server without email keeps the dialog open to hand over the link.
  const done = page.getByRole('button', { name: 'Done' })
  if (await done.isVisible().catch(() => false)) await done.click()

  const row = page.getByRole('button', { name: new RegExp(email) })
  await expect(row).toContainText('Invited')
  await row.click()
  await page.getByRole('button', { name: 'Cancel invite' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel invite' }).click()
  // The page behind an open dialog is hidden from roles, so wait for the dialog to go before looking for the row.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(row).toHaveCount(0)
})

test('a team can be created and deleted', async ({ page }) => {
  const slug = unique('e2e-team')
  await page.goto(`${settings}/teams`)
  await page.getByRole('button', { name: 'New team' }).click()
  await page.getByLabel('Name').fill(slug)
  await page.getByRole('button', { name: 'Create team' }).click()
  await expect(page).toHaveURL(new RegExp(`${settings}/teams/${slug}/members$`))
  await expect(page.getByRole('region', { name: `Members of ${slug}` })).toContainText(DEMO.email)

  await page.getByRole('button', { name: 'Delete team' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete team' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Team ${slug}` })).toHaveCount(0)
})

test('a sign-in app shows the redirect address to give the provider, and can be deleted', async ({ page }) => {
  const name = unique('e2e-sso').slice(0, 40)
  await page.goto(settings)
  await page.getByRole('button', { name: 'New sign-in app' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Provider address').fill('https://login.example.com')
  await page.getByLabel('Client ID').fill('e2e-client')
  await page.getByLabel('Client secret').fill('e2e-secret')
  await page.getByRole('button', { name: 'Create app' }).click()

  const app = page.getByRole('region', { name: 'Sign-in apps' })
  await expect(app.getByLabel(`Redirect address of ${name}`)).toContainText(/\/accounts\/oidc\/.+\/login\/callback\//)
  await app.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete sign-in app' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(app.getByRole('button', { name: new RegExp(name) })).toHaveCount(0)
})
