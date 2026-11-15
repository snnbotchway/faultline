import type { ReactNode } from 'react'
import type { Messages } from '../en'
import { counted } from '../counted'
import { plural } from '../format'

export const releases: Messages['releases'] = {
  title: 'Versions',
  loadFailed: 'Impossible de charger les versions',
  empty: 'Les versions s’affichent ici dès qu’une application en signale une avec ses erreurs',
  loading: 'Chargement des versions',
  more: 'Plus de versions',
  goTo: 'Aller aux versions',
  newIssues: (count, figure: ReactNode) => counted(count, { one: '# nouveau problème', many: '# de nouveaux problèmes', other: '# nouveaux problèmes' }, figure),
  deploysCount: (count, figure: ReactNode) => counted(count, { one: '# déploiement', many: '# de déploiements', other: '# déploiements' }, figure),
  commitsCount: (count, figure: ReactNode) => counted(count, { one: '# commit', many: '# de commits', other: '# commits' }, figure),

  chart: {
    loadFailed: 'Impossible de charger les événements par jour.',
    peak: (peak) => <>Erreurs · pic {peak}/jour</>,
  },

  page: {
    columnWidths: { events: '88px', seen: '112px' },
    slashTitle: 'Les versions dont le nom contient une barre oblique ne peuvent pas être ouvertes',
    notFound: 'Version introuvable',
    failed: 'Impossible de charger cette version',
    projectsErrors: 'Erreurs dans ses projets',
    firstSeen: 'Nouveaux dans cette version',
    seenBefore: 'Déjà vus, toujours en cours',
    issuesFailed: 'Impossible de charger les problèmes de cette version.',
    noIssues: 'Aucun problème ouvert n’a d’événements dans cette version.',
    moreIssues: 'Plus de problèmes',
    events: 'Événements',
    lastSeen: 'Vu en dernier',
    seenAgo: (ago) => `vu il y a ${ago}`,
    deploys: 'Déploiements',
    deploysFailed: 'Impossible de charger les déploiements.',
    noDeploys: 'Aucun déploiement enregistré.',
    commits: 'Commits',
    commitsFailed: 'Impossible de charger les commits.',
    noCommits: 'Aucun commit envoyé.',
    allCommits: (count) => `Les ${count} commits`,
    files: 'Fichiers',
    filesFailed: 'Impossible de charger les fichiers.',
    noFiles: 'Aucune source map importée.',
    filesSummary: (count, size) => `${plural(count, { one: '# fichier', many: '# de fichiers', other: '# fichiers' })}, ${size}`,
    moreFiles: 'Plus de fichiers',
    deleteFileTitle: (name) => `Supprimer ${name} ?`,
    deleteFileLoses: 'Les nouvelles erreurs de cette version qui ont besoin de ce fichier ne seront pas associées à votre code source. Cette action est irréversible.',
    deleteFile: 'Supprimer le fichier',
    deleteFileAction: 'supprimer le fichier',
  },
}
