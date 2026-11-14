import { createFileRoute } from '@tanstack/react-router'
import { NotBuilt } from '@/components/shell/not-built'
import { validateInboxSearch } from '@/features/issues/search'

export const Route = createFileRoute('/_app/$org/issues/')({
  validateSearch: validateInboxSearch,
  component: () => <NotBuilt name="issues" />,
})
