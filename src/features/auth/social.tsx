import type { InstanceSettings } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { FULL_BUTTON } from '@/components/ui/field'
import { continueWithProvider } from './session-form'

type SocialApp = InstanceSettings['socialApps'][number]

// One button per provider the server (or the organization) signs in with.
export function SocialButtons({ apps, next }: { apps: SocialApp[] | undefined; next: string | undefined }) {
  if (!apps?.length) return null
  return (
    <div className="mt-6 space-y-2 border-t pt-6">
      {apps.map((app) => (
        <Button key={app.provider} className={FULL_BUTTON} onClick={() => continueWithProvider(app.provider, next)}>
          Continue with {app.name}
        </Button>
      ))}
    </div>
  )
}
