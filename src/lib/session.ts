import type { QueryClient } from '@tanstack/react-query'
import { SessionStatus, auth, sessionQuery, type Session } from '@/api/auth'

export const ANONYMOUS: Session = { status: SessionStatus.anonymous }

// Drops everything cached for the signed-in user, then marks the session signed out.
export function forgetSession(queryClient: QueryClient) {
  queryClient.clear()
  queryClient.setQueryData(sessionQuery.queryKey, ANONYMOUS)
}

export async function signOut(queryClient: QueryClient) {
  await auth.logout()
  forgetSession(queryClient)
}

// The organization to open on `/`.
export const LAST_ORG_KEY = 'faultline-last-org'
