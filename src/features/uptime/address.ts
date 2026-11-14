// What the uptime addresses hold: which tab is open, and a monitor's id.
export const UptimeTab = { monitors: 'monitors', statusPages: 'status-pages' } as const
export type UptimeTab = (typeof UptimeTab)[keyof typeof UptimeTab]

// A monitor id in the address that cannot be one is not found, without asking the backend.
export const isMonitorId = (id: number) => Number.isInteger(id) && id > 0
