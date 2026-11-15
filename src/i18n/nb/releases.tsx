import type { ReactNode } from 'react'
import type { Messages } from '../en'
import { counted } from '../counted'
import { plural } from '../format'

export const releases: Messages['releases'] = {
  title: 'Utgivelser',
  loadFailed: 'Utgivelsene lastet ikke',
  empty: 'Utgivelser vises her når en app rapporterer en sammen med feilene sine',
  loading: 'Laster utgivelser',
  more: 'Flere utgivelser',
  goTo: 'Gå til utgivelser',
  newIssues: (count, figure: ReactNode) => counted(count, { one: '# nytt problem', other: '# nye problemer' }, figure),
  deploysCount: (count, figure: ReactNode) => counted(count, { one: '# utrulling', other: '# utrullinger' }, figure),
  commitsCount: (count, figure: ReactNode) => counted(count, { one: '# commit', other: '# commits' }, figure),

  chart: {
    loadFailed: 'Hendelsene per dag lastet ikke.',
    peak: (peak) => <>Feil · topp {peak}/dag</>,
  },

  page: {
    slashTitle: 'Utgivelser med skråstrek i versjonen kan ikke åpnes',
    notFound: 'Fant ikke utgivelsen',
    failed: 'Denne utgivelsen lastet ikke',
    projectsErrors: 'Feil i prosjektene',
    firstSeen: 'Først sett i denne utgivelsen',
    seenBefore: 'Sett før, skjer fortsatt',
    issuesFailed: 'Problemene i denne utgivelsen lastet ikke.',
    noIssues: 'Ingen åpne problemer har hendelser i denne utgivelsen.',
    moreIssues: 'Flere problemer',
    events: 'Hendelser',
    lastSeen: 'Sist sett',
    deploys: 'Utrullinger',
    deploysFailed: 'Utrullingene lastet ikke.',
    noDeploys: 'Ingen utrullinger registrert.',
    commits: 'Commits',
    commitsFailed: 'Commitene lastet ikke.',
    noCommits: 'Ingen commits sendt.',
    allCommits: (count) => `Alle ${count} commits`,
    files: 'Filer',
    filesFailed: 'Filene lastet ikke.',
    noFiles: 'Ingen source maps lastet opp.',
    filesSummary: (count, size) => `${plural(count, { one: '# fil', other: '# filer' })}, ${size}`,
    moreFiles: 'Flere filer',
    deleteFileTitle: (name) => `Slett ${name}?`,
    deleteFileLoses: 'Nye feil i denne utgivelsen som trenger denne filen, blir ikke koblet til kildekoden din. Dette kan ikke angres.',
    deleteFile: 'Slett fil',
    deleteFileAction: 'slette filen',
  },
}
