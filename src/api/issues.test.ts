import { expect, test } from 'vitest'
import { selectionQuery } from './issues'

// Without ids the backend acts on every issue that matches the filters.
test('refuses a bulk action with no issues selected', () => {
  expect(() => selectionQuery({ ids: [] })).toThrow()
})

test('refuses a bulk action with a malformed issue id', () => {
  expect(() => selectionQuery({ ids: ['12', 'abc'] })).toThrow()
})

test('sends the selected issue ids', () => {
  expect(selectionQuery({ ids: ['12', '7'] })).toEqual({ id: [12, 7] })
})
