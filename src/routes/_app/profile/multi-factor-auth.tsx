import { createFileRoute } from '@tanstack/react-router'

// The profile sheet is drawn by the layout above; this path only says where on it to land.
export const Route = createFileRoute('/_app/profile/multi-factor-auth')({ component: () => null })
