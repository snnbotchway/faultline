import { useQuery } from '@tanstack/react-query'
import { Check, ExternalLink, Gauge, MailWarning } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { account, emailsQuery } from '@/api/account'
import { Feature, currentUserQuery, instanceSettingsQuery, organizationAdminUrl, organizationQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { useAction } from '@/features/account/use-action'

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
  const send = useAction(() => account.sendVerification(primary!.email), {
    action: 'send the verification email',
    onDone: () => setSent(true),
  })
  if (!primary || primary.isVerified || !canSend) return null
  return (
    <Banner label="Verify your email" icon={<MailWarning />}>
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="mono">{primary.email}</span> isn't verified.
      </span>
      {send.message && <span className="text-destructive">{send.message}</span>}
      {/* Present before the send, so a screen reader announces the line when it fills in. */}
      <span role="status" className="ml-auto flex min-w-0 items-center gap-2 [overflow-wrap:anywhere]">
        {sent && (
          <>
            <Check />
            <span>
              Sent to <span className="mono">{primary.email}</span>
            </span>
          </>
        )}
      </span>
      {!sent && (
        <Button size="bar" disabled={send.busy} aria-busy={send.busy} onClick={() => void send.run()}>
          Send verification email
        </Button>
      )}
    </Banner>
  )
}

// Shown above every page while the open organization drops a share of its incoming events. Without billing the
// share is set by hand in the backend's admin, which only a superuser can open; with billing the quota check sets it
// from the plan, which an owner changes.
export function OverLimitBanner({ org }: { org: string }) {
  const organization = useQuery(organizationQuery(org)).data
  const billing = useQuery(instanceSettingsQuery).data?.billingEnabled
  const superuser = useQuery(currentUserQuery).data?.isSuperuser === true
  const rate = organization?.eventThrottleRate ?? 0
  if (!organization || rate <= 0) return null
  const dropped = rate >= 100 ? 'every new event' : `${rate}% of new events`
  return (
    <Banner label="Events dropped" icon={<Gauge />}>
      <span className="min-w-0">{billing ? `${organization.name} is over its plan's event limit and is dropping ${dropped}.` : `${organization.name} is dropping ${dropped}.`}</span>
      {billing ? (
        <span className="text-muted-foreground">An owner can raise the plan's limit.</span>
      ) : superuser ? (
        <Button variant="link" className="ml-auto gap-1" asChild>
          <a href={organizationAdminUrl(organization.id)} target="_blank" rel="noreferrer">
            Change it
            <ExternalLink className="size-3" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      ) : (
        <span className="text-muted-foreground">Ask a server admin to lift it.</span>
      )}
    </Banner>
  )
}
