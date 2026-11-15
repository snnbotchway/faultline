import type { Messages } from '../en'
import { plural } from '../format'

export const performance: Messages['performance'] = {
  transaction: 'Transaksjon',
  transactions: 'Transaksjoner',
  loading: 'Laster',
  all: 'Alle',
  allTime: 'Hele perioden',
  askAdmin: 'Be administratoren din om å slå på forespørselsdetaljer.',
  noDetails: 'Ingen forespørselsdetaljer de siste 7 dagene',
  clearSearch: 'Tøm søket',
  searchTransactions: 'Søk i transaksjoner',
  searchQueries: 'Søk i spørringer',
  sort: 'Sorter',
  allTransactions: 'Alle transaksjoner',

  requests: (count) => plural(count, { one: '# forespørsel', other: '# forespørsler' }),
  typical: (time) => `typisk ${time}`,
  slow: (time) => `treg ${time}`,
  total: (time) => `totalt ${time}`,
  perRequest: (times) => `${times} per forespørsel`,
  each: (time) => `${time} hver`,

  duration: {
    milliseconds: (value) => `${value} ms`,
    seconds: (value) => `${value} s`,
    minutes: (minutes, seconds) => `${minutes} min ${seconds} s`,
    hours: (hours, minutes) => `${hours} t ${minutes} min`,
  },

  slower: (factor, since) => (since ? <>{factor} tregere siden {since}</> : <>{factor} tregere denne uken</>),
  queryRepeats: (times) => <>Spørring gjentas {times}</>,
  failedShare: (share) => <>{share} feilet</>,
  weekChart: (days, peak) => `Tid per forespørsel for hver av de siste ${days} dagene, topp ${peak}`,

  views: {
    all: { label: 'Alle', short: 'Alle' },
    repeated: { label: 'Gjentatte spørringer', short: 'Gjentatte' },
    slower: { label: 'Tregere denne uken', short: 'Tregere' },
    failing: { label: 'Feiler', short: 'Feiler' },
  },
  mostTimeSpent: 'Mest tid brukt',
  mostRepeated: 'Mest gjentatt',
  sorts: {
    '-avg_duration': 'Tregest',
    avg_duration: 'Raskest',
    '-count': 'Flest forespørsler',
    count: 'Færrest forespørsler',
    '-created': 'Nyest',
  },
  repeatOrders: { share: 'Størst andel av forespørselen', total: 'Mest tid brukt' },
  headings: {
    time: { left: 'Andel av brukt tid', right: 'Totalt, hele perioden' },
    duration: { left: 'Typisk til treg', right: 'Treg, hele perioden' },
    requests: { left: 'Forespørsler', right: 'Hele perioden' },
  },

  empty: {
    noMatch: 'Ingen transaksjoner samsvarer',
    nothingSlower: 'Ingenting ble tregere denne uken',
    nothingFailing: 'Ingen transaksjoner feiler',
    noTransactions: 'Ingen prosjekter har sendt transaksjoner ennå',
    noRepeatsMatch: 'Ingen gjentatte spørringer samsvarer',
    noRepeats: 'Ingen spørringer ble gjentatt de siste 7 dagene',
  },
  errors: {
    denied: 'Du kan ikke se ytelse i denne organisasjonen',
    transactions: 'Kunne ikke laste transaksjonene',
    repeats: 'Kunne ikke laste de gjentatte spørringene',
    slower: 'Kunne ikke laste de tregere transaksjonene',
    transactionMissing: 'Denne transaksjonen finnes ikke lenger',
    transactionDenied: 'Du kan ikke se denne transaksjonen',
    transaction: 'Kunne ikke laste denne transaksjonen',
  },

  detail: {
    stats: { typical: 'Typisk', slow: 'Treg', average: 'Gjennomsnitt', requests: 'Forespørsler', failed: 'Feilet' },
    sharedName: (name) => <>Diagrammet og fordelingen teller også de andre transaksjonene som heter {name}.</>,
    timePerRequest: 'Tid per forespørsel, 7 dager',
    averageRequest: 'Gjennomsnittlig forespørsel, 7 dager',
    kindOfSpan: 'Type span',
    parts: 'Deler av en forespørsel, største først',
    repeats: 'Gjentas',
    notBrokenDown: 'Ikke delt opp',
  },

  repeated: {
    repeatedQuery: 'Gjentatt spørring',
    runsPerRequest: 'Kjøringer per forespørsel, 7 dager',
    timePerRequest: 'Tid per forespørsel',
    where: (name) => <>i {name}</>,
    oneRequest: 'Én forespørsel',
    ofRequest: (part, whole) => (whole === undefined ? part : <>{part} av {whole}</>),
    sharedUnknown: 'Flere transaksjoner har dette navnet, så andelen av en forespørsel er ukjent.',
    shareOfRequest: 'Andel av forespørselen',
    eachRun: 'Hver kjøring',
    requests7: 'Forespørsler, 7 dager',
    total7: 'Totalt, 7 dager',
    openTransaction: 'Åpne transaksjonen',
  },
}
