import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  IssueLevel,
  TagKey,
  issueActions,
  issueHashesQuery,
  issueKeys,
  issueTagsQuery,
  issueUserReportsQuery,
  type IssueEvent,
} from '@/api/issues'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { failed } from '@/lib/notice'
import { cn } from '@/lib/utils'
import { cookiesOf, crumbKind, crumbText, crumbsOf, cspOf, requestOf, valueText, type Crumb } from './event'
import { levelColor } from './levels'
import { ago, exact, hourLabel } from './format'
import { DEFAULT_QUERY, withFilter } from './search'
import { isUrl, tagFacets } from './tags'

export function Section({ title, count, className, children }: { title: string; count?: number; className?: string; children: ReactNode }) {
  return (
    <section className={className}>
      <h2 className="label-caps mb-2 flex gap-2 font-semibold text-foreground">
        {title}
        {count !== undefined && <span className="font-normal text-muted-foreground">{count}</span>}
      </h2>
      {children}
    </section>
  )
}

const SHOWN_CRUMBS = 12
const HOUR_MS = 3_600_000

// Seconds before the error, or the clock time when the trail is not from the same moment.
function crumbTime(crumb: Crumb, errorAt: number) {
  if (!crumb.timestamp) return ''
  const at = new Date(crumb.timestamp).getTime()
  const before = errorAt - at
  return before >= 0 && before < HOUR_MS ? `-${(before / 1000).toFixed(1)}s` : hourLabel(at / 1000)
}

export function Timeline({ event, title }: { event: IssueEvent; title: string }) {
  const crumbs = crumbsOf(event)
  const [all, setAll] = useState(false)
  const shown = all ? crumbs : crumbs.slice(-SHOWN_CRUMBS)
  const errorAt = new Date(event.dateCreated).getTime()
  if (crumbs.length === 0) return null
  return (
    <Section title="What happened">
      <ol className="mono border">
        {crumbs.length > shown.length && (
          <li className="border-b">
            <button type="button" onClick={() => setAll(true)} className="flex min-h-8 w-full items-center px-3 text-left font-sans text-sm text-muted-foreground hover:bg-accent hover:text-foreground max-lg:min-h-11">
              {crumbs.length - shown.length} earlier steps
            </button>
          </li>
        )}
        {shown.map((crumb, index) => (
          <li key={index} className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 border-b px-3 py-2 lg:grid-cols-[64px_96px_minmax(0,1fr)]">
            <span className="text-right text-muted-foreground">{crumbTime(crumb, errorAt)}</span>
            <span className={cn('truncate max-lg:hidden', crumb.level === IssueLevel.error || crumb.level === IssueLevel.warning ? levelColor(crumb.level) : 'text-muted-foreground')}>
              {crumbKind(crumb)}
            </span>
            <span className="min-w-0 break-words">
              <span className="text-muted-foreground lg:hidden">{crumbKind(crumb)} </span>
              {crumbText(crumb)}
            </span>
          </li>
        ))}
        <li className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 bg-hit px-3 py-2 font-semibold lg:grid-cols-[64px_96px_minmax(0,1fr)]">
          <span className="text-right">0.0s</span>
          <span className="max-lg:hidden">threw</span>
          <span className="min-w-0 break-words">{title}</span>
        </li>
      </ol>
    </Section>
  )
}

function Pairs({ pairs }: { pairs: [string, unknown][] }) {
  return (
    <dl className="mono grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1">
      {pairs.map(([name, value], index) => (
        <div key={`${name}:${index}`} className="contents">
          <dt className="truncate text-muted-foreground">{name}</dt>
          <dd className="min-w-0 break-words">{valueText(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Fold({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-8 w-full items-center gap-2 px-3 text-left text-sm hover:bg-accent max-lg:min-h-11">
        {label}
        <span className="mono text-muted-foreground">{count}</span>
      </button>
      {open && <div className="border-t px-3 py-2">{children}</div>}
    </div>
  )
}

export function RequestSection({ event }: { event: IssueEvent }) {
  const request = requestOf(event)
  if (!request?.url) return null
  const cookies = cookiesOf(request)
  const body = request.data == null || request.data === '' ? undefined : typeof request.data === 'string' ? request.data : JSON.stringify(request.data, null, 2)
  return (
    <Section title="Request">
      <div className="border">
        <p className="mono flex gap-3 px-3 py-2">
          {request.method && <span className="font-semibold">{request.method}</span>}
          <span className="min-w-0 break-all">{request.url}</span>
        </p>
        {!!request.query?.length && (
          <Fold label="Query" count={request.query.length}>
            <Pairs pairs={request.query} />
          </Fold>
        )}
        {!!request.headers?.length && (
          <Fold label="Headers" count={request.headers.length}>
            <Pairs pairs={request.headers} />
          </Fold>
        )}
        {cookies.length > 0 && (
          <Fold label="Cookies" count={cookies.length}>
            <Pairs pairs={cookies} />
          </Fold>
        )}
        {body && (
          <Fold label="Body" count={body.length}>
            <pre className="mono overflow-x-auto">{body}</pre>
          </Fold>
        )}
      </div>
    </Section>
  )
}

export function CspSection({ event }: { event: IssueEvent }) {
  const report = cspOf(event)
  const pairs = Object.entries(report ?? {}).filter(([, value]) => value != null && value !== '')
  if (pairs.length === 0) return null
  const directive = report?.effective_directive
  return (
    <Section title="CSP report">
      <div className="border px-3 py-2">
        {typeof directive === 'string' && <p className="mono mb-2 font-semibold">{directive}</p>}
        <Pairs pairs={pairs} />
      </div>
    </Section>
  )
}

export function AdditionalData({ event }: { event: IssueEvent }) {
  const pairs = Object.entries(event.context ?? {}).filter(([, value]) => value != null && value !== '')
  if (pairs.length === 0) return null
  return (
    <Section title="Additional data">
      <Pairs pairs={pairs} />
    </Section>
  )
}

// The backend builds the `browser` tag as "name version" and writes "None" when the SDK sent no version.
const tagLabel = (key: string, value: string) => (key === TagKey.browser ? value.replace(/ None$/, '') : value)

const percent = (share: number) => `${Math.round(share * 100)}%`

function Share({ share, flat, children }: { share: number; flat: boolean; children: ReactNode }) {
  return (
    <>
      {flat ? (
        <span className="w-9 shrink-0" aria-hidden />
      ) : (
        <>
          <span className="absolute inset-y-1 left-12 bg-foreground/10" style={{ width: `calc((100% - 3rem) * ${share})` }} aria-hidden />
          <span className="relative w-9 shrink-0 text-right text-muted-foreground">{percent(share)}</span>
        </>
      )}
      <span className="relative min-w-0 flex-1 truncate">{children}</span>
    </>
  )
}

// Clicking a value opens the inbox filtered to it; a value that is a web address also opens on its own.
export function TagsRail({ org, issueId }: { org: string; issueId: string }) {
  const tags = useQuery(issueTagsQuery(org, issueId))
  if (tags.isPending) return <Skeleton className="h-40" />
  if (!tags.data?.length) return null
  return (
    <Section title="Tags">
      <div className="space-y-3">
        {tags.data.map((tag) => {
          const facets = tagFacets(tag)
          return (
            <div key={tag.key}>
              <h3 className="mono mb-1 text-muted-foreground">{tag.key}</h3>
              <ul>
                {facets.rows.map((top) => (
                  <li key={top.value} className="flex items-center">
                    <Link
                      to="/$org/issues"
                      params={{ org }}
                      search={{ query: withFilter(DEFAULT_QUERY, tag.key, top.value) }}
                      className="mono relative flex min-h-6 min-w-0 flex-1 items-center gap-3 pr-2 hover:bg-accent max-lg:min-h-11"
                    >
                      <Share share={top.share} flat={facets.flat}>
                        {tagLabel(tag.key, top.name)}
                      </Share>
                    </Link>
                    {isUrl(top.value) && (
                      <a
                        href={top.value}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${top.value} in a new tab`}
                        className="grid size-6 shrink-0 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground max-lg:size-11"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </li>
                ))}
                {facets.other > 0 && (
                  <li className="mono relative flex min-h-6 items-center gap-3 pr-2 text-muted-foreground max-lg:min-h-11">
                    <Share share={facets.other} flat={false}>
                      other
                    </Share>
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

export function ContextRail({ event }: { event: IssueEvent }) {
  const user = event.user as Record<string, unknown> | null | undefined
  const contexts = Object.entries((event.contexts ?? {}) as Record<string, Record<string, unknown>>)
  const pairsOf = (record: Record<string, unknown>) => Object.entries(record).filter(([key, value]) => key !== 'type' && value != null && value !== '')
  return (
    <>
      {user && pairsOf(user).length > 0 && (
        <Section title="User">
          <Pairs pairs={pairsOf(user)} />
        </Section>
      )}
      {contexts
        .filter(([, context]) => context && typeof context === 'object' && pairsOf(context).length > 0)
        .map(([name, context]) => (
          <Section key={name} title={name}>
            <Pairs pairs={pairsOf(context)} />
          </Section>
        ))}
      <AdditionalData event={event} />
      {event.sdk && (
        <Section title="SDK">
          <Pairs pairs={pairsOf(event.sdk as Record<string, unknown>).filter(([, value]) => typeof value === 'string')} />
        </Section>
      )}
    </>
  )
}

export function UserReports({ org, issueId }: { org: string; issueId: string }) {
  const reports = useQuery(issueUserReportsQuery(org, issueId)).data
  if (!reports?.length) return null
  return (
    <Section title="User reports" count={reports.length}>
      <ul className="space-y-4">
        {reports.map((report) => (
          <li key={report.eventID + report.dateCreated}>
            <Link
              to="/$org/issues/$issueId/events/$eventId"
              params={{ org, issueId, eventId: report.eventID }}
              className="block border-l pl-3 hover:bg-accent max-lg:min-h-11"
            >
              <span className="mono flex flex-wrap items-center gap-x-3 text-muted-foreground">
                <span className="text-foreground">{report.name || report.email}</span>
                {report.name && <span>{report.email}</span>}
                <time dateTime={report.dateCreated} title={exact(report.dateCreated)}>
                  {ago(report.dateCreated)}
                </time>
              </span>
              <span className="prose-text mt-1 block whitespace-pre-wrap">{report.comments}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

// Issues merged into this one keep their fingerprints. Splitting some off makes them a separate issue again; one always stays.
export function Fingerprints({ org, issueId }: { org: string; issueId: string }) {
  const queryClient = useQueryClient()
  const hashes = useQuery(issueHashesQuery(org, issueId)).data
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const split = useMutation({
    mutationFn: () => issueActions.unmerge(org, issueId, [...picked]),
    onSuccess: () => {
      setPicked(new Set())
      void queryClient.invalidateQueries({ queryKey: issueKeys.all(org) })
    },
    onError: (error) => failed(error, 'split off the fingerprints'),
  })
  if (!hashes || hashes.length < 2) return null
  const canSplit = picked.size > 0 && picked.size < hashes.length
  return (
    <Section title="Merged fingerprints" count={hashes.length}>
      <ul className="border">
        {hashes.map((hash) => (
          <li key={hash.id} className="flex items-center gap-1 border-b pr-3 last:border-b-0">
            <Checkbox
              hit
              checked={picked.has(hash.id)}
              onCheckedChange={() => {
                const next = new Set(picked)
                if (!next.delete(hash.id)) next.add(hash.id)
                setPicked(next)
              }}
              aria-label={`Select fingerprint ${hash.id}`}
            />
            <span className="mono shrink-0">{hash.id.slice(0, 12)}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{hash.latestEvent?.title}</span>
          </li>
        ))}
      </ul>
      {picked.size > 0 && (
        <div className="mt-2 flex items-center gap-3">
          <Button size="sm" disabled={!canSplit || split.isPending} onClick={() => split.mutate()}>
            Split off {picked.size}
          </Button>
          {!canSplit && <span className="text-sm text-muted-foreground">One fingerprint has to stay.</span>}
        </div>
      )}
    </Section>
  )
}
