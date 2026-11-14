import { SECOND_MS } from './time'

// A time axis cut into `count` buckets of `size` seconds from `start` (seconds), as the backend counts them.
export type Axis = { start: number; size: number; count: number }

// Where a moment falls on the axis, from 0 to 1; undefined when it is outside.
export function position(time: string | Date, axis: Axis): number | undefined {
  const at = (new Date(time).getTime() / SECOND_MS - axis.start) / (axis.size * axis.count)
  return at >= 0 && at <= 1 ? at : undefined
}

// An axis over an exact stretch of time (milliseconds), for strips that end at now rather than at a bucket's edge.
export const spanAxis = (from: number, to: number): Axis => ({ start: from / SECOND_MS, size: (to - from) / SECOND_MS, count: 1 })

// Where a release sits on the axis (0 to 1), its short name for the axis, and every version it stands for, for hover.
export type Mark = { at: number; label: string; title: string }

const MARK_GAP = 0.05
const LABEL_LENGTH = 12

// `payments-api@2026.11.07+build.418` reads `2026.11.07`: the package prefix and build metadata go, then the rest is cut to fit.
export function shortName(version: string): string {
  const bare = version.replace(/^[^@/]+@/, '').replace(/\+.*$/, '') || version
  return bare.length > LABEL_LENGTH ? `${bare.slice(0, LABEL_LENGTH - 1)}…` : bare
}

// Releases on the axis. Ones that would overlap share a mark, labelled with the newest.
export function releaseMarks(releases: { version: string; dateCreated: string }[], axis: Axis): Mark[] {
  const placed = releases
    .flatMap((release) => {
      const at = position(release.dateCreated, axis)
      return at === undefined ? [] : [{ at, version: release.version }]
    })
    .sort((a, b) => a.at - b.at)
  const marks: { at: number; versions: string[] }[] = []
  for (const release of placed) {
    const last = marks.at(-1)
    if (last && release.at - last.at < MARK_GAP) last.versions.push(release.version)
    else marks.push({ at: release.at, versions: [release.version] })
  }
  return marks.map(({ at, versions }) => {
    const label = shortName(versions.at(-1)!)
    return { at, label: versions.length > 1 ? `${label} +${versions.length - 1}` : label, title: versions.join(', ') }
  })
}

// The newest release made before a moment, from a list in any order.
export function releaseBefore<T extends { dateCreated: string }>(releases: T[], time: number): T | undefined {
  let found: T | undefined
  for (const release of releases) {
    const at = Date.parse(release.dateCreated)
    if (at < time && (!found || at > Date.parse(found.dateCreated))) found = release
  }
  return found
}
