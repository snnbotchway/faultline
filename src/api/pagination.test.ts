import { expect, test } from 'vitest'
import { fetchAllPages, parseLinkHeader } from './pagination'

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

test('collects every page of a list and stops if the backend repeats a cursor', async () => {
  const link = (cursor: string) => `<http://x/?cursor=${cursor}>; rel="next"; results="true"; cursor="${cursor}"`
  const pages: Record<string, { items: number[]; next?: string }> = {
    start: { items: [1, 2], next: 'b' },
    b: { items: [3], next: 'c' },
    c: { items: [4], next: 'c' },
  }
  const fetchPage = async (cursor?: string) => {
    const page = pages[cursor ?? 'start']!
    const headers = page.next ? { link: link(page.next) } : undefined
    return { data: page.items, response: new Response(null, { status: 200, headers }) }
  }
  expect(await fetchAllPages(fetchPage)).toEqual([1, 2, 3, 4])
})
