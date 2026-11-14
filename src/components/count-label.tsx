import { Skeleton } from '@/components/ui/skeleton'
import { CountState, hitsText, type Count } from '@/lib/format'

// A count beside a filter or tab: a placeholder while it loads, a dash where it cannot be counted.
export function CountLabel({ count }: { count: Count }) {
  if (count.state === CountState.loading) return <Skeleton className="h-3 w-4" />
  if (count.state === CountState.unavailable)
    return (
      <>
        <span aria-hidden>–</span>
        <span className="sr-only">not counted</span>
      </>
    )
  return hitsText(count.hits)
}
