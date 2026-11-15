import type { Messages } from '../en'
import { plural } from '../format'

export const account: Messages['account'] = {
  profile: 'Profil',
  connectFailed: 'Ce compte n’a pas pu être associé. Réessayez.',
  manage: 'Gérer',
  change: 'Modifier',
  set: 'Définir',
  isSet: 'Défini',
  connect: 'Associer',
  add: 'Ajouter',
  turnOn: 'Activer',
  turnOff: 'Désactiver',

  groups: { account: 'Compte', signIn: 'Connexion', twoStep: 'Validation en deux étapes', notifications: 'Notifications', tokens: 'Jetons d’API' },
  rows: {
    name: 'Nom',
    timeZone: 'Fuseau horaire',
    emails: 'E-mails',
    theme: 'Thème',
    language: 'Langue',
    password: 'Mot de passe',
    linked: 'Comptes associés',
    app: 'Application d’authentification',
    keys: 'Clés de sécurité',
    recovery: 'Codes de récupération',
    alertEmails: 'E-mails d’alerte',
    deleteAccount: 'Supprimer le compte',
  },
  notVerified: 'non vérifiée',
  someNotVerified: (count) => plural(count, { one: '# non vérifiée', other: '# non vérifiées' }),
  appOnSince: (date) => (
    <>
      Activée{' '}
      <span className="whitespace-nowrap text-muted-foreground">depuis le {date}</span>
    </>
  ),
  codesLeft: (left, total) => (
    <>
      {left} restants sur {total}
    </>
  ),
  newCodes: 'Nouveaux codes',
  projectsChanged: (count) => plural(count, { one: '# projet modifié', many: '# de projets modifiés', other: '# projets modifiés' }),
  newToken: 'Nouveau jeton',

  turnOffApp: {
    title: 'Désactiver l’application d’authentification ?',
    passwordOnly: 'La connexion ne demandera plus que votre mot de passe.',
    action: 'désactiver l’application d’authentification',
  },

  details: {
    title: 'Nom et fuseau horaire',
    action: 'enregistrer vos informations',
    pickZone: 'Choisissez un fuseau horaire dans la liste.',
  },

  emails: {
    title: 'E-mails',
    primary: 'Principale',
    notVerified: 'Non vérifiée',
    linkSent: 'Lien envoyé',
    sendAgain: 'Renvoyer le lien',
    makePrimary: 'Rendre principale',
    add: 'Ajouter une adresse e-mail',
    addButton: 'Ajouter l’adresse',
    makePrimaryAction: 'faire de cette adresse votre adresse principale',
    removeAction: 'retirer cette adresse',
    sendAction: 'envoyer le lien',
    addAction: 'ajouter cette adresse',
  },

  password: {
    current: 'Mot de passe actuel',
    new: 'Nouveau mot de passe',
    change: 'Modifier le mot de passe',
    set: 'Définir le mot de passe',
    setTitle: 'Définir un mot de passe',
    changed: 'Mot de passe modifié.',
    setDone: 'Mot de passe défini.',
    changeAction: 'modifier votre mot de passe',
    setAction: 'définir votre mot de passe',
  },

  linked: {
    title: 'Comptes associés',
    disconnectIt: 'Le dissocier',
    disconnect: 'Dissocier',
    connect: (provider) => `Associer ${provider}`,
    disconnectAction: (provider) => `dissocier ${provider}`,
  },

  delete: {
    title: 'Supprimer votre compte ?',
    blocked: 'Votre compte ne peut pas encore être supprimé',
    owned: (names, count) => (
      <>
        Vous êtes propriétaire de {names}. {count === 1 ? 'Transférez-la' : 'Transférez-les'} à un autre membre, ou {count === 1 ? 'supprimez-la' : 'supprimez-les'}, d’abord.
      </>
    ),
    alone: (names, count) => (
      <>
        Vous êtes le seul membre de {names}. Ajoutez quelqu’un, ou {count === 1 ? 'supprimez-la' : 'supprimez-les'}, d’abord.
      </>
    ),
    cantUndo: 'Cette action est irréversible. Vos jetons d’API cesseront de fonctionner.',
    action: 'Supprimer le compte',
    deleteAction: 'supprimer votre compte',
  },

  notifications: {
    title: 'Notifications',
    alertEmails: 'E-mails d’alerte',
    default: 'Par défaut',
    forProject: (project) => `E-mails d’alerte pour ${project}`,
    saveAction: 'enregistrer ce choix',
    loadAction: 'charger vos projets',
  },

  tokens: {
    noLabel: 'Sans libellé',
    revoke: 'Révoquer',
    revokeTitle: (label) => `Révoquer ${label || 'ce jeton'} ?`,
    revokeToken: 'Révoquer le jeton',
    revokeAction: 'révoquer ce jeton',
    none: 'Aucun jeton',
    createAction: 'créer ce jeton',
    tickOne: 'Cochez au moins une chose que ce jeton peut faire.',
    label: 'Libellé',
    mayDo: 'Ce jeton peut',
    create: 'Créer le jeton',
    newTitle: 'Nouveau jeton d’API',
    copyNow: (label) => <>Copiez {label} maintenant</>,
    notShownAgain: 'Il ne sera plus affiché.',
    copyToken: 'Copier le jeton',
    resources: { project: 'Projets', team: 'Équipes', event: 'Événements', org: 'Organisation', member: 'Membres' },
    levels: { read: 'Lire', write: 'Écrire', admin: 'Administrer' },
    releases: 'Versions',
  },

  twoStep: {
    turnOnTitle: 'Activer la validation en deux étapes',
    step: (step, of) => `Étape ${step} sur ${of}`,
    startAction: 'commencer à configurer l’application d’authentification',
    checkAction: 'vérifier ce code',
    qr: 'Code QR pour votre application d’authentification',
    typeKey: 'Ou saisissez cette clé',
    appCode: 'Code de votre application d’authentification',
    continue: 'Continuer',
    saveCodesAction: 'enregistrer ces codes',
    typeOne: 'Saisissez l’un des codes ci-dessus.',
    newCodesAction: 'créer de nouveaux codes de récupération',
    recoveryCodes: 'Codes de récupération',
    copyCodes: 'Copier les codes',
    download: 'Télécharger',
    confirmSaved: 'Saisissez l’un des codes pour confirmer que vous les avez enregistrés',
    confirmCodes: 'Confirmer les codes',
    newCodesTitle: 'Nouveaux codes de récupération',
    replaceCodes: 'Remplacer les anciens codes',
    removeKeyAction: 'retirer cette clé',
    added: (date) => `ajoutée le ${date}`,
    used: (date) => ` · utilisée le ${date}`,
    keyAlreadyAdded: 'Cette clé est déjà ajoutée.',
    keyNotAdded: 'La clé n’a pas été ajoutée. Réessayez, et touchez la clé quand votre navigateur le demande.',
    addKeyAction: 'ajouter cette clé',
    keyName: 'Nom de la nouvelle clé',
    waitingForKey: 'En attente de votre clé de sécurité',
    addKey: 'Ajouter une clé de sécurité',
    keysTitle: 'Clés de sécurité',
    noKeys: 'Ce navigateur ne peut pas ajouter de clé de sécurité. Utilisez un navigateur récent pour en ajouter une.',
    sendLinkAction: (count) => plural(count, { one: 'envoyer le lien', other: 'envoyer les liens' }),
    verifyFirst: (count) => plural(count, { one: 'Vérifiez d’abord votre adresse e-mail', other: 'Vérifiez d’abord vos adresses e-mail' }),
    cantSend: (addresses, count) => (
      <>
        La validation en deux étapes reste désactivée tant que {addresses} {count === 1 ? 'n’est pas vérifiée' : 'ne sont pas vérifiées'}, et ce serveur ne peut pas envoyer d’e-mails. Demandez à un administrateur de{' '}
        {count === 1 ? 'la vérifier' : 'les vérifier'}, ou {count === 1 ? 'retirez-la' : 'retirez-les'} dans E-mails.
      </>
    ),
    openLinks: (addresses, count) => (
      <>
        Ouvrez {count === 1 ? 'le lien envoyé' : 'les liens envoyés'} à {addresses}, puis activez cette option.
      </>
    ),
    sendFirst: (addresses, count) => (
      <>
        La validation en deux étapes reste désactivée tant que {addresses} {count === 1 ? 'n’est pas vérifiée' : 'ne sont pas vérifiées'}. Envoyez{' '}
        {count === 1 ? 'un lien pour la vérifier' : 'des liens pour les vérifier'}, ou {count === 1 ? 'retirez-la' : 'retirez-les'} dans E-mails.
      </>
    ),
    sendLinks: (count) => plural(count, { one: 'Envoyer le lien', other: 'Envoyer les liens' }),
  },

  wizard: {
    title: 'Assistant de configuration',
    action: 'connecter l’assistant. Relancez-le pour obtenir un nouveau lien',
    connected: 'Connecté. Retournez à votre terminal.',
    ask: 'Autoriser l’assistant de configuration de votre terminal à utiliser votre compte ?',
    connect: 'Connecter l’assistant',
  },

  confirmEmail: {
    title: 'Vérifier l’e-mail',
    verified: 'E-mail vérifié.',
    expired: 'Ce lien a expiré ou a déjà été utilisé',
    sendNew: 'Envoyez-en un nouveau depuis vos e-mails.',
    openProfile: 'Ouvrir le profil',
    verifying: 'Vérification de votre e-mail',
  },
}
