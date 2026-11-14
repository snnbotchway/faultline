import { describe, expect, it } from 'vitest'
import { releaseName } from './text'

describe('release name', () => {
  it.each([
    ['a30f4726113a06a8e2702987b4127aa0d3b4c1e5', 'a30f472'],
    ['web@a30f4726113a06a8e2702987b4127aa0d3b4c1e5', 'web@a30f472'],
    ['5e8a9a6a46f9d7e35e8a9a6a46f9d7e35e8a9a6a46f9d7e35e8a9a6a46f9d7e3', '5e8a9a6'],
    ['web@1.2.3', 'web@1.2.3'],
    ['20261114153045', '20261114153045'],
    ['1234567890123456789012345678901234567890', '1234567890123456789012345678901234567890'],
    ['deadbeefcafe', 'deadbeefcafe'],
  ])('names %s as %s', (version, name) => {
    expect(releaseName(version)).toBe(name)
  })
})
