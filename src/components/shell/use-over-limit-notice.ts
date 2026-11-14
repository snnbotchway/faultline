import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { organizationQuery } from '@/api/organizations'
import { notify } from '@/lib/notice'

// Organizations already told about in this page load; the notice is once per session and is never stored.
const announced = new Set<string>()

// Tells the user once per session when the organization is dropping events for being over its limit.
export function useOverLimitNotice(org: string) {
  const organization = useQuery(organizationQuery(org)).data
  const throttled = (organization?.eventThrottleRate ?? 0) > 0
  const name = organization?.name
  useEffect(() => {
    if (!throttled || announced.has(org)) return
    announced.add(org)
    notify(`${name} is over its event limit. Some events are being dropped.`, true)
  }, [throttled, org, name])
}
