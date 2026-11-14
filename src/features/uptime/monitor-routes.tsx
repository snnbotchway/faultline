import { useQuery } from '@tanstack/react-query'
import { monitorQuery } from '@/api/monitors'
import { canWriteProjects, organizationQuery } from '@/api/organizations'
import { Button } from '@/components/ui/button'
import { TaskActions, TaskDialog } from '@/components/ui/task-dialog'
import { isMonitorId } from './address'
import { MonitorDialog } from './monitor-dialog'

// Opened at an address the user may not have the access for: say so instead of a form that would be refused.
function NoAccess({ onClose }: { onClose: () => void }) {
  return (
    <TaskDialog open onClose={onClose} quietFocus title="You can't change monitors in this organization" description="Ask an admin of the organization to give you access to its projects.">
      <TaskActions className="sm:justify-end">
        <Button onClick={onClose}>Close</Button>
      </TaskActions>
    </TaskDialog>
  )
}

export function NewMonitor({ org, onClose, onCreated }: { org: string; onClose: () => void; onCreated: (id: number) => void }) {
  const access = useQuery(organizationQuery(org)).data?.access
  if (!access) return null
  if (!canWriteProjects(access)) return <NoAccess onClose={onClose} />
  return <MonitorDialog org={org} onClose={onClose} onCreated={(monitor) => onCreated(monitor.id!)} />
}

export function EditMonitor({ org, monitorId, onClose }: { org: string; monitorId: number; onClose: () => void }) {
  const access = useQuery(organizationQuery(org)).data?.access
  // The page under the dialog says when the monitor isn't there.
  const monitor = useQuery({ ...monitorQuery(org, monitorId), enabled: isMonitorId(monitorId) }).data
  if (!access || !monitor) return null
  if (!canWriteProjects(access)) return <NoAccess onClose={onClose} />
  // Keyed on the id, so moving to another monitor starts its own draft.
  return <MonitorDialog key={monitor.id} org={org} monitor={monitor} onClose={onClose} onCreated={onClose} />
}
