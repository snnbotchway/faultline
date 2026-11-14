import { createFileRoute } from '@tanstack/react-router'
import { SystemInfo } from '@/features/settings/system-info'

export const Route = createFileRoute('/_app/_home/system-info')({ component: SystemInfo })
