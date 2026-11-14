import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { canWriteProjects, organizationQuery } from '@/api/organizations'
import { Group, GroupAction } from '@/features/settings/parts'
import { AlertRules } from './alert-rules'
import { RuleEditor } from './open-rule'

/** A project's Alerts tab: its rules, and the editor for `alert` (`new` or a rule's id). `onOpen` changes the address. */
export function ProjectAlerts({ org, slug, alert, onOpen }: { org: string; slug: string; alert?: string; onOpen: (alert?: string) => void }) {
  const canWrite = canWriteProjects(useQuery(organizationQuery(org)).data?.access)
  return (
    <Group
      label="Alert rules"
      action={
        canWrite && (
          <GroupAction onClick={() => onOpen(RuleEditor.new)}>
            <Plus />
            New rule
          </GroupAction>
        )
      }
    >
      <AlertRules org={org} project={slug} open={alert ? { project: slug, alert } : undefined} onOpen={(rule) => onOpen(rule?.alert)} />
    </Group>
  )
}
