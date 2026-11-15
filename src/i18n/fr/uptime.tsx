import { StatsPeriod } from '@/api/issues'
import type { Messages } from '../en'
import type { IntervalUnit } from '../en/uptime'
import { count as number, plural, type PluralForms } from '../format'

const INTERVAL: Record<IntervalUnit, PluralForms> = {
  day: { one: '# jour', other: '# jours' },
  hour: { one: '# heure', other: '# heures' },
  minute: { one: '# minute', other: '# minutes' },
  second: { one: '# seconde', other: '# secondes' },
}

const EVERY: Record<IntervalUnit, PluralForms> = {
  day: { one: 'chaque jour', other: 'tous les # jours' },
  hour: { one: 'chaque heure', other: 'toutes les # heures' },
  minute: { one: 'chaque minute', other: 'toutes les # minutes' },
  second: { one: 'chaque seconde', other: 'toutes les # secondes' },
}

export const uptime: Messages['uptime'] = {
  title: 'Disponibilité',
  monitorsHeading: 'Moniteurs de disponibilité',
  monitor: 'Moniteur',
  newMonitor: 'Nouveau moniteur',
  now: 'Maintenant',
  tabs: { label: 'Disponibilité', monitors: 'Moniteurs', statusPages: 'Pages d’état' },

  health: {
    down: { counted: () => 'hors ligne', label: 'Hors ligne', inline: 'hors ligne', headline: (name) => `${name} est hors ligne` },
    flapping: { counted: (n) => plural(n, { one: 'instable', other: 'instables' }), label: 'Instable', inline: 'instable', headline: (name) => `${name} est instable` },
    slow: { counted: (n) => plural(n, { one: 'lent', other: 'lents' }), label: 'Lent', inline: 'lent', headline: (name) => `${name} est lent` },
    up: { counted: () => 'en ligne', label: 'En ligne', inline: 'en ligne', headline: (name) => `${name} est en ligne` },
    waiting: { counted: () => 'en attente', label: 'En attente', inline: 'en attente', headline: (name) => `${name} n’a encore rien signalé` },
  },
  downNow: 'Hors ligne en ce moment',
  recovered: 'Rétabli',

  reasons: {
    unknown: 'Aucune réponse',
    timeout: 'Délai dépassé',
    status: 'Statut inattendu',
    body: 'Texte introuvable',
    certificate: 'Problème de certificat',
    network: 'Connexion impossible',
  },
  noHeartbeat: 'Aucun heartbeat',
  noHeartbeatYet: 'Aucun heartbeat pour l’instant',
  heartbeatEvery: (every) => `Heartbeat attendu ${every}`,
  noCheckYet: 'Aucune vérification pour l’instant',
  // The reason first: on a phone the line is cut, and the reason is what matters.
  downSince: (since, reason) => (since ? `${reason} · depuis ${since}` : `Hors ligne · ${reason}`),
  flappingSince: (downs, day, time) => `Hors ligne ${downs} fois depuis ${day ? `${day.charAt(0).toLowerCase()}${day.slice(1)} ` : ''}${time}`,
  slowLine: (typical, timeout) => `${typical} sur un délai d’attente de ${timeout} s`,
  upSince: (since) => (since ? `En ligne depuis ${since}` : 'En ligne'),
  seconds: (count) => `${count} s`,

  interval: (unit, count) => plural(count, INTERVAL[unit]),
  every: (unit, count) => plural(count, EVERY[unit]),

  list: {
    failed: 'Impossible de charger les moniteurs',
    empty: 'Ajoutez un moniteur pour savoir quand un site ou une tâche tombe en panne',
    waitingGroup: 'En attente d’une première vérification',
    monitors: (count) => plural(count, { one: 'moniteur', other: 'moniteurs' }),
    allUp: 'tous en ligne',
    downtimeSince: (since) => <>Indisponibilité depuis {since}</>,
    lastChecks: '60 dernières vérifications',
    changed: 'Depuis',
    more: 'Plus de moniteurs',
    loading: 'Chargement des moniteurs',
  },

  noAccess: { title: 'Vous ne pouvez pas modifier les moniteurs de cette organisation', description: 'Demandez à un administrateur de l’organisation de vous donner accès à ses projets.' },

  page: {
    notFound: 'Moniteur introuvable',
    failed: 'Impossible de charger ce moniteur',
    goToUptime: 'Aller à la disponibilité',
    loading: 'Chargement du moniteur',
    downtime: 'Indisponibilité',
    inLast: { [StatsPeriod.day]: 'au cours des 24 dernières heures', [StatsPeriod.fortnight]: 'au cours des 14 derniers jours' },
    upShare: (share, inLast) => (
      <>
        {share} en ligne {inLast}
      </>
    ),
    upSinceFirst: (share) => <>{share} en ligne depuis sa première vérification</>,
    downtimeFailed: 'Impossible de charger l’indisponibilité.',
    waitingNothing: 'Rien à afficher avant la première vérification.',
    noDowntime: (inLast) => `Aucune indisponibilité ${inLast}.`,
    heartbeatAddress: 'Adresse du heartbeat',
    setup: 'Configuration',
    alerts: 'Alertes',
    nobody: 'Personne',
    nobodyHears: 'Personne n’est prévenu quand il tombe en panne.',
    addRule: 'Ajouter une règle',
    linkProject: 'Associer un projet',
    facts: { check: 'Vérification', status: 'Statut', text: 'Texte', timeout: 'Délai d’attente', downAfter: 'Hors ligne après', environment: 'Environnement' },
    failedCount: (count) => plural(count, { one: '# échec', other: '# échecs' }),

    lastChecks: (count) => plural(count, { one: 'Dernière vérification', other: '# dernières vérifications' }),
    passed: 'Réussies',
    response: 'Réponse',
    slow: 'Lentes',
    peak: (time) => `pic ${time}`,
    slowOver: (time) => `lent au-delà de ${time}`,

    wentDown: 'Passé hors ligne',
    cameBack: 'Rétabli',
    notYet: 'Pas encore',
    releaseBefore: 'Dernière version avant',
    alertsGoTo: 'Alertes envoyées à',
    earlier: (release, span) => (
      <>
        {release} ({span} plus tôt)
      </>
    ),
    ago: (time) => `il y a ${time}`,
    agoWidth: '108px',
    lasting: (span, ongoing) =>
      ongoing ? (
        <>
          {span}
          <span className="max-sm:sr-only"> jusqu’ici</span>
        </>
      ) : (
        span
      ),

    checks: 'Vérifications',
    showChecks: 'Afficher les vérifications',
    views: { all: 'Toutes', incidents: 'Incidents seulement' },
    checksFailed: 'Impossible de charger les vérifications.',
    backToNewest: 'Retour aux plus récentes',
    noIncidents: 'Aucun incident enregistré.',
    noChecks: 'Aucune vérification pour l’instant.',
    caption: (total) => `${total === undefined ? '' : `${plural(total, { one: '# vérification', other: '# vérifications' })}, `}les plus récentes d’abord`,
    time: 'Heure',
    result: 'Résultat',
    range: (from, to, total) => `${number(from)}–${number(to)}${total === undefined ? '' : ` sur ${typeof total === 'number' ? number(total) : total}`}`,
    older: 'Vérifications plus anciennes',
    newer: 'Vérifications plus récentes',
    firstCheck: 'Première vérification',
    wentDownBecause: (reason) => `Passé hors ligne · ${reason}`,
    loadingRows: 'Chargement',

    deleteTitle: (name) => `Supprimer ${name} ?`,
    deleteDescription: 'Son historique de vérifications est supprimé avec lui.',
    deleteMonitor: 'Supprimer le moniteur',
    deleteAction: 'supprimer le moniteur',
  },

  dialog: {
    ready: (name) => `${name} est prêt`,
    edit: (name) => `Modifier ${name}`,
    callEvery: (every) => `Appelez cette adresse ${every}.`,
    openMonitor: 'Ouvrir le moniteur',
    saveMonitor: 'Enregistrer le moniteur',
    createMonitor: 'Créer le moniteur',
    saveAction: 'enregistrer le moniteur',
    limit: 'Cette organisation a atteint son nombre maximal de moniteurs. Supprimez-en un pour en ajouter un autre.',
    byApi: 'Ce type de vérification est configuré via l’API et ne peut pas être modifié ici.',
    groups: { check: 'Vérification', expect: 'Attendu', schedule: 'Fréquence', belongsTo: 'Appartient à' },
    type: 'Type',
    types: { ping: 'Ping', port: 'Port', heartbeat: 'Heartbeat' },
    addressToCall: 'Adresse à appeler',
    address: {
      url: { label: 'URL', missing: 'Saisissez l’URL à vérifier.' },
      host: { label: 'Hôte', missing: 'Saisissez l’hôte à vérifier.' },
      hostPort: { label: 'Hôte et port', missing: 'Saisissez l’hôte et le port à vérifier.' },
    },
    name: 'Nom',
    nameMissing: 'Donnez un nom au moniteur.',
    hostPortExample: 'Saisissez un hôte et un port, par exemple db.example.com:5432.',
    statusExample: 'Un code de statut, par exemple 200.',
    timeoutRange: (max) => `De 1 à ${max}.`,
    status: 'Statut',
    pageContains: 'La page contient',
    every: 'Intervalle',
    heartbeatEveryLabel: 'Intervalle du heartbeat',
    timeoutSeconds: 'Délai d’attente (secondes)',
    downAfter: 'Hors ligne après',
    noProject: 'Aucun (pas d’alertes)',
    environment: 'Environnement',
    refused: {
      privateAddress: 'Cette adresse est sur un réseau privé. Les moniteurs ne peuvent vérifier que des adresses publiques.',
      badAddress: 'Saisissez une adresse complète, par exemple https://example.com/health.',
      badPort: 'Saisissez un hôte et un port, par exemple db.example.com:5432.',
    },
  },

  statusPages: {
    title: 'Pages d’état',
    new: 'Nouvelle page d’état',
    failed: 'Impossible de charger les pages d’état',
    empty: 'Créez une page d’état pour montrer aux autres quels services sont en ligne',
    loading: 'Chargement des pages d’état',
    public: 'Publique',
    members: 'Membres',
    opensInNewTab: 'S’ouvre dans un nouvel onglet',
    copyLink: 'Copier le lien',
    noMonitors: 'Aucun moniteur pour l’instant',
    addMonitors: 'Ajouter des moniteurs',
    adminAdds: 'Un administrateur ajoute les moniteurs à cette page.',
    downFor: (span) => <>hors ligne depuis {span}</>,
    editPage: 'Modifier la page',
    nameMissing: 'Donnez un nom à la page.',
    anyoneWithLink: 'Toute personne disposant du lien peut la voir',
    create: 'Créer la page d’état',
    createAction: 'créer la page d’état',
  },
}
