import { createFileRoute, notFound } from '@tanstack/react-router'
import { TransactionPage } from '@/features/performance/transaction'

export const Route = createFileRoute('/_app/$org/performance/transaction-groups/$groupId')({
  beforeLoad: ({ params }) => {
    if (!/^\d+$/.test(params.groupId)) throw notFound()
  },
  component: TransactionRoute,
})

function TransactionRoute() {
  const { org, groupId } = Route.useParams()
  return <TransactionPage org={org} groupId={groupId} />
}
