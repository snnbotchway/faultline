import { createFileRoute } from '@tanstack/react-router'
import { SettingsIndex } from '@/features/settings/settings-index'

export const Route = createFileRoute('/_app/$org/settings/')({ component: Settings })

function Settings() {
  return <SettingsIndex org={Route.useParams().org} />
}
