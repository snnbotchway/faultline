import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu'
import { LOCALE_NAMES, Locale, browserLocale, isLocale, useChosenLocale, useT } from '@/i18n'
import { useChooseLanguage } from '@/lib/language-sync'

// The menu's value for following the browser, which is no language of its own.
const BROWSER = 'browser'

/** "Same as browser", then each language under its own name, for a menu that picks the language of the screen. */
export function LanguageItems() {
  const t = useT()
  const chosen = useChosenLocale()
  const choose = useChooseLanguage()
  const browser = browserLocale(navigator.languages)
  return (
    <DropdownMenuRadioGroup value={chosen ?? BROWSER} onValueChange={(value) => choose(isLocale(value) ? value : undefined)}>
      {/* With the language it stands for, so the reader knows what following the browser gives. */}
      <DropdownMenuRadioItem value={BROWSER}>
        {t.shell.language.browser}
        <span className="text-muted-foreground" lang={browser}>
          {' · '}
          {LOCALE_NAMES[browser]}
        </span>
      </DropdownMenuRadioItem>
      {Object.values(Locale).map((locale) => (
        <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
          {LOCALE_NAMES[locale]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
