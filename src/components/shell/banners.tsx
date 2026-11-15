import { useQuery } from '@tanstack/react-query'
import { Check, ExternalLink, Gauge, MailWarning } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { account, emailsQuery } from '@/api/account'
import { Feature, instanceSettingsQuery, organizationAdminUrl, organizationQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { useAction } from '@/features/account/use-action'
import { useIsSuperuser } from '@/features/settings/access'
import { useT } from '@/i18n'

function Banner({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-card px-3 py-1 md:px-4 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
      {icon}
      {children}
    </section>
  )
}

// Shown above every page while the address the user signs in with is unverified and the instance can mail a link.
export function VerifyEmailBanner() {
  const primary = useQuery(emailsQuery).data?.find((address) => address.isPrimary)
  const canSend = useQuery(instanceSettingsQuery).data?.enabledFeatures.includes(Feature.email)
  const [sent, setSent] = useState(false)
  const t = useT()
  const text = t.shell.banners
  const send = useAction(() => account.sendVerification(primary!.email), {
    action: text.sendVerificationAction,
    onDone: () => setSent(true),
  })
  if (!primary || primary.isVerified || !canSend) return null
  return (
    <Banner label={text.verifyEmail} icon={<MailWarning />}>
      <span className="min-w-0 [overflow-wrap:anywhere]">{text.notVerified(<span className="mono">{primary.email}</span>)}</span>
      {send.message && <span className="text-destructive">{send.message}</span>}
      {/* Present before the send, so a screen reader announces the line when it fills in. */}
      <span role="status" className="ml-auto flex min-w-0 items-center gap-2 [overflow-wrap:anywhere]">
        {sent && (
          <>
            <Check />
            <span>{text.sentTo(<span className="mono">{primary.email}</span>)}</span>
          </>
        )}
      </span>
      {!sent && (
        <Button size="bar" disabled={send.busy} aria-busy={send.busy} onClick={() => void send.run()}>
          {text.sendVerification}
        </Button>
      )}
    </Banner>
  )
}

// Shown above every page while the open organization drops a share of its incoming events, or turns them all away.
// Without billing the share and the switch are set by hand in the backend's admin, which only a superuser can open;
// with billing the quota check sets them from the plan, which an owner changes.
export function OverLimitBanner({ org }: { org: string }) {
  const organization = useQuery(organizationQuery(org)).data
  const billing = useQuery(instanceSettingsQuery).data?.billingEnabled
  const superuser = useIsSuperuser()
  const { shell, common } = useT()
  const text = shell.banners
  const rate = organization?.eventThrottleRate ?? 0
  if (!organization || (organization.isAcceptingEvents && rate <= 0)) return null
  const state = !organization.isAcceptingEvents ? text.isntAccepting : rate >= 100 ? text.droppingAll : text.droppingShare(rate)
  return (
    <Banner label={organization.isAcceptingEvents ? text.eventsDropped : text.notAccepting} icon={<Gauge />}>
      <span className="min-w-0">{billing ? text.overPlan(organization.name, state) : text.state(organization.name, state)}</span>
      {billing ? (
        <span className="text-muted-foreground">{text.ownerCanRaise}</span>
      ) : superuser ? (
        <Button variant="link" className="ml-auto gap-1" asChild>
          <a href={organizationAdminUrl(organization.id)} target="_blank" rel="noreferrer">
            {text.changeIt}
            <ExternalLink className="size-3" />
            <span className="sr-only">{common.opensInNewTab}</span>
          </a>
        </Button>
      ) : (
        <span className="text-muted-foreground">{organization.isAcceptingEvents ? text.askToLift : text.askToTurnOn}</span>
      )}
    </Banner>
  )
}
