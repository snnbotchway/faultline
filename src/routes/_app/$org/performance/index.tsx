import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/performance/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$org/performance/transaction-groups', params, replace: true })
  },
})
