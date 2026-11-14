import { expect, test } from 'vitest'
import { parseLinkHeader } from './pagination'

const next = 'cD0yMDI2LTExLTE0KzExJTNBNDAlM0EzNy4wODE1MzglMkIwMCUzQTAw'

test('reads cursors from the set-literal Link header GlitchTip 7.0.0 sends', () => {
  const header = `{'<http://x/api/0/organizations/demo-co/issues/?limit=3>; rel="previous"; results="false", <http://x/api/0/organizations/demo-co/issues/?cursor=${next}&limit=3>; rel="next"; results="true"; cursor="${next}"'}`
  expect(parseLinkHeader(header)).toEqual({ next })
})

test('reads cursors from a plain Link header', () => {
  const header = `<http://x/?cursor=a>; rel="previous"; results="true"; cursor="a", <http://x/?cursor=b>; rel="next"; results="false"; cursor="b"`
  expect(parseLinkHeader(header)).toEqual({ previous: 'a' })
})

test('treats a missing or empty header as a single page', () => {
  expect(parseLinkHeader(null)).toEqual({})
  expect(parseLinkHeader('{}')).toEqual({})
})
