import { useQuery } from '@tanstack/react-query'
import { BookOpen, Bug, CircleHelp, ExternalLink, LifeBuoy } from 'lucide-react'
import { supportLinkQuery } from '@/api/support'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const FAULTLINE_REPOSITORY = 'https://github.com/snnbotchway/faultline'

const LINKS = [
  { label: 'Faultline docs', href: `${FAULTLINE_REPOSITORY}/blob/main/README.md`, icon: BookOpen },
  { label: 'Faultline issues', href: `${FAULTLINE_REPOSITORY}/issues`, icon: Bug },
  { label: 'GlitchTip docs', href: 'https://glitchtip.com/documentation', icon: BookOpen },
]

// Menu entries that open in a new tab: docs, the issue trackers, and GlitchTip's support page when the instance gives one.
export function SupportItems() {
  const support = useQuery(supportLinkQuery).data
  const links = support ? [...LINKS, { label: 'GlitchTip support', href: support, icon: LifeBuoy }] : LINKS
  return links.map(({ label, href, icon: Icon }) => (
    <DropdownMenuItem key={label} asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <Icon />
        {label}
        <ExternalLink className="ml-auto size-3 text-muted-foreground" />
      </a>
    </DropdownMenuItem>
  ))
}

export function SupportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label="Support">
          <CircleHelp />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <SupportItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
