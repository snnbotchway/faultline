import { createFileRoute } from '@tanstack/react-router'
import { NewOrganization } from '@/features/settings/new-organization'

export const Route = createFileRoute('/_app/_home/organizations/new')({ component: NewOrganization })
