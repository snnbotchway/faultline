import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertChoice, accountKeys, alertsQuery, allProjectsQuery, notifications, notificationsQuery } from '@/api/account'
import { explain } from '@/api/errors'
import { FormAlert } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskDialog } from '@/components/ui/task-dialog'

const ON_OFF = [
  { value: 1, label: 'On' },
  { value: 0, label: 'Off' },
] as const

const PER_PROJECT = [
  { value: AlertChoice.inherit, label: 'Default' },
  { value: AlertChoice.on, label: 'On' },
  { value: AlertChoice.off, label: 'Off' },
] as const

function Settings() {
  const queryClient = useQueryClient()
  const defaults = useQuery(notificationsQuery).data
  const alerts = useQuery(alertsQuery).data ?? {}
  const projects = useQuery(allProjectsQuery)
  const [error, setError] = useState('')

  // Each choice is saved as it is made: shown at once, and put back if the backend refuses.
  async function save<T>(queryKey: readonly unknown[], next: T, request: () => Promise<unknown>) {
    const before = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, next)
    setError('')
    try {
      await request()
    } catch (failure) {
      queryClient.setQueryData(queryKey, before)
      setError(explain(failure, 'save that'))
    }
  }

  const organizations = [...new Set((projects.data ?? []).map((project) => project.organization.slug))]

  return (
    <>
      <FormAlert className="mb-4">{error}</FormAlert>
      <div className="flex min-h-11 items-center justify-between gap-3 border-y py-2">
        <span className="font-medium">Alert emails</span>
        <Segmented
          label="Alert emails"
          value={defaults?.subscribeByDefault === false ? 0 : 1}
          options={ON_OFF}
          disabled={!defaults}
          onChange={(value) => void save(accountKeys.notifications, { subscribeByDefault: value === 1 }, () => notifications.setDefault(value === 1))}
        />
      </div>
      {projects.isPending && <Skeleton className="mt-5 h-24" />}
      {projects.isError && <FormAlert className="mt-4">{explain(projects.error, 'load your projects')}</FormAlert>}
      {organizations.map((organization) => (
        <section key={organization}>
          <h3 className="label-caps mt-5 mb-2">{organization}</h3>
          <ul className="border-t">
            {projects.data
              ?.filter((project) => project.organization.slug === organization)
              .map((project) => (
                <li key={project.id} className="flex min-h-11 items-center justify-between gap-3 border-b py-2">
                  <span className="mono min-w-0 truncate">{project.slug ?? project.name}</span>
                  <Segmented
                    label={`Alert emails for ${project.slug ?? project.name}`}
                    value={alerts[project.id] ?? AlertChoice.inherit}
                    options={PER_PROJECT}
                    onChange={(choice) => void save(accountKeys.alerts, { ...alerts, [project.id]: choice }, () => notifications.setProject(project.id, choice))}
                  />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  )
}

export function NotificationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <TaskDialog open={open} onClose={onClose} title="Notifications" done quietFocus>
      <Settings />
    </TaskDialog>
  )
}
