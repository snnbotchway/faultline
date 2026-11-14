// THROWAWAY PROTOTYPE. Stub data in the real API shapes, so the screens can be judged without a backend.
import type { components } from '@/api/schema/openapi'

type Schemas = components['schemas']
export type Project = Schemas['ProjectTeamSchema']
export type Team = Schemas['TeamSchema']
export type Member = Schemas['OrganizationUserDetailSchema']
export type ProjectKey = Schemas['ProjectKeySchema']
export type Environment = Schemas['EnvironmentProjectSchema']
export type OrgDetail = Schemas['OrganizationDetailSchema']
export type InstanceSettings = Schemas['SettingsOut']
export type OrgRole = Member['role']
export type Scope = OrgDetail['access'][number]

export const OrgRole = { member: 'member', admin: 'admin', manager: 'manager', owner: 'owner' } as const

export const ROLES: { value: OrgRole; label: string; can: string }[] = [
  { value: OrgRole.member, label: 'Member', can: 'Issues and events' },
  { value: OrgRole.admin, label: 'Admin', can: 'Teams and projects they are on' },
  { value: OrgRole.manager, label: 'Manager', can: 'Members and every team' },
  { value: OrgRole.owner, label: 'Owner', can: 'Everything, including deleting the organization' },
]

export const roleLabel = (role: OrgRole) => ROLES.find((r) => r.value === role)?.label ?? role

const HOUR = 3600_000
const DAY = 24 * HOUR
// A fixed "now" keeps the screenshots stable.
export const NOW = new Date('2026-11-14T12:00:00Z')
const before = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

const base = {
  avatar: { avatarType: '', avatarUuid: null },
  color: '',
  features: [],
  hasAccess: true,
  isBookmarked: false,
  isInternal: false,
  isMember: true,
  isPublic: false,
}

const project = (id: string, slug: string, platform: string, teams: string[], extra: Partial<Project> = {}): Project => ({
  ...base,
  id,
  name: slug,
  slug,
  platform,
  scrubIPAddresses: true,
  dateCreated: before(90 * DAY),
  firstEvent: before(89 * DAY),
  eventThrottleRate: 0,
  teams: teams.map((team) => ({ id: TEAM_IDS[team] ?? '0', slug: team })),
  ...extra,
})

const TEAM_IDS: Record<string, string> = { core: '1', payments: '2', mobile: '3', growth: '4' }

export const TEAMS: Team[] = [
  { id: '1', slug: 'core', dateCreated: before(200 * DAY), isMember: true, memberCount: 4 },
  { id: '2', slug: 'payments', dateCreated: before(120 * DAY), isMember: true, memberCount: 3 },
  { id: '3', slug: 'mobile', dateCreated: before(60 * DAY), isMember: false, memberCount: 2 },
]

export const PROJECTS: Project[] = [
  project('1', 'web-app', 'javascript-react', ['core']),
  project('2', 'payments-api', 'python-django', ['core', 'payments']),
  project('3', 'mobile', 'react-native', ['mobile'], { scrubIPAddresses: false }),
  project('4', 'billing-worker', 'go', ['payments'], { dateCreated: before(2 * HOUR), firstEvent: null }),
]

export type ProjectRow = { org: string; project: Project; buckets: number[]; unresolved: number; lastSeen: string | null; alerts: number }

export const HOME: ProjectRow[] = [
  { org: 'demo-co', project: PROJECTS[0]!, buckets: [4, 6, 3, 8, 5, 2, 0, 3, 9, 12, 7, 4, 6, 31], unresolved: 23, lastSeen: before(7 * 60_000), alerts: 2 },
  { org: 'demo-co', project: PROJECTS[1]!, buckets: [1, 0, 0, 2, 1, 0, 0, 0, 3, 1, 0, 0, 2, 1], unresolved: 4, lastSeen: before(3 * HOUR), alerts: 1 },
  { org: 'demo-co', project: PROJECTS[2]!, buckets: [12, 15, 9, 11, 14, 18, 13, 10, 8, 9, 12, 16, 11, 9], unresolved: 58, lastSeen: before(41 * 60_000), alerts: 1 },
  { org: 'demo-co', project: PROJECTS[3]!, buckets: Array.from({ length: 14 }, () => 0), unresolved: 0, lastSeen: null, alerts: 0 },
  {
    org: 'side-lab',
    project: project('9', 'landing', 'javascript-nextjs', ['growth']),
    buckets: [0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0],
    unresolved: 1,
    lastSeen: before(6 * DAY),
    alerts: 0,
  },
]

export const ORGS = [
  { slug: 'demo-co', name: 'Demo Co' },
  { slug: 'side-lab', name: 'Side Lab' },
]

const user = (id: string, email: string, name: string): NonNullable<Member['user']> =>
  ({
    id,
    email,
    name,
    username: email,
    dateJoined: before(200 * DAY),
    lastLogin: before(DAY),
    hasPasswordAuth: true,
    identities: [],
    isSuperuser: false,
    isActive: true,
    options: { timezone: null, stacktraceOrder: null, language: null, clock24Hours: null, preferredTheme: null },
  }) as NonNullable<Member['user']>

const member = (id: string, email: string, name: string | null, role: OrgRole, teams: string[], joined: number): Member => ({
  id,
  role,
  roleName: roleLabel(role),
  dateCreated: before(joined * DAY),
  email,
  user: name === null ? null : user(id, email, name),
  pending: name === null,
  isOwner: role === OrgRole.owner,
  teams,
})

export const ME = '1'

export const MEMBERS: Member[] = [
  member('1', 'demo@example.com', 'Ama Owusu', OrgRole.owner, ['core', 'payments'], 200),
  member('2', 'kofi.mensah@example.com', 'Kofi Mensah', OrgRole.manager, ['core'], 180),
  member('3', 'esi.boateng@example.com', 'Esi Boateng', OrgRole.admin, ['core', 'payments'], 120),
  member('4', 'yaw.darko@example.com', 'Yaw Darko', OrgRole.member, ['mobile'], 60),
  member('5', 'abena.asante@example.com', 'Abena Asante', OrgRole.member, ['core', 'mobile'], 45),
  member('6', 'nana.adjei@example.com', null, OrgRole.member, ['payments'], 2),
  member('7', 'contractor@agency.example', null, OrgRole.admin, [], 9),
]

export const inviteLink = (id: string) => `https://errors.demo-co.example/accept/${id}/d1x9-3f0a7c2be41d5a6f8b90/`

const key = (id: string, name: string, days: number, rateLimit: ProjectKey['rateLimit'] = null): ProjectKey => {
  const hex = id.replaceAll('-', '')
  return {
    id,
    public: id,
    name,
    label: name,
    rateLimit,
    dateCreated: before(days * DAY),
    projectID: 1,
    dsn: {
      public: `https://${hex}@errors.demo-co.example/1`,
      secret: `https://${hex}@errors.demo-co.example/1`,
      security: `https://errors.demo-co.example/api/1/security/?glitchtip_key=${hex}`,
    },
  }
}

export const KEYS: ProjectKey[] = [
  key('b69284c4-b7a9-46d2-b0d9-62ae91fada54', 'Default', 90),
  key('4e1f0c7a-93d2-4b6e-8a15-7c20d9e3f6b1', 'Staging', 30, { window: 60, count: 300 }),
]

export const ENVIRONMENTS: Environment[] = [
  { id: 2, name: 'production', isHidden: false },
  { id: 1, name: 'staging', isHidden: false },
  { id: 3, name: 'pr-1284', isHidden: true },
]

export const ALERT_COUNT = 2

export const ORG: OrgDetail = {
  id: '1',
  name: 'Demo Co',
  slug: 'demo-co',
  dateCreated: before(200 * DAY),
  status: { id: 'active', name: 'active' },
  avatar: { avatarType: '', avatarUuid: null },
  isEarlyAdopter: false,
  require2fa: false,
  isAcceptingEvents: true,
  eventThrottleRate: 0,
  openMembership: true,
  projects: PROJECTS,
  teams: TEAMS,
  access: [],
}

export const INSTANCE = { version: '7.0.0', serverTimeZone: 'UTC', enableUserRegistration: true, enableOrganizationCreation: true, glitchtipInstanceName: 'errors.demo-co.example' }

// What each "view as" role may do, as the backend's org `access` scopes.
const MEMBER_SCOPES: Scope[] = ['org:read', 'member:read', 'team:read', 'project:read', 'event:read', 'event:write', 'event:admin', 'project:releases']
const ADMIN_SCOPES: Scope[] = [...MEMBER_SCOPES, 'project:write', 'project:admin', 'team:write', 'team:admin', 'org:integrations']
const MANAGER_SCOPES: Scope[] = [...ADMIN_SCOPES, 'org:write', 'member:write', 'member:admin']
export const SCOPES: Record<OrgRole, Scope[]> = {
  member: MEMBER_SCOPES,
  admin: ADMIN_SCOPES,
  manager: MANAGER_SCOPES,
  owner: [...MANAGER_SCOPES, 'org:admin'],
}
