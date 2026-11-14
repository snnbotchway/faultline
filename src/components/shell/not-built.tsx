import { useTitle } from '@/lib/title'
import { PageBar, Screen } from './app-shell'

// Stands in for a section that exists in GlitchTip but has no Faultline screen yet.
export function NotBuilt({ name }: { name: string }) {
  useTitle(name)
  return (
    <>
      <PageBar>
        <span className="font-semibold">{name}</span>
      </PageBar>
      <Screen title="Not built yet" />
    </>
  )
}
