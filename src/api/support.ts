import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'

// GlitchTip's own support address, which carries the license key of an instance that has paid for support.
export const supportLinkQuery = queryOptions({
  queryKey: ['instance-license', 'support-link'],
  queryFn: async () => unwrap(await api.GET('/api/0/instance-license/support-link/')).url,
  staleTime: Infinity,
  // Without it the menu simply has no GlitchTip support entry.
  retry: false,
})
