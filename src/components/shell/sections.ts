import { Activity, Bell, Gauge, Package, ScrollText, Settings, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Feature } from '@/api/organizations'

// Paths under /:org, the same as the stock GlitchTip UI so existing links keep working.
export type Section = { path: string; label: string; icon: LucideIcon; feature?: Feature }

export const SECTIONS: Section[] = [
  { path: 'issues', label: 'Issues', icon: TriangleAlert },
  { path: 'releases', label: 'Releases', icon: Package },
  { path: 'uptime-monitors', label: 'Uptime', icon: Activity, feature: Feature.uptime },
  { path: 'performance', label: 'Performance', icon: Gauge },
  { path: 'logs', label: 'Logs', icon: ScrollText, feature: Feature.logs },
  { path: 'alerts', label: 'Alerts', icon: Bell },
  { path: 'settings', label: 'Settings', icon: Settings },
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
