// THROWAWAY PROTOTYPE: the design directions for the issue page, switchable with
// `?variant=a|b|c|d` (and `?theme=dark`, `?id=`) on /prototype/issue. Not production code.
import { createFileRoute } from '@tanstack/react-router'
import '@/prototype/prototype.css'
import { PrototypeSwitcher } from '@/prototype/shared'
import { useProto, validateSearch } from '@/prototype/store'
import { IssueA } from '@/prototype/variant-a'
import { IssueB } from '@/prototype/variant-b'
import { IssueC } from '@/prototype/variant-c'
import { IssueD } from '@/prototype/variant-d'

export const Route = createFileRoute('/prototype/issue')({ validateSearch, component: IssuePrototype })

function IssuePrototype() {
  const proto = useProto()
  return (
    <>
      {proto.variant === 'a' && <IssueA proto={proto} />}
      {proto.variant === 'b' && <IssueB proto={proto} />}
      {proto.variant === 'c' && <IssueC proto={proto} />}
      {proto.variant === 'd' && <IssueD proto={proto} />}
      <PrototypeSwitcher proto={proto} />
    </>
  )
}
