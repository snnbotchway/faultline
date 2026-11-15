import { afterEach, expect, test } from 'vitest'
import { IssueStatus, type Issue } from '@/api/issues'
import { Locale, setLocale } from '@/i18n'
import type { Row } from './inbox-row'
import { timeRange, validateInboxSearch } from './search'
import { selectionOffer } from './selection'
import { Trend } from './trend'

afterEach(() => setLocale(Locale.en))

const row = (id: string): Row => ({ issue: { id, project: { id: '1' } } as Issue, buckets: [], trend: Trend.ongoing })
const offer = (hits: { n: number; capped: boolean }, ids: string[], all = false) =>
  selectionOffer({ rows: ids.map(row), selection: { ids: new Set(ids), all }, view: IssueStatus.unresolved, filters: {}, hits, hasMore: true })

test('what a selection covers reads in the language on screen, with a capped count keeping its plural', async () => {
  await setLocale(Locale.fr)
  expect(offer({ n: 340, capped: false }, ['1']).what).toBe('1 problème')
  expect(offer({ n: 1000, capped: true }, ['1', '2'], true).what).toBe('1000+ problèmes')
  await setLocale(Locale.nb)
  expect(offer({ n: 340, capped: false }, ['1', '2']).what).toBe('2 problemer')
})

test('a relative range outside the presets is worded in the language on screen', async () => {
  const range = validateInboxSearch({ start: 'now-90m' })
  expect(timeRange(range).label).toBe('Last 90 minutes')
  await setLocale(Locale.fr)
  expect(timeRange(range).label).toBe('90 dernières minutes')
  await setLocale(Locale.nb)
  expect(timeRange(range).label).toBe('Siste 90 minutter')
})
