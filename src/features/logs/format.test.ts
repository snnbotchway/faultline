import { describe, expect, it } from 'vitest'
import type { LogEvent } from '@/api/logs'
import { attributes, preview } from './format'

const log = (data: Record<string, unknown>) => ({ data }) as unknown as LogEvent

describe('log attributes', () => {
  it('are listed by name without the SDK prefix, the application value winning a clash', () => {
    expect(attributes(log({ 'user.id': 109, 'sentry.release': '1.5.0', release: '1.5.1-hotfix', 'sentry.environment': 'production' }))).toEqual([
      ['environment', 'production'],
      ['release', '1.5.1-hotfix'],
      ['user.id', 109],
    ])
    expect(attributes(log({ release: '1.5.1-hotfix', 'sentry.release': '1.5.0' }))).toEqual([['release', '1.5.1-hotfix']])
  })

  it('preview the first three the application set itself', () => {
    expect(preview(log({ 'sentry.release': '1.5.0', product: 'motor', 'user.id': 109, 'sentry.environment': 'production', 'quote.id': 40089, extra: 1 }))).toEqual([
      ['product', 'motor'],
      ['user.id', 109],
      ['quote.id', 40089],
    ])
  })
})
