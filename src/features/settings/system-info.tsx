import { useQuery } from '@tanstack/react-query'
import { Feature, instanceSettingsQuery } from '@/api/organizations'
import { PageBar } from '@/components/shell/app-shell'
import { useTitle } from '@/lib/title'
import { useLastOrganization } from './access'
import { Group, Row, RowSkeleton, SettingsBar, Sheet } from './parts'

const FEATURES: { feature: Feature; label: string }[] = [
  { feature: Feature.email, label: 'Email' },
  { feature: Feature.uptime, label: 'Uptime monitors' },
  { feature: Feature.logs, label: 'Logs' },
  { feature: Feature.mcp, label: 'AI assistant access' },
]

// What this server is and what it has switched on. Nothing here can be changed from the browser.
export function SystemInfo() {
  useTitle('System info')
  const org = useLastOrganization()
  const settings = useQuery(instanceSettingsQuery).data
  return (
    <>
      {org ? (
        <SettingsBar org={org} title="System info" />
      ) : (
        <PageBar>
          <h1 className="font-semibold">System info</h1>
        </PageBar>
      )}
      <Sheet>
        {!settings ? (
          <RowSkeleton />
        ) : (
          <>
            <Group label="Server">
              <Row label="GlitchTip" mono value={settings.version} />
              {settings.glitchtipInstanceName && <Row label="Name" value={settings.glitchtipInstanceName} />}
              {settings.environment && <Row label="Environment" mono value={settings.environment} />}
              <Row label="Time zone" mono value={settings.serverTimeZone} />
            </Group>
            <Group label="Accounts">
              <Row label="Sign-up" value={settings.enableUserRegistration ? 'Open to anyone' : 'By invitation'} />
              <Row label="New organizations" value={settings.enableOrganizationCreation ? 'Any user can create one' : "Only the server's admins"} />
            </Group>
            <Group label="Features">
              {FEATURES.map(({ feature, label }) => (
                <Row key={feature} label={label} value={settings.enabledFeatures.includes(feature) ? 'On' : 'Off'} />
              ))}
            </Group>
          </>
        )}
      </Sheet>
    </>
  )
}
