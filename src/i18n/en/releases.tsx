import type { ReactNode } from 'react'
import { counted } from '../counted'
import { plural } from '../format'

// The releases list and a release's page.
export const releases = {
  title: 'Releases',
  loadFailed: "The releases didn't load",
  empty: 'Releases show here once an app reports one with its errors',
  loading: 'Loading releases',
  more: 'More releases',
  goTo: 'Go to releases',
  // "3 new issues", "2 deploys": the figure is set in mono by the caller.
  newIssues: (count: number, figure: ReactNode) => counted(count, { one: '# new issue', other: '# new issues' }, figure),
  deploysCount: (count: number, figure: ReactNode) => counted(count, { one: '# deploy', other: '# deploys' }, figure),
  commitsCount: (count: number, figure: ReactNode) => counted(count, { one: '# commit', other: '# commits' }, figure),

  chart: {
    loadFailed: "The events per day didn't load.",
    peak: (peak: ReactNode) => <>Errors · peak {peak}/day</>,
  },

  page: {
    // Wide enough for the column headers below, set in label caps.
    columnWidths: { events: '56px', seen: '80px' },
    slashTitle: "Releases with a slash in the version can't be opened",
    notFound: 'Release not found',
    failed: "This release didn't load",
    projectsErrors: 'Errors in its projects',
    firstSeen: 'First seen in this release',
    seenBefore: 'Seen before, still happening',
    issuesFailed: "The issues in this release didn't load.",
    noIssues: 'No open issues have events in this release.',
    moreIssues: 'More issues',
    events: 'Events',
    lastSeen: 'Last seen',
    deploys: 'Deploys',
    deploysFailed: "The deploys didn't load.",
    noDeploys: 'No deploys recorded.',
    commits: 'Commits',
    commitsFailed: "The commits didn't load.",
    noCommits: 'No commits sent.',
    allCommits: (count: number) => `All ${count} commits`,
    files: 'Files',
    filesFailed: "The files didn't load.",
    noFiles: 'No source maps uploaded.',
    filesSummary: (count: number | string, size: string) => `${plural(count, { one: '# file', other: '# files' })}, ${size}`,
    moreFiles: 'More files',
    deleteFileTitle: (name: string) => `Delete ${name}?`,
    deleteFileLoses: "New errors in this release that need this file won't be matched to your source. This can't be undone.",
    deleteFile: 'Delete file',
    deleteFileAction: 'delete the file',
  },
}
