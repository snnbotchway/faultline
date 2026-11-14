import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { IssueStatus, type Issue } from '@/api/issues'
import type { Row } from './inbox-row'
import { idsBetween, selectionOffer, useSelection } from './selection'
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

test('shift-click covers the rows between two clicks, in either direction, and nothing for an unknown row', () => {
  const order = ['a', 'b', 'c', 'd', 'e']
  expect(idsBetween(order, 'b', 'd')).toEqual(['b', 'c', 'd'])
  expect(idsBetween(order, 'e', 'c')).toEqual(['c', 'd', 'e'])
  expect(idsBetween(order, 'a', 'zzz')).toEqual([])
})

test('a shift-click range takes the state of the box clicked, so it unticks as well as ticks', () => {
  const order = ['a', 'b', 'c', 'd']
  const { result } = renderHook(() => useSelection('scope'))
  act(() => result.current.toggle('a', true))
  act(() => result.current.extendTo('c', order, true))
  expect([...result.current.ids].sort()).toEqual(['a', 'b', 'c'])
  act(() => result.current.extendTo('b', order, false))
  expect([...result.current.ids]).toEqual(['a'])
})

test('a toggle sets the state the box will show, not the opposite of what is stored', () => {
  const { result } = renderHook(() => useSelection('scope'))
  // Under "select all matching" no id is stored, yet the box shows ticked; unticking must not tick it.
  act(() => result.current.toggle('a', false))
  expect(result.current.ids.has('a')).toBe(false)
  act(() => result.current.toggle('a', true))
  expect(result.current.ids.has('a')).toBe(true)
  act(() => result.current.extendTo('z', ['a', 'b'], false))
  expect(result.current.ids.has('z')).toBe(false)
})
