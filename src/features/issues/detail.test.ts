import { expect, test } from 'vitest'
import type { IssueEvent } from '@/api/issues'
import { aiPayload, issueAddress } from './copy-for-ai'
import { cookiesOf } from './event'
import { languageOf, piecesOf } from './highlight'
import { rawTrace } from './raw-trace'
import { sharedOrigin, tagFacets } from './tags'

const value = (name: string, count: number) => ({ name, value: name, count, key: 'user.id' })

test('a tag shows its ten commonest values and sums the rest into "other"', () => {
  const topValues = Array.from({ length: 14 }, (_, index) => value(`u${index}`, 14 - index))
  const facets = tagFacets({ topValues, totalValues: 120, uniqueValues: 14 })
  expect(facets.rows.map((row) => row.name)).toEqual(Array.from({ length: 10 }, (_, index) => `u${index}`))
  // 14 + 13 + ... + 5 = 95 of 120 events are shown.
  expect(facets.other).toBeCloseTo(25 / 120)
  expect(facets.flat).toBe(false)
})

test('a tag with one value is flat and has no "other"', () => {
  const facets = tagFacets({ topValues: [value('production', 5)], totalValues: 5, uniqueValues: 1 })
  expect(facets).toMatchObject({ flat: true, other: 0 })
})

test('web addresses on one site share an origin, so their rows can show just the paths', () => {
  expect(sharedOrigin(['https://app.example.com/quotes/new', 'https://app.example.com/quotes/review?x=1'])).toBe('https://app.example.com')
  expect(sharedOrigin(['https://app.example.com/a', 'https://admin.example.com/a'])).toBeUndefined()
  expect(sharedOrigin(['https://app.example.com/a', 'not a url'])).toBeUndefined()
})

test('a token that runs over several lines keeps its colour on each one, and entities are decoded', () => {
  const lines = piecesOf('<span class="hljs-comment">/* a &amp; b\nc */</span>\n<span class="hljs-keyword">return</span> x &lt; 1')
  expect(lines).toEqual([
    [{ text: '/* a & b', tone: 'comment' }],
    [{ text: 'c */', tone: 'comment' }],
    [{ text: 'return', tone: 'keyword' }, { text: ' x < 1', tone: undefined }],
  ])
})

test('the file extension decides the language before the platform does', () => {
  expect(languageOf('src/app.ts', 'javascript')).toBe('typescript')
  expect(languageOf('main', 'python')).toBe('python')
  expect(languageOf('main', 'cobol')).toBeUndefined()
})

test('a raw trace lists the raised exception and then its cause, with the frames in the order given', () => {
  const frame = (name: string, lineNo: number) => ({ filename: 'a.py', function: name, lineNo, context: [[lineNo, `  ${name}()`]] as [number, string][] })
  const text = rawTrace(
    [
      { exception: { type: 'ValueError', value: 'bad' }, frames: [frame('inner', 9), frame('outer', 3)] },
      { exception: { type: 'KeyError', value: "'x'" }, frames: [frame('load', 1)] },
    ],
    'python',
  )
  expect(text).toBe(
    ['ValueError: bad', '  File "a.py", line 9, in inner', '    inner()', '  File "a.py", line 3, in outer', '    outer()', '', "Caused by: KeyError: 'x'", '  File "a.py", line 1, in load', '    load()'].join('\n'),
  )
})

test('cookies come as a map, as pairs or as the header text', () => {
  expect(cookiesOf({ cookies: { theme: 'dark' } })).toEqual([['theme', 'dark']])
  expect(cookiesOf({ cookies: [['a', '1']] })).toEqual([['a', '1']])
  expect(cookiesOf({ cookies: 'a=1; b=x=y' })).toEqual([['a', '1'], ['b', 'x=y']])
})

test('the copied event names the instance, falling back to its address', () => {
  const event = { id: 'e1', title: 'Boom' } as IssueEvent
  const where = { instance: 'https://gt.example.com', org: 'demo-co', issueId: '7', eventUrl: 'https://gt.example.com/demo-co/issues/7/events/e1' }
  expect(aiPayload(event, { ...where, instanceName: 'Acme errors' })).toContain('Source: Acme errors\n')
  expect(aiPayload(event, where)).toContain('Source: https://gt.example.com\n')
})

test('a copied address carries the base path Faultline is served under', () => {
  expect(issueAddress('https://gt.example.com', 'demo-co', '7', 'e1', '/faultline')).toBe('https://gt.example.com/faultline/demo-co/issues/7/events/e1')
  expect(issueAddress('https://gt.example.com', 'demo-co', '7', undefined, '')).toBe('https://gt.example.com/demo-co/issues/7')
})

test('a platform named after an object property is no language', () => {
  expect(languageOf(undefined, '__proto__')).toBeUndefined()
  expect(languageOf('a.constructor', 'hasOwnProperty')).toBeUndefined()
  expect(languageOf('app.py', undefined)).toBe('python')
})
