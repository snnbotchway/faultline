import { describe, expect, it } from 'vitest'
import type { LogEvent } from '@/api/logs'
import { countText, plainKey, preview } from './format'

describe('log attributes', () => {
  it('drop the SDK prefix from their names', () => {
    expect(plainKey('sentry.release')).toBe('release')
    expect(plainKey('user.id')).toBe('user.id')
  })

  it('preview the first three the application set itself', () => {
    const log = { data: { 'sentry.release': '1.5.0', product: 'motor', 'user.id': 109, 'sentry.environment': 'production', 'quote.id': 40089, extra: 1 } } as unknown as LogEvent
    expect(preview(log)).toEqual([
      ['product', 'motor'],
      ['user.id', 109],
      ['quote.id', 40089],
    ])
  })
})

describe('log counts', () => {
  it('show a plus where the backend stopped counting', () => {
    expect(countText({ n: 1168, capped: false })).toBe('1,168')
    expect(countText({ n: 1000, capped: true })).toBe('1,000+')
  })
})
