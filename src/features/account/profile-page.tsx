import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AlertChoice, accountKeys, alertsQuery, emailsQuery, notificationsQuery, tokensQuery, twoStep, twoStepQuery, type ApiToken } from '@/api/account'
import { Feature, currentUserQuery, instanceSettingsQuery } from '@/api/organizations'
import { PageBar } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FormAlert } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/task-dialog'
import { LOCALE_NAMES, Locale, isLocale, useChosenLocale, useT } from '@/i18n'
import { useChooseLanguage } from '@/lib/language-sync'
import { Theme, useTheme } from '@/lib/theme'
import { useChooseTheme } from '@/lib/theme-sync'
import { useTitle } from '@/lib/title'
import { DeleteAccountDialog } from './delete-dialog'
import { DetailsDialog } from './details-dialog'
import { EmailsDialog } from './emails-dialog'
import { day, providerName } from './format'
import { LANDING_PATHS, Landing } from './landing'
import { LinkedDialog } from './linked-dialog'
import { NotificationsDialog } from './notifications-dialog'
import { PasswordDialog } from './password-dialog'
import { ControlRow, Fact, Heading } from './rows'
import { NewTokenDialog, TokenRevealDialog, TokenRows } from './tokens'
import { KeysDialog, RecoveryDialog, TotpDialog, VerifyFirstDialog } from './two-step-dialogs'
import { useAction } from './use-action'

// The tasks that have no path of their own.
const Task = {
  details: 'details',
  emails: 'emails',
  password: 'password',
  linked: 'linked',
  totp: 'totp',
  totpOff: 'totpOff',
  keys: 'keys',
  recovery: 'recovery',
  verifyFirst: 'verifyFirst',
  delete: 'delete',
} as const
type Task = (typeof Task)[keyof typeof Task]

const THEMES = [Theme.system, Theme.light, Theme.dark] as const

// The menu's value for following the browser, which is no language of its own.
const BROWSER = 'browser'

// The language of the screen: the browser's, or one picked here, which the account keeps.
function LanguageMenu() {
  const t = useT()
  const chosen = useChosenLocale()
  const choose = useChooseLanguage()
  const label = chosen ? LOCALE_NAMES[chosen] : t.shell.language.browser
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="max-lg:h-11" aria-label={t.common.valueName(t.account.rows.language, label)}>
          {label}
          <ChevronsUpDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={chosen ?? BROWSER} onValueChange={(value) => choose(isLocale(value) ? value : undefined)}>
          <DropdownMenuRadioItem value={BROWSER}>{t.shell.language.browser}</DropdownMenuRadioItem>
          {Object.values(Locale).map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
              {LOCALE_NAMES[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const SECTION_IDS = { [Landing.twoStep]: 'two-step', [Landing.tokens]: 'api-tokens' } as const

export function ProfileSkeleton() {
  const t = useT()
  return (
    <>
      <PageBar>
        <span className="font-semibold">{t.account.profile}</span>
      </PageBar>
      <div className="mx-auto w-full max-w-180 space-y-3 px-3 pt-8 md:px-4" aria-busy>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    </>
  )
}

export function ProfilePage({ landing, connectFailed }: { landing: Landing; connectFailed?: boolean }) {
  const { account: text, common, shell } = useT()
  useTitle(text.profile)
  const navigate = useNavigate()
  const user = useQuery(currentUserQuery).data
  const emails = useQuery(emailsQuery).data
  const factors = useQuery(twoStepQuery).data
  const tokenList = useQuery(tokensQuery).data
  const defaults = useQuery(notificationsQuery).data
  const alerts = useQuery(alertsQuery).data
  const settings = useQuery(instanceSettingsQuery).data
  const theme = useTheme()
  const chooseTheme = useChooseTheme()
  const [task, setTask] = useState<Task | null>(null)
  const [created, setCreated] = useState<ApiToken | null>(null)
  const close = () => setTask(null)
  const open = (next: Task) => () => setTask(next)
  const land = (next: Landing) => void navigate({ to: LANDING_PATHS[next], replace: true })

  const turnOff = useAction(twoStep.deactivateTotp, { action: text.turnOffApp.action, refresh: [accountKeys.authenticators], onDone: close })

  const section = landing === Landing.twoStep || landing === Landing.tokens ? SECTION_IDS[landing] : undefined
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' })
  }, [section, user])

  if (!user || !emails || !factors || !tokenList) return <ProfileSkeleton />

  const primary = emails.find((email) => email.isPrimary)?.email ?? user.email
  const unverifiedEmails = emails.filter((email) => !email.isVerified).map((email) => email.email)
  const unverified = unverifiedEmails.length
  const canSend = settings?.enabledFeatures.includes(Feature.email) ?? true
  const apps = settings?.socialApps ?? []
  // The backend turns two-step verification down while any address is unverified.
  const twoStepTask = (wanted: Task) => open(unverified === 0 ? wanted : Task.verifyFirst)
  const changed = Object.values(alerts ?? {}).filter((choice) => choice !== AlertChoice.inherit).length
  const alertsOn = defaults?.subscribeByDefault !== false

  return (
    <>
      <PageBar className="justify-between">
        <span className="font-semibold">{text.profile}</span>
        <span className="mono truncate text-muted-foreground">{user.email}</span>
      </PageBar>
      <div className="mx-auto w-full max-w-180 px-3 pb-16 md:px-4">
        <h1 className="sr-only">{text.profile}</h1>
        {connectFailed && <FormAlert className="mt-5">{text.connectFailed}</FormAlert>}

        <Heading>{text.groups.account}</Heading>
        <Fact name={text.rows.name} value={user.name || <span className="text-muted-foreground">{common.notSet}</span>} action={common.edit} onClick={open(Task.details)} />
        <Fact
          name={text.rows.timeZone}
          value={user.options.timezone ? <span className="mono">{user.options.timezone}</span> : <span className="text-muted-foreground">{common.notSet}</span>}
          action={common.edit}
          onClick={open(Task.details)}
        />
        <Fact
          name={text.rows.emails}
          value={
            <>
              <span className="mono [overflow-wrap:anywhere]">{primary}</span>{' '}
              <span className="whitespace-nowrap">
                {emails.length > 1 && <span className="text-muted-foreground">+{emails.length - 1}</span>}
                {unverified > 0 && (
                  <span className="text-level-warning">
                    {emails.length > 1 ? ' · ' : ''}
                    {unverified === 1 && emails.length === 1 ? text.notVerified : text.someNotVerified(unverified)}
                  </span>
                )}
              </span>
            </>
          }
          action={text.manage}
          onClick={open(Task.emails)}
        />
        <ControlRow name={text.rows.theme}>
          <Segmented label={text.rows.theme} value={theme} options={THEMES.map((value) => ({ value, label: shell.themes[value] }))} onChange={chooseTheme} />
        </ControlRow>
        <ControlRow name={text.rows.language}>
          <LanguageMenu />
        </ControlRow>

        <Heading>{text.groups.signIn}</Heading>
        <Fact name={text.rows.password} value={user.hasPasswordAuth ? text.isSet : common.notSet} action={user.hasPasswordAuth ? text.change : text.set} onClick={open(Task.password)} />
        {(apps.length > 0 || user.identities.length > 0) && (
          <Fact
            name={text.rows.linked}
            value={user.identities.map((identity) => providerName(apps, identity.provider)).join(', ') || common.none}
            action={user.identities.length > 0 ? text.manage : text.connect}
            onClick={open(Task.linked)}
          />
        )}

        <Heading id={SECTION_IDS[Landing.twoStep]} current={landing === Landing.twoStep}>
          {text.groups.twoStep}
        </Heading>
        {factors.totp ? (
          <Fact
            name={text.rows.app}
            value={text.appOnSince(<span className="mono">{day(factors.totp.created_at)}</span>)}
            action={text.turnOff}
            onClick={open(Task.totpOff)}
          />
        ) : (
          <Fact name={text.rows.app} value={common.off} action={text.turnOn} onClick={twoStepTask(Task.totp)} />
        )}
        <Fact
          name={text.rows.keys}
          value={factors.keys.map((key) => key.name).join(', ') || common.noneFeminine}
          action={factors.keys.length > 0 ? text.manage : text.add}
          onClick={factors.keys.length > 0 ? open(Task.keys) : twoStepTask(Task.keys)}
        />
        {factors.recovery && (
          <Fact
            name={text.rows.recovery}
            value={text.codesLeft(factors.recovery.unused_code_count, factors.recovery.total_code_count)}
            action={text.newCodes}
            onClick={open(Task.recovery)}
          />
        )}

        <Heading>{text.groups.notifications}</Heading>
        <Fact
          name={text.rows.alertEmails}
          value={
            <>
              {alertsOn ? common.on : common.off}
              {changed > 0 && <span className="text-muted-foreground"> · {text.projectsChanged(changed)}</span>}
            </>
          }
          action={text.change}
          onClick={() => land(Landing.notifications)}
        />

        <Heading
          id={SECTION_IDS[Landing.tokens]}
          current={landing === Landing.tokens || landing === Landing.newToken}
          action={
            <Button size="sm" className="max-lg:h-11" onClick={() => land(Landing.newToken)}>
              {text.newToken}
            </Button>
          }
        >
          {text.groups.tokens}
        </Heading>
        <TokenRows list={tokenList} />

        <div className="mt-8 border-t">
          <Fact name={text.rows.deleteAccount} action={common.delete} danger onClick={open(Task.delete)} />
        </div>
      </div>

      <DetailsDialog open={task === Task.details} onClose={close} user={user} />
      <EmailsDialog open={task === Task.emails} onClose={close} emails={emails} canSend={canSend} />
      <PasswordDialog open={task === Task.password} onClose={close} hasPassword={user.hasPasswordAuth} />
      <LinkedDialog open={task === Task.linked} onClose={close} linked={user.identities} apps={apps} />
      <TotpDialog open={task === Task.totp} onClose={close} />
      <KeysDialog open={task === Task.keys} onClose={close} keys={factors.keys} />
      <RecoveryDialog open={task === Task.recovery} onClose={close} />
      <VerifyFirstDialog open={task === Task.verifyFirst} onClose={close} emails={unverifiedEmails} canSend={canSend} />
      <ConfirmDialog
        open={task === Task.totpOff}
        onClose={close}
        title={text.turnOffApp.title}
        description={factors.keys.length > 0 ? undefined : text.turnOffApp.passwordOnly}
        action={text.turnOff}
        busy={turnOff.busy}
        error={turnOff.message}
        onConfirm={() => void turnOff.run()}
      />
      <DeleteAccountDialog open={task === Task.delete} onClose={close} userId={user.id} />

      <NotificationsDialog open={landing === Landing.notifications} onClose={() => land(Landing.top)} />
      <NewTokenDialog
        open={landing === Landing.newToken}
        onClose={() => land(Landing.tokens)}
        onCreated={(token) => {
          setCreated(token)
          land(Landing.tokens)
        }}
      />
      <TokenRevealDialog token={created} onClose={() => setCreated(null)} />
    </>
  )
}
