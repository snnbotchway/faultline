// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { BACKEND_PATHS } from '../src/api/backend-paths.ts'

test('Caddy proxies every backend path the app calls', () => {
  const caddyfile = readFileSync(new URL('./Caddyfile', import.meta.url), 'utf8')
  const matcher = caddyfile.match(/@backend path (.+)/)?.[1]?.split(/\s+/) ?? []
  expect(matcher.sort()).toEqual(BACKEND_PATHS.flatMap((path) => [path, `${path}/*`]).sort())
})
