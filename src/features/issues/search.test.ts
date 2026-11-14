import { describe, expect, it } from 'vitest'
import { statusOf, toFilters, validateInboxSearch, withFilter, withStatus } from './search'

describe('inbox search', () => {
  it('shows unresolved issues by default and every issue for an empty query', () => {
    expect(toFilters({}).query).toBe('is:unresolved')
    expect(toFilters({ query: '' }).query).toBe('')
  })

  it('reads a single project from a stock link', () => {
    expect(validateInboxSearch({ project: '3', query: 'is:resolved' })).toMatchObject({ project: [3], query: 'is:resolved' })
  })

  it('switches status without losing the other filters or the text', () => {
    expect(withStatus('is:unresolved level:error timeout in checkout', 'resolved')).toBe('is:resolved level:error timeout in checkout')
    expect(withStatus('level:error is:ignored', undefined)).toBe('level:error')
    expect(statusOf('level:error is:ignored boom')).toBe('ignored')
  })

  it('does not treat free text after the first word as a filter', () => {
    expect(statusOf('boom is:resolved')).toBeUndefined()
    expect(withStatus('boom is:resolved', 'unresolved')).toBe('is:unresolved boom is:resolved')
  })

  it('adds a tag filter ahead of the free text, quoted when it has spaces', () => {
    expect(withFilter('is:unresolved payment failed', 'browser', 'Edge 131')).toBe('is:unresolved browser:"Edge 131" payment failed')
    expect(withFilter('is:unresolved os.name:macOS', 'os.name', 'macOS')).toBe('is:unresolved os.name:macOS')
  })
})
