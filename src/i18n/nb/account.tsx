import type { Messages } from '../en'
import { plural } from '../format'

export const account: Messages['account'] = {
  profile: 'Profil',
  connectFailed: 'Den kontoen kunne ikke kobles til. Prøv igjen.',
  manage: 'Administrer',
  change: 'Endre',
  set: 'Angi',
  isSet: 'Angitt',
  connect: 'Koble til',
  add: 'Legg til',
  turnOn: 'Slå på',
  turnOff: 'Slå av',

  groups: { account: 'Konto', signIn: 'Innlogging', twoStep: 'Totrinnsbekreftelse', notifications: 'Varslinger', tokens: 'API-tokener' },
  rows: {
    name: 'Navn',
    timeZone: 'Tidssone',
    emails: 'E-postadresser',
    theme: 'Tema',
    language: 'Språk',
    password: 'Passord',
    linked: 'Tilknyttede kontoer',
    app: 'Autentiserings-app',
    keys: 'Sikkerhetsnøkler',
    recovery: 'Gjenopprettingskoder',
    alertEmails: 'Varsler på e-post',
    deleteAccount: 'Slett konto',
  },
  notVerified: 'ikke bekreftet',
  someNotVerified: (count) => `${count} ikke bekreftet`,
  appOnSince: (date) => (
    <>
      På{' '}
      <span className="whitespace-nowrap text-muted-foreground">siden {date}</span>
    </>
  ),
  codesLeft: (left, total) => (
    <>
      <span className="mono">{left}</span> av <span className="mono">{total}</span> igjen
    </>
  ),
  newCodes: 'Nye koder',
  projectsChanged: (count) => plural(count, { one: '# prosjekt endret', other: '# prosjekter endret' }),
  newToken: 'Nytt token',

  turnOffApp: {
    title: 'Slå av autentiserings-appen?',
    passwordOnly: 'Da trenger du bare passordet ditt for å logge inn.',
    action: 'slå av autentiserings-appen',
  },

  details: {
    title: 'Navn og tidssone',
    action: 'lagre opplysningene dine',
    pickZone: 'Velg en tidssone fra listen.',
  },

  emails: {
    title: 'E-postadresser',
    primary: 'Primær',
    notVerified: 'Ikke bekreftet',
    linkSent: 'Lenke sendt',
    sendAgain: 'Send lenken på nytt',
    makePrimary: 'Gjør til primær',
    add: 'Legg til en e-postadresse',
    addButton: 'Legg til e-post',
    makePrimaryAction: 'gjøre den til primær e-postadresse',
    removeAction: 'fjerne den e-postadressen',
    sendAction: 'sende lenken',
    addAction: 'legge til den e-postadressen',
  },

  password: {
    current: 'Nåværende passord',
    new: 'Nytt passord',
    change: 'Endre passord',
    set: 'Angi passord',
    setTitle: 'Angi et passord',
    changed: 'Passordet er endret.',
    setDone: 'Passordet er angitt.',
    changeAction: 'endre passordet ditt',
    setAction: 'angi passordet ditt',
  },

  linked: {
    title: 'Tilknyttede kontoer',
    disconnectIt: 'Koble den fra',
    disconnect: 'Koble fra',
    connect: (provider) => `Koble til ${provider}`,
    disconnectAction: (provider) => `koble fra ${provider}`,
  },

  delete: {
    title: 'Slette kontoen din?',
    blocked: 'Kontoen din kan ikke slettes ennå',
    owned: (names, count) => (
      <>
        Du eier {names}. Overfør {count === 1 ? 'den' : 'dem'} til et annet medlem, eller slett {count === 1 ? 'den' : 'dem'}, først.
      </>
    ),
    alone: (names, count) => (
      <>
        Du er det eneste medlemmet av {names}. Legg til noen, eller slett {count === 1 ? 'den' : 'dem'}, først.
      </>
    ),
    cantUndo: 'Dette kan ikke angres. API-tokenene dine slutter å virke.',
    action: 'Slett konto',
    deleteAction: 'slette kontoen din',
  },

  notifications: {
    title: 'Varslinger',
    alertEmails: 'Varsler på e-post',
    default: 'Standard',
    forProject: (project) => `Varsler på e-post for ${project}`,
    saveAction: 'lagre det',
    loadAction: 'laste prosjektene dine',
  },

  tokens: {
    noLabel: 'Uten etikett',
    revoke: 'Trekk tilbake',
    revokeTitle: (label) => `Trekke tilbake ${label || 'dette tokenet'}?`,
    revokeToken: 'Trekk tilbake token',
    revokeAction: 'trekke tilbake det tokenet',
    none: 'Ingen tokener',
    createAction: 'lage det tokenet',
    tickOne: 'Kryss av for minst én ting dette tokenet kan gjøre.',
    label: 'Etikett',
    mayDo: 'Dette tokenet kan',
    create: 'Opprett token',
    newTitle: 'Nytt API-token',
    copyNow: (label) => <>Kopier {label} nå</>,
    notShownAgain: 'Det vises ikke igjen.',
    copyToken: 'Kopier token',
    resources: { project: 'Prosjekter', team: 'Grupper', event: 'Hendelser', org: 'Organisasjon', member: 'Medlemmer' },
    levels: { read: 'Lese', write: 'Skrive', admin: 'Administrere' },
    releases: 'Utgivelser',
  },

  twoStep: {
    turnOnTitle: 'Slå på totrinnsbekreftelse',
    step: (step, of) => `Trinn ${step} av ${of}`,
    startAction: 'begynne å sette opp autentiserings-appen',
    checkAction: 'sjekke den koden',
    qr: 'QR-kode for autentiserings-appen din',
    typeKey: 'Eller skriv inn denne nøkkelen',
    appCode: 'Kode fra autentiserings-appen din',
    continue: 'Fortsett',
    saveCodesAction: 'lagre de kodene',
    typeOne: 'Skriv inn en av kodene ovenfor.',
    newCodesAction: 'lage nye gjenopprettingskoder',
    recoveryCodes: 'Gjenopprettingskoder',
    copyCodes: 'Kopier kodene',
    download: 'Last ned',
    confirmSaved: 'Skriv inn en av kodene for å bekrefte at du har lagret dem',
    confirmCodes: 'Bekreft kodene',
    newCodesTitle: 'Nye gjenopprettingskoder',
    replaceCodes: 'Erstatt de gamle kodene',
    removeKeyAction: 'fjerne den nøkkelen',
    added: (date) => `lagt til ${date}`,
    used: (date) => ` · brukt ${date}`,
    keyAlreadyAdded: 'Den nøkkelen er allerede lagt til.',
    keyNotAdded: 'Nøkkelen ble ikke lagt til. Prøv igjen, og berør nøkkelen når nettleseren ber om det.',
    addKeyAction: 'legge til den nøkkelen',
    keyName: 'Navn på en ny nøkkel',
    waitingForKey: 'Venter på sikkerhetsnøkkelen din',
    addKey: 'Legg til sikkerhetsnøkkel',
    keysTitle: 'Sikkerhetsnøkler',
    noKeys: 'Denne nettleseren kan ikke legge til en sikkerhetsnøkkel. Bruk en oppdatert nettleser for å legge til en.',
    sendLinkAction: (count) => plural(count, { one: 'sende lenken', other: 'sende lenkene' }),
    verifyFirst: (count) => plural(count, { one: 'Bekreft e-postadressen din først', other: 'Bekreft e-postadressene dine først' }),
    cantSend: (addresses, count) => (
      <>
        Totrinnsbekreftelse forblir av så lenge {addresses} ikke er bekreftet, og denne serveren kan ikke sende e-post. Be en administrator om å bekrefte{' '}
        {count === 1 ? 'den' : 'dem'}, eller fjern {count === 1 ? 'den' : 'dem'} under E-postadresser.
      </>
    ),
    openLinks: (addresses, count) => (
      <>
        Åpne {count === 1 ? 'lenken' : 'lenkene'} som ble sendt til {addresses}, og slå deretter på dette.
      </>
    ),
    sendFirst: (addresses, count) => (
      <>
        Totrinnsbekreftelse forblir av så lenge {addresses} ikke er bekreftet. Send {count === 1 ? 'en lenke for å bekrefte den' : 'lenker for å bekrefte dem'}, eller fjern{' '}
        {count === 1 ? 'den' : 'dem'} under E-postadresser.
      </>
    ),
    sendLinks: (count) => plural(count, { one: 'Send lenke', other: 'Send lenker' }),
  },

  wizard: {
    title: 'Oppsettsveiviser',
    action: 'koble til veiviseren. Kjør den på nytt for en ny lenke',
    connected: 'Tilkoblet. Gå tilbake til terminalen.',
    ask: 'La oppsettsveiviseren i terminalen bruke kontoen din?',
    connect: 'Koble til veiviseren',
  },

  confirmEmail: {
    title: 'Bekreft e-post',
    verified: 'E-postadressen er bekreftet.',
    expired: 'Denne lenken er utløpt eller allerede brukt',
    sendNew: 'Send en ny fra e-postadressene dine.',
    openProfile: 'Åpne profilen',
    verifying: 'Bekrefter e-postadressen din',
  },
}
