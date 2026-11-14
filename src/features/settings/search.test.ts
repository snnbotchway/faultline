import { expect, test } from 'vitest'
import type { Member } from '@/api/members'
import type { Project } from '@/api/projects'
import type { Team } from '@/api/teams'
import { matchEntries, settingsEntries } from './search'

const entries = settingsEntries({
  organization: { slug: 'demo-co', name: 'Demo Company' },
  members: [{ id: '7', email: 'ada@example.com', role: 'manager', pending: false, user: { name: 'Ada Lovelace' } } as Member],
  teams: [{ slug: 'core', memberCount: 1 } as Team],
  projects: [{ slug: 'web-app', name: 'Web app', platform: 'javascript-react', eventThrottleRate: 25, firstEvent: null, teams: [{ slug: 'core' }] } as Project],
  version: '7.0.0',
})
const found = (query: string) => matchEntries(entries, query).map((entry) => entry.path.join(' › '))

test('words match in any order, across where a setting sits and what it is set to', () => {
  expect(found('drop web')).toEqual(['web-app › Events to drop'])
  expect(found('25%')).toEqual(['web-app › Events to drop'])
  expect(found('react')).toEqual(['web-app › Platform'])
})

test('a person is found by name, address or role, and opens their own row', () => {
  expect(found('lovelace')).toEqual(['Members › Ada Lovelace'])
  expect(found('MANAGER')).toEqual(['Members › Ada Lovelace'])
  expect(matchEntries(entries, 'ada@')[0]?.link).toMatchObject({ to: '/$org/settings/members/$memberId', params: { memberId: '7' } })
})

test('a project setting opens the tab it lives on', () => {
  expect(matchEntries(entries, 'web-app client keys')[0]?.link).toMatchObject({ params: { project: 'web-app' }, search: { tab: 'dsn' } })
})

test('an empty search matches nothing rather than everything', () => {
  expect(found('   ')).toEqual([])
  expect(found('no-such-thing')).toEqual([])
})
