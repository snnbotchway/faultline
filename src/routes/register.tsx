import { Link, createFileRoute } from '@tanstack/react-router'
import { Screen } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/register')({ component: NotBuiltYet })

function NotBuiltYet() {
  return (
    <div className="flex min-h-dvh">
      <Screen title="Not built yet">
        <Button asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </Screen>
    </div>
  )
}
