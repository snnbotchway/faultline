import type { ReactNode } from 'react'
import type { Messages } from '../en'
import { counted } from '../counted'
import { plural } from '../format'

export const releases: Messages['releases'] = {
  title: 'Versions',
  loadFailed: 'Les versions ne se sont pas chargées',
  empty: 'Les versions s’affichent ici dès qu’une application en signale une avec ses erreurs',
  loading: 'Chargement des versions',
  more: 'Plus de versions',
  goTo: 'Aller aux versions',
  newIssues: (count, figure: ReactNode) => counted(count, { one: '# nouveau problème', many: '# de nouveaux problèmes', other: '# nouveaux problèmes' }, figure),
  deploysCount: (count, figure: ReactNode) => counted(count, { one: '# déploiement', many: '# de déploiements', other: '# déploiements' }, figure),
  commitsCount: (count, figure: ReactNode) => counted(count, { one: '# commit', many: '# de commits', other: '# commits' }, figure),

  chart: {
    loadFailed: 'Les événements par jour ne se sont pas chargés.',
    peak: (peak) => <>Erreurs · pic {peak}/jour</>,
  },

  page: {
    columnWidths: { events: '88px', seen: '112px' },
    slashTitle: 'Les versions dont le nom contient une barre oblique ne peuvent pas être ouvertes',
    notFound: 'Version introuvable',
    failed: 'Cette version ne s’est pas chargée',
    projectsErrors: 'Erreurs dans ses projets',
    firstSeen: 'Vus pour la première fois dans cette version',
    seenBefore: 'Déjà vus, toujours en cours',
    issuesFailed: 'Les problèmes de cette version ne se sont pas chargés.',
    noIssues: 'Aucun problème ouvert n’a d’événements dans cette version.',
    moreIssues: 'Plus de problèmes',
    events: 'Événements',
    lastSeen: 'Vu en dernier',
    deploys: 'Déploiements',
    deploysFailed: 'Les déploiements ne se sont pas chargés.',
    noDeploys: 'Aucun déploiement enregistré.',
    commits: 'Commits',
    commitsFailed: 'Les commits ne se sont pas chargés.',
    noCommits: 'Aucun commit envoyé.',
    allCommits: (count) => `Les ${count} commits`,
    files: 'Fichiers',
    filesFailed: 'Les fichiers ne se sont pas chargés.',
    noFiles: 'Aucune source map importée.',
    filesSummary: (count, size) => `${plural(count, { one: '# fichier', many: '# de fichiers', other: '# fichiers' })}, ${size}`,
    moreFiles: 'Plus de fichiers',
    deleteFileTitle: (name) => `Supprimer ${name} ?`,
    deleteFileLoses: 'Les nouvelles erreurs de cette version qui ont besoin de ce fichier ne seront pas associées à votre code source. Cette action est irréversible.',
    deleteFile: 'Supprimer le fichier',
    deleteFileAction: 'supprimer le fichier',
  },
}
