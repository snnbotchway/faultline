import { expect, test } from 'vitest'
import { selectionQuery } from './issues'

test('refuses a bulk action with no issues selected instead of acting on every issue', () => {
  expect(() => selectionQuery({ ids: [] })).toThrow()
  expect(() => selectionQuery({ ids: ['12', 'abc'] })).toThrow()
  expect(selectionQuery({ ids: ['12', '7'] })).toEqual({ id: [12, 7] })
})
