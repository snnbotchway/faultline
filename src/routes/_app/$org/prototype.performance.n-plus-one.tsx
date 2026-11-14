// PROTOTYPE, throwaway: three variants of the repeated-queries (N+1) view, switched with ?variant=A|B|C|D.
import { createFileRoute } from '@tanstack/react-router'
import { RepeatsD } from '@/features/prototype-performance/perf-d'
import { RepeatsA } from '@/features/prototype-performance/perf-a'
import { ListB } from '@/features/prototype-performance/perf-b'
import { RepeatsC } from '@/features/prototype-performance/perf-c'
import { Flag, PERFORMANCE_NAMES, PrototypeSwitcher, Variant, validatePerformanceSearch } from '@/features/prototype-performance/shared'

export const Route = createFileRoute('/_app/$org/prototype/performance/n-plus-one')({
  validateSearch: validatePerformanceSearch,
  component: PrototypeRepeats,
})

function PrototypeRepeats() {
  const { org } = Route.useParams()
  const search = Route.useSearch()
  return (
    <>
      {search.variant === Variant.A && <RepeatsA org={org} search={search} />}
      {search.variant === Variant.B && <ListB org={org} search={search} flag={Flag.repeats} />}
      {search.variant === Variant.C && <RepeatsC org={org} search={search} />}
      {search.variant === Variant.D && <RepeatsD org={org} search={search} />}
      <PrototypeSwitcher org={org} variant={search.variant} names={PERFORMANCE_NAMES} />
    </>
  )
}
