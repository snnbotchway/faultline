import { useQuery } from '@tanstack/react-query'
import { MailWarning } from 'lucide-react'
import { useState } from 'react'
import { account, emailsQuery } from '@/api/account'
import { Feature, instanceSettingsQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { useAction } from '@/features/account/use-action'

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
    <section aria-label="Verify your email" className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-card px-3 py-1 md:px-4">
      <MailWarning className="text-level-warning" />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="mono">{primary.email}</span> isn't verified.
      </span>
      {send.message && <span className="text-destructive">{send.message}</span>}
      <Button size="bar" className="ml-auto" disabled={sent || send.busy} aria-busy={send.busy} onClick={() => void send.run()}>
        {sent ? 'Email sent' : 'Send verification email'}
      </Button>
    </section>
  )
}
