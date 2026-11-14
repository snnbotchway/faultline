import { useQuery } from '@tanstack/react-query'
import { BookOpen, Bug, ExternalLink, Headset, LibraryBig, LifeBuoy } from 'lucide-react'
import { supportLinkQuery } from '@/api/support'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const FAULTLINE_REPOSITORY = 'https://github.com/snnbotchway/faultline'

const LINKS = [
  { label: 'Faultline docs', href: `${FAULTLINE_REPOSITORY}/blob/main/README.md`, icon: BookOpen },
  { label: 'GlitchTip docs', href: 'https://glitchtip.com/documentation', icon: LibraryBig },
  { label: 'Report a Faultline bug', href: `${FAULTLINE_REPOSITORY}/issues`, icon: Bug },
]

// Menu entries that open in a new tab: GlitchTip's support page first when the instance gives one, then the docs
// and Faultline's issue tracker.
export function SupportItems() {
  const support = useQuery(supportLinkQuery).data
  const links = support ? [{ label: 'GlitchTip support', href: support, icon: Headset }, ...LINKS] : LINKS
  return links.map(({ label, href, icon: Icon }) => (
    <DropdownMenuItem key={label} asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <Icon />
        {label}
        <ExternalLink className="ml-auto size-3 text-muted-foreground" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </DropdownMenuItem>
  ))
}

export function SupportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Support" title="Support">
          <LifeBuoy />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <SupportItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
