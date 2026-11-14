// PROTOTYPE, throwaway: three variants of the logs screen, switched with ?variant=A|B|C.
import { createFileRoute } from '@tanstack/react-router'
import { LogsA } from '@/features/prototype-performance/logs-a'
import { LogsB } from '@/features/prototype-performance/logs-b'
import { LogsC } from '@/features/prototype-performance/logs-c'
import { validateLogSearch } from '@/features/prototype-performance/logs-shared'
import { LOG_NAMES, PrototypeSwitcher, Variant } from '@/features/prototype-performance/shared'

export const Route = createFileRoute('/_app/$org/prototype/logs')({
  validateSearch: validateLogSearch,
  component: PrototypeLogs,
})

function PrototypeLogs() {
  const { org } = Route.useParams()
  const search = Route.useSearch()
  return (
    <>
      {search.variant === Variant.A && <LogsA org={org} search={search} />}
      {search.variant === Variant.B && <LogsB org={org} search={search} />}
      {search.variant === Variant.C && <LogsC org={org} search={search} />}
      <PrototypeSwitcher org={org} variant={search.variant} names={LOG_NAMES} />
    </>
  )
}
