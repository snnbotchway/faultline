import { createFileRoute, redirect } from '@tanstack/react-router'

// The stock UI splits an issue over tabs (comments, merged, user-reports, events); here it is one page.
export const Route = createFileRoute('/_app/$org/issues/$issueId/$tab')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$org/issues/$issueId', params, replace: true })
  },
})
