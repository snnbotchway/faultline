import { expect, test } from 'vitest'
import { scopeWords } from './scopes'

test('scopes read as the form words them, grouped by what they touch', () => {
  expect(scopeWords(['project:read', 'project:write', 'project:releases'])).toBe('Projects: Read, Write · Releases')
  expect(scopeWords(['org:read', 'member:read', 'project:read', 'event:admin'])).toBe('Projects: Read · Events: Admin · Organization: Read · Members: Read')
})

test('a scope from a newer backend is shown as it is named', () => {
  expect(scopeWords(['org:read', 'org:integrations'])).toBe('Organization: Read · org:integrations')
})
