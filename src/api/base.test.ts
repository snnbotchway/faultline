import { expect, test } from 'vitest'
import { backendAddress } from './base'

test('a backend address under a base path carries the base once', () => {
  const base = '/faultline'
  expect(backendAddress('https://example.com/faultline/faultline/accounts/oidc/x/login/callback/', base)).toBe('https://example.com/faultline/accounts/oidc/x/login/callback/')
  expect(backendAddress('https://example.com/faultline/login/demo-co', base)).toBe('https://example.com/faultline/login/demo-co')
  expect(backendAddress('https://example.com/login/demo-co', base)).toBe('https://example.com/faultline/login/demo-co')
  expect(backendAddress('https://example.com/login/demo-co', '')).toBe('https://example.com/login/demo-co')
})
