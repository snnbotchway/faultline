// THROWAWAY PROTOTYPE: the design directions for the issue inbox, switchable with
// `?variant=a|b|c|d` (and `?theme=dark`) on /prototype/inbox. Not production code.
import { createFileRoute } from '@tanstack/react-router'
import '@/prototype/prototype.css'
import { PrototypeSwitcher } from '@/prototype/shared'
import { useProto, validateSearch } from '@/prototype/store'
import { InboxA } from '@/prototype/variant-a'
import { InboxB } from '@/prototype/variant-b'
import { InboxC } from '@/prototype/variant-c'
import { InboxD } from '@/prototype/variant-d'

export const Route = createFileRoute('/prototype/inbox')({ validateSearch, component: InboxPrototype })

function InboxPrototype() {
  const proto = useProto()
  return (
    <>
      {proto.variant === 'a' && <InboxA proto={proto} />}
      {proto.variant === 'b' && <InboxB proto={proto} />}
      {proto.variant === 'c' && <InboxC proto={proto} />}
      {proto.variant === 'd' && <InboxD proto={proto} />}
      <PrototypeSwitcher proto={proto} />
    </>
  )
}
