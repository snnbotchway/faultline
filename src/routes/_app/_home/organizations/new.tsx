import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PROJECT_LIST_STATE } from '@/features/projects/link'
import { ProjectList } from '@/features/projects/project-list'
import { NewOrganizationDialog } from '@/features/settings/new-organization'

// The stock address of the form: the projects home with the dialog open over it.
export const Route = createFileRoute('/_app/_home/organizations/new')({ component: NewOrganizationPage })

function NewOrganizationPage() {
  const navigate = useNavigate()
  return (
    <>
      <ProjectList />
      <NewOrganizationDialog onClose={() => void navigate({ to: '/', state: PROJECT_LIST_STATE })} />
    </>
  )
}
