import { linkOptions } from '@tanstack/react-router'
import type { Project } from '@/api/projects'

/** Where a project opens: its issues, or its setup until it has had an event. */
export const projectLink = (org: string, project: Project) =>
  project.firstEvent
    ? linkOptions({ to: '/$org/issues', params: { org }, search: { project: [Number(project.id)] as number[] } })
    : linkOptions({ to: '/$org/settings/projects/$project', params: { org, project: project.slug ?? '' } })
