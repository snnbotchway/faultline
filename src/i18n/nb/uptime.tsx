import { StatsPeriod } from '@/api/issues'
import type { Messages } from '../en'
import type { IntervalUnit } from '../en/uptime'
import { count as number, plural, type PluralForms } from '../format'

const INTERVAL: Record<IntervalUnit, PluralForms> = {
  day: { one: '# dag', other: '# dager' },
  hour: { one: '# time', other: '# timer' },
  minute: { one: '# minutt', other: '# minutter' },
  second: { one: '# sekund', other: '# sekunder' },
}

const EVERY: Record<IntervalUnit, PluralForms> = {
  day: { one: 'hver dag', other: 'hver #. dag' },
  hour: { one: 'hver time', other: 'hver #. time' },
  minute: { one: 'hvert minutt', other: 'hvert #. minutt' },
  second: { one: 'hvert sekund', other: 'hvert #. sekund' },
}

export const uptime: Messages['uptime'] = {
  title: 'Oppetid',
  monitorsHeading: 'Oppetidsmonitorer',
  monitor: 'Monitor',
  newMonitor: 'Ny monitor',
  now: 'Nå',
  tabs: { label: 'Oppetid', monitors: 'Monitorer', statusPages: 'Statussider' },

  health: {
    down: { counted: () => 'nede', label: 'Nede', inline: 'nede', headline: (name) => `${name} er nede` },
    flapping: { counted: (n) => plural(n, { one: 'ustabil', other: 'ustabile' }), label: 'Ustabil', inline: 'ustabil', headline: (name) => `${name} er ustabil` },
    slow: { counted: (n) => plural(n, { one: 'treg', other: 'trege' }), label: 'Treg', inline: 'treg', headline: (name) => `${name} er treg` },
    up: { counted: () => 'oppe', label: 'Oppe', inline: 'oppe', headline: (name) => `${name} er oppe` },
    waiting: { counted: () => 'venter', label: 'Venter', inline: 'venter', headline: (name) => `${name} har ikke rapportert ennå` },
  },
  downNow: 'Nede nå',
  recovered: 'Gjenopprettet',

  reasons: {
    unknown: 'Ingen svar',
    timeout: 'Tidsavbrudd',
    status: 'Feil status',
    body: 'Fant ikke teksten',
    certificate: 'Sertifikatproblem',
    network: 'Kunne ikke koble til',
  },
  noHeartbeat: 'Ingen heartbeat',
  noHeartbeatYet: 'Ingen heartbeat ennå',
  heartbeatEvery: (every) => `Heartbeat ${every}`,
  noCheckYet: 'Ingen sjekk ennå',
  downSince: (since, reason) => `${since ? `Nede i ${since}` : 'Nede'} · ${reason}`,
  flappingSince: (downs, when) => `Nede ${downs} ganger siden ${when.charAt(0).toLowerCase()}${when.slice(1)}`,
  slowLine: (typical, timeout) => `${typical} av et tidsavbrudd på ${timeout} s`,
  upSince: (since) => (since ? `Oppe i ${since}` : 'Oppe'),
  seconds: (count) => `${count} s`,

  interval: (unit, count) => plural(count, INTERVAL[unit]),
  every: (unit, count) => plural(count, EVERY[unit]),

  list: {
    failed: 'Monitorene ble ikke lastet',
    empty: 'Legg til en monitor for å se når et nettsted eller en jobb går ned',
    waitingGroup: 'Venter på første sjekk',
    monitors: (count) => plural(count, { one: 'monitor', other: 'monitorer' }),
    allUp: 'alle oppe',
    downtimeSince: (since) => `Nedetid siden ${since}`,
    lastChecks: 'Siste 60 sjekker',
    changed: 'Endret',
    more: 'Flere monitorer',
    loading: 'Laster monitorer',
  },

  noAccess: { title: 'Du kan ikke endre monitorer i denne organisasjonen', description: 'Be en administrator i organisasjonen om å gi deg tilgang til prosjektene.' },

  page: {
    notFound: 'Fant ikke monitoren',
    failed: 'Monitoren ble ikke lastet',
    goToUptime: 'Gå til oppetid',
    loading: 'Laster monitor',
    downtime: 'Nedetid',
    inLast: { [StatsPeriod.day]: 'de siste 24 timene', [StatsPeriod.fortnight]: 'de siste 14 dagene' },
    upShare: (share, inLast) => (
      <>
        {share} oppe {inLast}
      </>
    ),
    upSinceFirst: (share) => <>{share} oppe siden første sjekk</>,
    downtimeFailed: 'Nedetiden ble ikke lastet.',
    waitingNothing: 'Ingenting å vise før første sjekk.',
    noDowntime: (inLast) => `Ingen nedetid ${inLast}.`,
    heartbeatAddress: 'Heartbeat-adresse',
    setup: 'Oppsett',
    alerts: 'Varsler',
    nobody: 'Ingen',
    nobodyHears: 'Ingen får beskjed når denne går ned.',
    addRule: 'Legg til en regel',
    linkProject: 'Koble til et prosjekt',
    facts: { check: 'Sjekk', status: 'Status', text: 'Tekst', timeout: 'Tidsavbrudd', downAfter: 'Nede etter', environment: 'Miljø' },
    failedCount: (count) => `${count} feil`,

    lastChecks: (count) => plural(count, { one: 'Siste sjekk', other: 'Siste # sjekker' }),
    passed: 'Bestått',
    response: 'Respons',
    slow: 'Trege',
    peak: (time) => `topp ${time}`,
    slowOver: (time) => `tregt over ${time}`,

    wentDown: 'Gikk ned',
    cameBack: 'Kom tilbake',
    notYet: 'Ikke ennå',
    releaseBefore: 'Utgivelse før',
    alertsGoTo: 'Varsler går til',
    earlier: (release, span) => (
      <>
        {release}, {span} tidligere
      </>
    ),
    ago: (time) => `${time} siden`,
    agoWidth: '100px',
    lasting: (span, ongoing) => (ongoing ? `${span} så langt` : span),

    checks: 'Sjekker',
    showChecks: 'Vis sjekker',
    views: { all: 'Alle', incidents: 'Bare endringer' },
    checksFailed: 'Sjekkene ble ikke lastet.',
    backToNewest: 'Tilbake til nyeste',
    noIncidents: 'Ingen endringer registrert.',
    noChecks: 'Ingen sjekker ennå.',
    caption: (total) => `${total === undefined ? '' : `${plural(total, { one: '# sjekk', other: '# sjekker' })}, `}nyeste først`,
    time: 'Tid',
    result: 'Resultat',
    range: (from, to, total) => `${number(from)}–${number(to)}${total === undefined ? '' : ` av ${typeof total === 'number' ? number(total) : total}`}`,
    older: 'Eldre sjekker',
    newer: 'Nyere sjekker',
    firstCheck: 'Første sjekk',
    wentDownBecause: (reason) => `Gikk ned · ${reason}`,
    loadingRows: 'Laster',

    deleteTitle: (name) => `Slette ${name}?`,
    deleteDescription: 'Sjekkhistorikken slettes sammen med den.',
    deleteMonitor: 'Slett monitor',
    deleteAction: 'slette monitoren',
  },

  dialog: {
    ready: (name) => `${name} er klar`,
    edit: (name) => `Rediger ${name}`,
    callEvery: (every) => `Kall denne adressen ${every}.`,
    openMonitor: 'Åpne monitor',
    saveMonitor: 'Lagre monitor',
    createMonitor: 'Opprett monitor',
    saveAction: 'lagre monitoren',
    limit: 'Denne organisasjonen har så mange monitorer den kan ha. Slett en for å legge til en ny.',
    byApi: 'Denne typen sjekk settes opp via API-et og kan ikke endres her.',
    groups: { check: 'Sjekk', expect: 'Forventet', schedule: 'Tidsplan', belongsTo: 'Tilhører' },
    type: 'Type',
    types: { ping: 'Ping', port: 'Port', heartbeat: 'Heartbeat' },
    addressToCall: 'Adresse som skal kalles',
    address: {
      url: { label: 'URL', missing: 'Skriv inn URL-en som skal sjekkes.' },
      host: { label: 'Vert', missing: 'Skriv inn verten som skal sjekkes.' },
      hostPort: { label: 'Vert og port', missing: 'Skriv inn verten og porten som skal sjekkes.' },
    },
    name: 'Navn',
    nameMissing: 'Gi monitoren et navn.',
    hostPortExample: 'Skriv inn en vert og en port, for eksempel db.example.com:5432.',
    statusExample: 'En statuskode, for eksempel 200.',
    timeoutRange: (max) => `Fra 1 til ${max}.`,
    status: 'Status',
    pageContains: 'Siden inneholder',
    every: 'Intervall',
    heartbeatEveryLabel: 'Intervall for heartbeat',
    timeoutSeconds: 'Tidsavbrudd (sekunder)',
    downAfter: 'Nede etter',
    noProject: 'Ingen (ingen varsler)',
    environment: 'Miljø',
    refused: {
      privateAddress: 'Denne adressen ligger på et privat nettverk. Monitorer kan bare sjekke offentlige adresser.',
      badAddress: 'Skriv inn en full adresse, for eksempel https://example.com/health.',
      badPort: 'Skriv inn en vert og en port, for eksempel db.example.com:5432.',
    },
  },

  statusPages: {
    title: 'Statussider',
    new: 'Ny statusside',
    failed: 'Statussidene ble ikke lastet',
    empty: 'Lag en statusside for å vise andre hvilke tjenester som er oppe',
    loading: 'Laster statussider',
    public: 'Offentlig',
    members: 'Medlemmer',
    opensInNewTab: 'Åpnes i en ny fane',
    copyLink: 'Kopier lenke',
    noMonitors: 'Ingen monitorer ennå',
    addMonitors: 'Legg til monitorer',
    adminAdds: 'En administrator legger til monitorer på denne siden.',
    downFor: (span) => <>nede i {span}</>,
    editPage: 'Rediger siden',
    nameMissing: 'Gi siden et navn.',
    anyoneWithLink: 'Alle med lenken kan se den',
    create: 'Opprett statusside',
    createAction: 'opprette statussiden',
  },
}
