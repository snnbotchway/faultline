import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <main className="p-6 font-mono text-sm">Faultline</main>,
})
