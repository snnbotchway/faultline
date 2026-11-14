import type { Release } from '@/api/releases'

// Where a release sits on a time axis (0 to 1), its short name for the axis, and its full name for hover.
export type ReleaseMark = { at: number; label: string; title: string }

const LABEL_LENGTH = 12
// Marks closer than this share one rule, named after the newest.
const MARK_GAP = 0.05

// `payments-api@2026.11.07+build.418` reads `2026.11.07`: the package prefix and build metadata go, then the rest is cut to fit.
export function shortName(version: string): string {
  const bare = version.replace(/^[^@/]+@/, '').replace(/\+.*$/, '') || version
  return bare.length > LABEL_LENGTH ? `${bare.slice(0, LABEL_LENGTH - 1)}…` : bare
}

export function releaseMarksOn(releases: Pick<Release, 'version' | 'dateCreated'>[], from: number, to: number): ReleaseMark[] {
  const placed = releases
    .map((release) => ({ at: (Date.parse(release.dateCreated) - from) / (to - from), version: release.version }))
    .filter((release) => release.at >= 0 && release.at <= 1)
    .sort((a, b) => a.at - b.at)
  const marks: (ReleaseMark & { versions: string[] })[] = []
  for (const release of placed) {
    const last = marks.at(-1)
    if (last && release.at - last.at < MARK_GAP) last.versions.push(release.version)
    else marks.push({ at: release.at, label: '', title: '', versions: [release.version] })
  }
  return marks.map(({ at, versions }) => {
    const newest = versions.at(-1)!
    return { at, label: versions.length > 1 ? `${shortName(newest)} +${versions.length - 1}` : shortName(newest), title: versions.join(', ') }
  })
}

// The newest release made before a moment, from a list in any order.
export function releaseBefore<T extends Pick<Release, 'dateCreated'>>(releases: T[], time: number): T | undefined {
  let found: T | undefined
  for (const release of releases) {
    const at = Date.parse(release.dateCreated)
    if (at < time && (!found || at > Date.parse(found.dateCreated))) found = release
  }
  return found
}
