import { projectActions, type ProjectEnvironment } from '@/api/projects'
import { stale } from '@/api/stale'
import { Screen } from '@/components/shell/app-shell'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useChange } from './change'
import { Group, ROW, RowSkeleton } from './parts'
import { useT } from '@/i18n'

export function Environments({ org, slug, environments, write }: { org: string; slug: string; environments?: ProjectEnvironment[]; write: boolean }) {
  const text = useT().settings.environments
  const toggle = useChange(text.action, ({ name, hidden }: { name: string; hidden: boolean }) => projectActions.setEnvironmentHidden(org, slug, name, hidden), {
    stale: [stale.project(org, slug), stale.environments(org)],
    notice: true,
  })
  if (!environments) return <RowSkeleton rows={3} />
  if (!environments.length) return <Screen title={text.none} />
  return (
    <Group label={text.title} action={<span className="label-caps pr-2 md:pr-3">{text.shown}</span>}>
      {environments.map((environment) => (
        <div key={environment.name} className={ROW}>
          <span className={cn('mono min-w-0 flex-1 break-words', environment.isHidden && 'text-muted-foreground')}>{environment.name}</span>
          {write ? (
            <Switch
              aria-label={text.show(environment.name)}
              className="-mr-1"
              checked={!environment.isHidden}
              disabled={toggle.pending}
              onCheckedChange={(shown) => toggle.run({ name: environment.name, hidden: !shown })}
            />
          ) : (
            <span className="text-sm text-muted-foreground">{environment.isHidden ? text.no : text.yes}</span>
          )}
        </div>
      ))}
    </Group>
  )
}
