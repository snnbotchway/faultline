// PROTOTYPE, throwaway: three variants of a transaction's page, switched with ?variant=A|B|C|D.
import { createFileRoute } from '@tanstack/react-router'
import { DetailD } from '@/features/prototype-performance/perf-d'
import { DetailA } from '@/features/prototype-performance/perf-a'
import { DetailB } from '@/features/prototype-performance/perf-b'
import { DetailC } from '@/features/prototype-performance/perf-c'
import { PERFORMANCE_NAMES, PrototypeSwitcher, Variant, validatePerformanceSearch } from '@/features/prototype-performance/shared'

export const Route = createFileRoute('/_app/$org/prototype/performance/$groupId')({
  validateSearch: validatePerformanceSearch,
  component: PrototypeTransaction,
})

function PrototypeTransaction() {
  const { org, groupId } = Route.useParams()
  const { variant } = Route.useSearch()
  return (
    <>
      {variant === Variant.A && <DetailA org={org} groupId={groupId} />}
      {variant === Variant.B && <DetailB org={org} groupId={groupId} />}
      {variant === Variant.C && <DetailC org={org} groupId={groupId} />}
      {variant === Variant.D && <DetailD org={org} groupId={groupId} />}
      <PrototypeSwitcher org={org} variant={variant} names={PERFORMANCE_NAMES} />
    </>
  )
}
