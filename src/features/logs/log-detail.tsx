import { Link } from '@tanstack/react-router'
import { Copy, Ellipsis, Waypoints } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LogEvent } from '@/api/logs'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { failed, notify } from '@/lib/notice'
import { cn } from '@/lib/utils'
import { attributes } from './format'
import { NO_FILTERS, type LogSearch, type SetSearch } from './search'

const TRANSACTION = 'transaction'
const shown = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))
const LINK = 'text-brand underline-offset-4 hover:underline'

async function copy(log: LogEvent) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(log, null, 2))
    notify('Copied')
  } catch (error) {
    failed(error, 'copy the log')
  }
}

// The main thing to do with a log, and the rest behind one menu beside it.
export function LogActions({ log, search, set }: { log: LogEvent; search: LogSearch; set: SetSearch }) {
  const service = log.service && search.service !== log.service ? log.service : undefined
  const host = log.host && search.host !== log.host ? log.host : undefined
  const traceId = log.traceID && search.traceId !== log.traceID ? log.traceID : undefined
  return (
    <div className="flex items-center gap-2">
      {traceId && (
        <Button className="max-lg:h-11 max-lg:min-w-0 max-lg:flex-1" onClick={() => set({ ...NO_FILTERS, project: search.project, traceId })}>
          <Waypoints />
          Logs in this trace
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="max-lg:h-11">
            <Ellipsis />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={traceId ? 'end' : 'start'}>
          {service && (
            <DropdownMenuItem onSelect={() => set({ service, log: undefined })}>
              Only <span className="mono">{service}</span>
            </DropdownMenuItem>
          )}
          {host && (
            <DropdownMenuItem onSelect={() => set({ host, log: undefined })}>
              Only <span className="mono">{host}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => void copy(log)}>
            <Copy />
            Copy as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="col-span-2 grid grid-cols-subgrid border-b py-2">
      <dt className="break-words text-muted-foreground">{name}</dt>
      <dd className="break-all">{children}</dd>
    </div>
  )
}

// Everything a log carries besides its message: where it came from, its trace, then its attributes.
// A transaction opens in Performance; a trace or span narrows the list to its logs.
export function LogFields({ org, log, project, search, className }: { org: string; log: LogEvent; project: string | undefined; search: LogSearch; className?: string }) {
  const where = [
    ['service', log.service],
    ['environment', log.environment],
    ['host', log.host],
    ['project', project],
  ].filter((field): field is [string, string] => !!field[1])
  const trace = (spanId?: string) => ({ to: '/$org/logs', params: { org }, search: { range: search.range, project: search.project, traceId: log.traceID ?? undefined, spanId } }) as const
  return (
    <dl className={cn('mono grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3', className)}>
      {where.map(([key, value]) => (
        <Field key={key} name={key}>
          {value}
        </Field>
      ))}
      {log.traceID && (
        <Field name="trace">
          <Link {...trace()} className={LINK}>
            {log.traceID}
          </Link>
        </Field>
      )}
      {log.traceID && log.spanID && (
        <Field name="span">
          <Link {...trace(log.spanID)} className={LINK}>
            {log.spanID}
          </Link>
        </Field>
      )}
      {attributes(log).map(([key, value]) => (
        <Field key={key} name={key}>
          {key === TRANSACTION && typeof value === 'string' ? (
            <Link to="/$org/performance/transaction-groups" params={{ org }} search={{ query: value }} className={LINK}>
              {value}
            </Link>
          ) : (
            shown(value)
          )}
        </Field>
      ))}
    </dl>
  )
}
