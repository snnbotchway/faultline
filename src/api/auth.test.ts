import { expect, test } from 'vitest'
import { safeNext } from './auth'

test('follows only same-origin paths after sign-in', () => {
  expect(safeNext('/demo-co/issues/12?query=is:unresolved')).toBe('/demo-co/issues/12?query=is:unresolved')
  for (const unsafe of ['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', undefined]) {
    expect(safeNext(unsafe)).toBeUndefined()
  }
})
