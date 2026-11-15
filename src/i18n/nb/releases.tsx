import type { ReactNode } from 'react'
import type { Messages } from '../en'
import { counted } from '../counted'
import { plural } from '../format'

export const releases: Messages['releases'] = {
  title: 'Utgivelser',
  loadFailed: 'Kunne ikke laste utgivelsene',
  empty: 'Utgivelser vises her når en app rapporterer en sammen med feilene sine',
  loading: 'Laster utgivelser',
  more: 'Flere utgivelser',
  goTo: 'Gå til utgivelser',
  newIssues: (count, figure: ReactNode) => counted(count, { one: '# nytt problem', other: '# nye problemer' }, figure),
  deploysCount: (count, figure: ReactNode) => counted(count, { one: '# utrulling', other: '# utrullinger' }, figure),
  commitsCount: (count, figure: ReactNode) => counted(count, { one: '# commit', other: '# commits' }, figure),

  chart: {
    loadFailed: 'Kunne ikke laste hendelsene per dag.',
    peak: (peak) => <>Feil · topp {peak}/dag</>,
  },

  page: {
    columnWidths: { events: '80px', seen: '80px' },
    slashTitle: 'Utgivelser med skråstrek i versjonen kan ikke åpnes',
    notFound: 'Fant ikke utgivelsen',
    failed: 'Kunne ikke laste denne utgivelsen',
    projectsErrors: 'Feil i prosjektene',
    firstSeen: 'Først sett i denne utgivelsen',
    seenBefore: 'Sett før, skjer fortsatt',
    issuesFailed: 'Kunne ikke laste problemene i denne utgivelsen.',
    noIssues: 'Ingen åpne problemer har hendelser i denne utgivelsen.',
    moreIssues: 'Flere problemer',
    events: 'Hendelser',
    lastSeen: 'Sist sett',
    seenAgo: (ago) => `sett for ${ago} siden`,
    deploys: 'Utrullinger',
    deploysFailed: 'Kunne ikke laste utrullingene.',
    noDeploys: 'Ingen utrullinger registrert.',
    commits: 'Commits',
    commitsFailed: 'Kunne ikke laste commitene.',
    noCommits: 'Ingen commits sendt.',
    allCommits: (count) => `Alle ${count} commits`,
    files: 'Filer',
    filesFailed: 'Kunne ikke laste filene.',
    noFiles: 'Ingen source maps lastet opp.',
    filesSummary: (count, size) => `${plural(count, { one: '# fil', other: '# filer' })}, ${size}`,
    moreFiles: 'Flere filer',
    deleteFileTitle: (name) => `Slett ${name}?`,
    deleteFileLoses: 'Nye feil i denne utgivelsen som trenger denne filen, blir ikke koblet til kildekoden din. Dette kan ikke angres.',
    deleteFile: 'Slett fil',
    deleteFileAction: 'slette filen',
  },
}
