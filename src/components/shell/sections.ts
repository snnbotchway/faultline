import { Activity, Bell, Gauge, Package, ScrollText, Settings, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Feature } from '@/api/organizations'
import type { Messages } from '@/i18n'

// Paths under /:org, the same as the stock GlitchTip UI so existing links keep working. `name` picks the label in the catalog.
export type Section = { path: string; name: keyof Messages['shell']['sections']; icon: LucideIcon; feature?: Feature }

export const SECTIONS: Section[] = [
  { path: 'issues', name: 'issues', icon: TriangleAlert },
  { path: 'releases', name: 'releases', icon: Package },
  { path: 'uptime-monitors', name: 'uptime', icon: Activity, feature: Feature.uptime },
  { path: 'performance', name: 'performance', icon: Gauge },
  { path: 'logs', name: 'logs', icon: ScrollText, feature: Feature.logs },
  { path: 'alerts', name: 'alerts', icon: Bell },
  { path: 'settings', name: 'settings', icon: Settings },
]

// Pages outside any organization's path that still belong to one of its sections, by their first path segment.
export const SECTION_OF_PAGE: Record<string, string> = { 'system-info': 'settings' }

// Stock paths that exist but have no nav entry of their own yet.
export const OTHER_SECTION_PATHS: string[] = []

// On a phone the first four fit the tab bar; the rest sit behind "more".
export const TAB_PATHS = ['issues', 'releases', 'uptime-monitors', 'alerts']

const ISSUES = 'issues'

// Where a section's link goes. Issues has its own route; the others share the placeholder route for now.
export const sectionLink = (org: string, section: Section) =>
  section.path === ISSUES ? ({ to: '/$org/issues', params: { org } } as const) : ({ to: '/$org/$section', params: { org, section: section.path } } as const)
