import { createFileRoute, redirect } from '@tanstack/react-router'

// Older GlitchTip links carry the project slug: /:org/:project/issues/:id.
export const Route = createFileRoute('/_app/$org/$project/issues/$issueId')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$org/issues/$issueId', params: { org: params.org, issueId: params.issueId }, replace: true })
  },
})
