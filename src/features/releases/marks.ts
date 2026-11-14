import type { Release } from '@/api/releases'

// The newest release made before a moment, from a list in any order.
export function releaseBefore<T extends Pick<Release, 'dateCreated'>>(releases: T[], time: number): T | undefined {
  let found: T | undefined
  for (const release of releases) {
    const at = Date.parse(release.dateCreated)
    if (at < time && (!found || at > Date.parse(found.dateCreated))) found = release
  }
  return found
}
