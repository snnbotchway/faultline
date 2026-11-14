import { expect, test } from 'vitest'
import { IssueStatus, type Issue } from '@/api/issues'
import type { Row } from './inbox-row'
import { selectionOffer } from './selection'
import { Trend } from './trend'

const row = (id: string, project = '1'): Row => ({ issue: { id, project: { id: project } } as Issue, buckets: [], trend: Trend.ongoing })
const base = { view: IssueStatus.unresolved, filters: { query: 'is:unresolved' }, hits: { n: 340, capped: false }, hasMore: true }

test('every match stays selected when more rows load, and acts on the filters rather than on ids', () => {
  const offer = selectionOffer({ ...base, rows: [row('1'), row('2'), row('3')], selection: { ids: new Set(['1', '2']), all: true } })
  expect(offer.allMatching).toBe(true)
  expect(offer.what).toBe('340 issues')
  expect(offer.target.selection).toEqual({ filters: base.filters })
  expect(offer.canAssign).toBe(false)
  expect(offer.canMerge).toBe(false)
})

test('merging is offered for two or more issues of one project, and the newest is the one kept', () => {
  const selection = { ids: new Set(['7', '12']), all: false }
  const offer = selectionOffer({ ...base, rows: [row('7'), row('12'), row('3')], selection })
  expect(offer.canMerge).toBe(true)
  expect(offer.survivor?.issue.id).toBe('12')
  expect(selectionOffer({ ...base, rows: [row('7'), row('12', '2')], selection }).canMerge).toBe(false)
})
