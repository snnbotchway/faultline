// PROTOTYPE, throwaway: three variants of the transactions list, switched with ?variant=A|B|C.
import { createFileRoute } from '@tanstack/react-router'
import { ListA } from '@/features/prototype-performance/perf-a'
import { ListB } from '@/features/prototype-performance/perf-b'
import { ListC } from '@/features/prototype-performance/perf-c'
import { PERFORMANCE_NAMES, PrototypeSwitcher, Variant, validatePerformanceSearch } from '@/features/prototype-performance/shared'

export const Route = createFileRoute('/_app/$org/prototype/performance/')({
  validateSearch: validatePerformanceSearch,
  component: PrototypeTransactions,
})

function PrototypeTransactions() {
  const { org } = Route.useParams()
  const search = Route.useSearch()
  return (
    <>
      {search.variant === Variant.A && <ListA org={org} search={search} />}
      {search.variant === Variant.B && <ListB org={org} search={search} />}
      {search.variant === Variant.C && <ListC org={org} search={search} />}
      <PrototypeSwitcher org={org} variant={search.variant} names={PERFORMANCE_NAMES} />
    </>
  )
}
