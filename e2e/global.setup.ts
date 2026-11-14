import { test as setup } from '@playwright/test'
import { DEMO, seed } from '../dev/seed.ts'

setup('seed the backend and sign in', async ({ page, baseURL }) => {
  // Seeding an empty backend sends about 500 events and waits for them to be processed.
  setup.setTimeout(240_000)
  await seed(baseURL!)
  await page.request.get('/_allauth/browser/v1/config')
  const csrf = (await page.context().cookies()).find((c) => c.name === 'csrftoken')?.value ?? ''
  await page.request.post('/_allauth/browser/v1/auth/login', {
    data: { email: DEMO.email, password: DEMO.password },
    headers: { 'x-csrftoken': csrf, origin: new URL(baseURL!).origin },
  })
  await page.context().storageState({ path: 'e2e/.auth/demo.json' })
})
