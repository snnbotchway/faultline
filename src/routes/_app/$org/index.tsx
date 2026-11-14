import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/$org/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$org/issues', params, replace: true })
  },
})
