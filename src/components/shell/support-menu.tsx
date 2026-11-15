import { useQuery } from '@tanstack/react-query'
import { BookOpen, Bug, ExternalLink, Headset, LibraryBig, LifeBuoy } from 'lucide-react'
import { supportLinkQuery } from '@/api/support'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useT } from '@/i18n'

const FAULTLINE_REPOSITORY = 'https://github.com/snnbotchway/faultline'

const LINKS = [
  { name: 'faultlineDocs', href: `${FAULTLINE_REPOSITORY}/blob/main/README.md`, icon: BookOpen },
  { name: 'glitchtipDocs', href: 'https://glitchtip.com/documentation', icon: LibraryBig },
  { name: 'reportBug', href: `${FAULTLINE_REPOSITORY}/issues`, icon: Bug },
] as const

// Menu entries that open in a new tab: GlitchTip's support page first when the instance gives one, then the docs
// and Faultline's issue tracker.
export function SupportItems() {
  const support = useQuery(supportLinkQuery).data
  const t = useT()
  const links = support ? [{ name: 'glitchtipSupport' as const, href: support, icon: Headset }, ...LINKS] : LINKS
  return links.map(({ name, href, icon: Icon }) => (
    <DropdownMenuItem key={name} asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <Icon />
        {t.shell.supportLinks[name]}
        <ExternalLink className="ml-auto size-3 text-muted-foreground" />
        <span className="sr-only">{t.common.opensInNewTab}</span>
      </a>
    </DropdownMenuItem>
  ))
}

export function SupportMenu() {
  const t = useT()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="max-lg:hidden" aria-label={t.shell.support} title={t.shell.support}>
          <LifeBuoy />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <SupportItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
