import { useQuery } from '@tanstack/react-query'
import { Feature, instanceSettingsQuery } from '@/api/organizations'
import { PageBar } from '@/components/shell/app-shell'
import { useTitle } from '@/lib/title'
import { useLastOrganization } from './access'
import { Group, Row, RowSkeleton, SettingsBar, Sheet } from './parts'
import { useT, type Messages } from '@/i18n'

const FEATURES: { feature: Feature; name: keyof Messages['settings']['system'] }[] = [
  { feature: Feature.email, name: 'email' },
  { feature: Feature.uptime, name: 'uptime' },
  { feature: Feature.logs, name: 'logs' },
  { feature: Feature.mcp, name: 'mcp' },
]

// What this server is and what it has switched on. Nothing here can be changed from the browser.
export function SystemInfo() {
  const { settings: { system: text }, common } = useT()
  useTitle(text.title)
  const org = useLastOrganization()
  const settings = useQuery(instanceSettingsQuery).data
  return (
    <>
      {org ? (
        <SettingsBar org={org} title={text.title} />
      ) : (
        <PageBar>
          <h1 className="text-2xl font-semibold">{text.title}</h1>
        </PageBar>
      )}
      <Sheet>
        {!settings ? (
          <RowSkeleton />
        ) : (
          <>
            <Group label={text.server}>
              <Row label="GlitchTip" mono value={settings.version} />
              {settings.glitchtipInstanceName && <Row label={text.name} value={settings.glitchtipInstanceName} />}
              {settings.environment && <Row label={text.environment} mono value={settings.environment} />}
              <Row label={text.timeZone} mono value={settings.serverTimeZone} />
            </Group>
            <Group label={text.accounts}>
              <Row label={text.signUp} value={settings.enableUserRegistration ? text.openToAnyone : text.byInvitation} />
              <Row label={text.newOrganizations} value={settings.enableOrganizationCreation ? text.anyUser : text.adminsOnly} />
            </Group>
            <Group label={text.features}>
              {FEATURES.map(({ feature, name }) => (
                <Row key={feature} label={text[name]} value={settings.enabledFeatures.includes(feature) ? common.on : common.off} />
              ))}
            </Group>
          </>
        )}
      </Sheet>
    </>
  )
}
