import type { Messages } from '../en'
import { plural } from '../format'

export const performance: Messages['performance'] = {
  transaction: 'Transaction',
  transactions: 'Transactions',
  loading: 'Chargement',
  all: 'Tous',
  allTime: 'Depuis le début',
  askAdmin: 'Demandez à votre administrateur d’activer les détails des requêtes.',
  noDetails: 'Aucun détail de requête sur les 7 derniers jours',
  clearSearch: 'Effacer la recherche',
  searchTransactions: 'Rechercher une transaction',
  searchQueries: 'Rechercher une requête',
  sort: 'Tri',
  allTransactions: 'Toutes les transactions',

  requests: (count) => plural(count, { one: '# requête', many: '# de requêtes', other: '# requêtes' }),
  typical: (time) => `typique ${time}`,
  slow: (time) => `lent ${time}`,
  total: (time) => `total ${time}`,
  perRequest: (times) => `${times} par requête`,
  each: (time) => `${time} par exécution`,

  duration: {
    milliseconds: (value) => `${value} ms`,
    seconds: (value) => `${value} s`,
    minutes: (minutes, seconds) => `${minutes} min ${seconds} s`,
    hours: (hours, minutes) => `${hours} h ${minutes} min`,
  },

  slower: (factor, since) => (since ? <>{factor} plus lente depuis {since}</> : <>{factor} plus lente cette semaine</>),
  queryRepeats: (times) => <>Requête répétée {times}</>,
  failedShare: (share) => <>{share} en échec</>,
  weekChart: (days, peak) => `Temps par requête sur chacun des ${days} derniers jours, pic à ${peak}`,

  views: {
    all: { label: 'Toutes', short: 'Toutes' },
    repeated: { label: 'Requêtes répétées', short: 'Répétées' },
    slower: { label: 'Plus lentes cette semaine', short: 'Plus lentes' },
    failing: { label: 'En échec', short: 'En échec' },
  },
  mostTimeSpent: 'Le plus de temps passé',
  mostRepeated: 'Les plus répétées',
  sorts: {
    '-avg_duration': 'Plus lentes',
    avg_duration: 'Plus rapides',
    '-count': 'Le plus de requêtes',
    count: 'Le moins de requêtes',
    '-created': 'Plus récentes',
  },
  repeatOrders: { share: 'Plus grande part de la requête', total: 'Le plus de temps passé' },
  headings: {
    time: { left: 'Part du temps passé', right: 'Total, depuis le début' },
    duration: { left: 'Typique à lent', right: 'Lent, depuis le début' },
    requests: { left: 'Requêtes', right: 'Depuis le début' },
  },

  empty: {
    noMatch: 'Aucune transaction ne correspond',
    nothingSlower: 'Aucune transaction n’a ralenti cette semaine',
    nothingFailing: 'Aucune transaction en échec',
    noTransactions: 'Aucun projet n’a encore envoyé de transactions',
    noRepeatsMatch: 'Aucune requête répétée ne correspond',
    noRepeats: 'Aucune requête répétée ces 7 derniers jours',
  },
  errors: {
    denied: 'Vous ne pouvez pas voir les performances de cette organisation',
    transactions: 'Impossible de charger les transactions',
    repeats: 'Impossible de charger les requêtes répétées',
    slower: 'Impossible de charger les transactions plus lentes',
    transactionMissing: 'Cette transaction n’existe plus',
    transactionDenied: 'Vous ne pouvez pas voir cette transaction',
    transaction: 'Impossible de charger cette transaction',
  },

  detail: {
    stats: { typical: 'Typique', slow: 'Lent', average: 'Moyenne', requests: 'Requêtes', failed: 'En échec' },
    sharedName: (name) => <>Le graphique et la répartition comptent aussi les autres transactions nommées {name}.</>,
    timePerRequest: 'Temps par requête, 7 jours',
    averageRequest: 'Requête moyenne, 7 jours',
    kindOfSpan: 'Type de span',
    parts: 'Parties d’une requête, de la plus grande à la plus petite',
    repeats: 'Se répète',
    notBrokenDown: 'Non détaillé',
  },

  repeated: {
    repeatedQuery: 'Requête répétée',
    runsPerRequest: 'Exécutions par requête, 7 jours',
    timePerRequest: 'Temps par requête',
    where: (name) => <>dans {name}</>,
    oneRequest: 'Une requête',
    ofRequest: (part, whole) => (whole === undefined ? part : <>{part} sur {whole}</>),
    sharedUnknown: 'Plusieurs transactions portent ce nom : la part de cette requête est donc inconnue.',
    shareOfRequest: 'Part de la requête',
    eachRun: 'Chaque exécution',
    requests7: 'Requêtes, 7 jours',
    total7: 'Total, 7 jours',
    openTransaction: 'Ouvrir la transaction',
  },
}
