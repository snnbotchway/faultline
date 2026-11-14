// THROWAWAY PROTOTYPE: project settings in variant D only, to check that the
// direction carries forms, prose and tables. /prototype/settings?variant=d
import { createFileRoute } from '@tanstack/react-router'
import '@/prototype/prototype.css'
import { useProto, validateSearch } from '@/prototype/store'
import { SettingsD } from '@/prototype/variant-d'

export const Route = createFileRoute('/prototype/settings')({ validateSearch, component: SettingsPrototype })

function SettingsPrototype() {
  return <SettingsD proto={useProto()} />
}
