# Fieldbook

Faultline's design system. The tokens live in `src/index.css`; this file holds the rules behind them. Change both together.

A fieldbook is a geologist's notebook: dated observations on ruled paper, exact and plain. Faultline is read by people who are in the middle of something broken, so the screen records what happened and when, and gets out of the way.

## Principles

1. **Time is the axis.** Errors are events in time. Every list of issues shares one time axis, and releases are marked on it, so "what changed" is answered by looking.
2. **The screen explains itself.** No help paragraphs, no hint text under fields, no onboarding copy. If a control needs a sentence, rename the control. Background detail sits behind a control the user opens (a popover, an unfolded row), never on the page by default. This holds for every screen, settings included.
3. **Keyboard first, touch complete.** Every action in the inbox and on an issue has a key. Nothing is keyboard-only: on a phone the same actions are reachable with a thumb.
4. **Data looks like data.** Machine text is monospaced and exact; words are set in a sans. The two never trade places.
5. **Flat and ruled.** Hairlines and paper, square corners, no shadows on the page, no gradients, no decoration.

## Type

One superfamily, two roles. Both are self-hosted through `@fontsource`.

| Role | Face | Used for |
| --- | --- | --- |
| Words | IBM Plex Sans (variable) | issue titles and error messages, navigation and tabs, buttons, form labels and inputs, breadcrumbs, comments and other prose, empty and error states |
| Machine text | IBM Plex Mono 400/500/600 | short ids (`WEB-APP-1`), event ids, numbers in tables and stats, timestamps and durations, axis and release labels, section labels, the search query, stack traces and code, DSNs, tag keys and values, URLs, file paths, culprits, slugs |

- An exception type in a row (`TypeError`) is mono semibold at 13px and its message is sans, so the type still scans as code: the `error-type` utility.
- Section labels (`STACK TRACE`, `WHAT HAPPENED`, `EVENTS`) are mono, 12px, uppercase, tracked 0.12em, muted: the `label-caps` utility. A label names a section; it never sits above a heading as a kicker.
- The wordmark `FAULTLINE` is mono semibold 12px, tracked 0.18em: the `tracking-wordmark` token.
- A one-time code (an authenticator or recovery code, typed or shown) is mono, tracked 0.2em so each digit stands apart: the `tracking-code` token.
- Sans text is sentence case. Identifiers are shown exactly as the system has them.
- Numbers are tabular everywhere.

| Token | Desktop | Touch (below 1024px) | Use |
| --- | --- | --- | --- |
| `text-xs` | 12px | 12px | the floor; labels, axis text |
| `text-sm` | 13px | 13px | secondary sans, navigation, buttons, field labels and the errors under them |
| `text-base` | 14px | 15px | body sans |
| `mono` utility | 12.5px | 13px | machine text |
| `text-lg` | 16px | 16px | emphasised body |
| `text-xl` | 18px | 18px | state-screen titles, stat values |
| `text-2xl` | 22px | 22px | page titles |
| `text-3xl` | 26px | 26px | headline numbers |

Every size on screen is one of these steps; a headline that shrinks on a phone moves down a step (`text-2xl lg:text-3xl`), not to a size in between.

The root font size stays at the browser's 16px, so a rem is always 16px and the sizes above are what renders; the body size is set on `body`, never on `html`. Nothing is set below 12px except key hints. Text inputs are 16px on touch layouts so the browser does not zoom (the `touch-input` utility). Prose (`prose-text`) has a 1.55 line height and a measure of at most 72 characters.

## Colour

Warm paper in light, warm near-black in dark. Values are OKLCH; the names are the same in both themes.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `0.972 0.012 85` | `0.16 0.006 70` | the page |
| `card` | `0.992 0.007 85` | `0.195 0.007 70` | bars, menus, dialogs, inputs |
| `foreground` | `0.22 0.012 60` | `0.93 0.02 85` | text |
| `muted-foreground` | `0.42 0.018 70` | `0.77 0.022 80` | secondary text |
| `muted` / `accent` | `0.94 0.014 85` / `0.935 0.016 85` | `0.22 0.008 70` / `0.245 0.01 70` | quiet fills, hover |
| `border` | `0.84 0.018 85` | `0.33 0.012 70` | hairlines |
| `grid` | `0.905 0.018 85` | `0.24 0.008 70` | chart baselines and gridlines |
| `primary` | the foreground | the foreground | the one filled button on a screen |
| `brand` | `0.52 0.19 33` | `0.8 0.16 68` | the mark, current item, links |
| `destructive` | `0.5 0.19 27` | `0.72 0.17 27` | delete, error messages |
| `selected` | `0.925 0.035 60` | `0.27 0.035 68` | selected rows |
| `code` | `0.955 0.013 85` | `0.14 0.006 70` | code and stack frames |
| `hit` | `0.92 0.045 33` | `0.29 0.065 40` | the line that threw |
| `ok` | `0.45 0.11 150` | `0.78 0.13 150` | resolved |
| `level-fatal` | `0.42 0.17 20` | `0.68 0.2 20` | |
| `level-error` | `0.52 0.19 33` | `0.74 0.17 40` | |
| `level-warning` | `0.51 0.12 75` | `0.84 0.15 90` | |
| `level-info` | `0.5 0.1 245` | `0.76 0.09 245` | |
| `level-debug` | `0.5 0.018 70` | `0.7 0.022 80` | |
| `trend-new` | `0.46 0.09 200` | `0.8 0.1 195` | first seen in the last 24 hours |
| `trend-spiking` | `0.52 0.19 33` | `0.74 0.17 40` | well above its own average |

Rules:

- Text is at least 4.5:1 against the surface it sits on, muted text included. Measure when a token changes; `muted-foreground` is 6.6:1 or better on every surface in both themes.
- Colour is never the only signal. A level is a shape and a colour; a trend is a word and a colour.
- New is teal and spiking is red-orange, so the two group labels cannot be mistaken for each other in either theme.
- The brand colour marks where you are. It is not a fill for large areas.
- Focus is drawn in `foreground`: a 2px outline, or the field's border. In the light theme the brand is red, so a focused field must never look like an invalid one; red on a field means `aria-invalid` and nothing else.
- Release marks are quiet: the rule is `grid` and the label is `muted-foreground`. Red on the time axis is reserved for a spike.
- The theme follows the system unless the user picks light or dark; the choice is stored in `localStorage.theme` and applied before first paint.

## Space, density, shape

- 4px grid: every gap, padding, margin and size is a multiple of 4px. No half steps (`gap-1.5`, `px-2.5`) and no one-off pixel values. Horizontal page padding is 12px on a phone and 16px from 768px.
- A list's checkbox column is 44px wide, the `check` spacing token; text that lines up with the row titles is indented by it (`pl-check`).
- Bars are 44px tall. Desktop rows are 36 to 52px (a two-line issue row is 52px); controls are 28 to 36px.
- On touch layouts every tap target is at least 44 by 44px, including checkboxes, whose visible box stays 16px. A button drawn 36px tall in a bar or a group heading reaches 44px through `touch-hit`.
- Radius is 0 everywhere.
- Surfaces are separated by 1px hairlines, not shadows. Only things that float above the page (menus, dialogs, the palette) cast a shadow, and they all cast the same one: the `shadow-float` token.
- No coloured side stripes on rows or cards. Selection is a fill; the current row is a fill plus the focus outline.

## Motion

- State changes take 100 to 150ms, overlays 150ms, a row unfolding 200ms, all with `--ease-out`.
- Only opacity and transform animate. Nothing loops and nothing bounces.
- Loading shows the shape of what is coming (skeleton rows), not a spinner.
- `prefers-reduced-motion` removes all of it.

## Icons

Lucide, in the text colour. An icon is 16px, or 12px when it sits inline with small text (a chevron in a chip, a count beside an id); there are no other sizes.

Icons accompany a label. An icon alone is allowed for theme, account, close and the palette button, and for the glyphs everyone reads: more (ellipsis), previous and next (chevrons), disclosure (a chevron that unfolds), and sort. Every icon-only control has an accessible name and, on desktop, shows that name on hover. No emoji and no character glyphs standing in for icons.

- Level: a filled square (fatal, error), a triangle (warning), a circle (info), a hollow circle (debug), in the level colour.
- Assignee: the person's initials at 12px in a filled 24px square; unassigned is the `UserRound` outline. The column is labelled.

## The time axis

The inbox and the issue page draw events the same way.

- **Bars, one per bucket.** A bucket is an hour in the 24-hour view and a day in the 14-day view. Counts are discrete, so they are drawn as discrete bars, not a line.
- **A visible zero.** Every trace sits on a 1px baseline in the `grid` colour that runs the full width, so an empty bucket reads as zero and not as missing data. A bucket with any events is at least 2px tall.
- **One shared time scale.** All rows in a list cover the same period, and the axis is labelled once, above the rows. A 24h / 14d toggle beside the axis switches the period.
- **Height scale.** In the inbox each trace is scaled to its own peak, and the row's event count gives the magnitude. On the issue page the chart is labelled with its peak (`peak 31/day`).
- **Releases** are vertical rules through the axis with the short version as a mono label. The same rule runs through every row. On a phone the rows' traces are too narrow for rules, so they show on the issue page only.
- **Colour.** Bars are the foreground at reduced strength. A new issue's bars use `trend-new`; the latest bucket of a spiking issue uses `trend-spiking`.
- Buckets are arrival times, as the backend reports them.

## Components

- **Buttons.** Outline is the default. One filled (`primary`) button per view marks the main action. Destructive is outlined in red and fills on hover. Labels are verbs in sentence case.
- **Inputs.** A hairline box on `card`; the border turns `foreground` on focus and `destructive` only when the field holds a real error, which is after the user has tried to send it. Focus is never red. The label is always visible above the field. Errors appear under the field in the user's words; forms check themselves (`noValidate`), so the browser's own bubbles never show.
- **Menus and popovers.** Square, hairline, on `card`. Items are 32px tall, 44px on touch.
- **Dialogs** are for short tasks that keep their context (confirm a delete or a merge, pick an assignee). They are not a page. A confirmation names what it acts on: how many issues, and for a merge which one is kept.
- **Notices** ("Password changed.") sit at the bottom of the page, one at a time. While a dialog or sheet is open they move to the top, so they never cover it, and opening a dialog clears an old one. A dialog shown once (a new token, recovery codes to confirm) closes only by its own button.
- **Top bar.** Mark and wordmark, organization, then on the inbox the project and environment filters, navigation at the right, the palette button, theme, account.
- **Signed-out screens** (sign in, sign up, reset, an invitation) have the top bar and nothing else in it: the wordmark at its left, and the bar's rule drawn as the mark, slipping at the centre of the page. The page title is the first thing in the column below.
- **Page bar.** A second 44px bar that sticks while the page scrolls. It says where you are within the section and carries the page's main controls. It mirrors the URL path.
- **Rows.** The whole row is the target. Hover and the keyboard cursor look the same. The word that names a row's action (`Edit`, `Manage`, `Turn on`) is in the text colour; it is `destructive` only when it takes something away (`Delete`, `Remove`, `Disconnect`, `Revoke`). A row's action is always that word, never a boxed button.
- **State screens** (empty, not found, not built, failed) are a muted mark, one plain sentence as the title, and at most one action. An empty list says what would make it non-empty.
- **Key hints** (`Kbd`) show beside the action they trigger and are hidden on touch layouts.

## Settings

- **One index.** `/:org/settings` lists everything that can be set: the organization, its people, its sign-in apps, its projects, the server. Its search finds a setting, project or person by any word; `Enter` opens the first match.
- **Rows.** A setting is a row: name, current value, then what it does. A chevron right leads to a page, a chevron down unfolds the row in place with one field and Save, a row with neither only reports. A setting the backend will not change is left out, not shown disabled.
- **Short tasks are dialogs** (invite, new team, new key, confirm). A dialog that deletes something with data behind it asks for its name to be typed.
- **Danger** is the last group on a page and holds only destructive rows.
- **Tabs** show one panel at a time and each has an address. The project page opens on Set up until the first event arrives, then on General.
- **Machine text is never cut.** A DSN, an invite link, an email address and a code sample wrap inside their box; each copyable value has its Copy button in the same box.
- **Waiting** for something from outside (the first event) is a status line with an icon, not a control: dashed while waiting, `ok` when it arrives, with the main button leading on.
- **Permissions.** Controls the user's role cannot use are absent. A list they can read but not change has no controls in its rows, and a row unfolds only when it has more to show.
- No help paragraphs under fields. What a role may do is behind "Compare roles", beside the control.

## Command palette

`⌘K` or `Ctrl K`. 640px wide, centred near the top; full width on a phone. It lists the commands that apply right now and nothing else: a command that cannot run in the current context is absent, not disabled.

| Group | Holds |
| --- | --- |
| selection | what can be done to the selected issues |
| issue | what can be done to the open issue |
| show | the inbox's other status views |
| go to | every section except the one you are in, then the organization's projects, members and teams |
| organization | the other organizations |
| theme | system, light and dark |
| account | sign out |
| search | free text, as a search of issues; always last |

The groups are listed in this order.

## Keyboard

| Key | Where | Does |
| --- | --- | --- |
| `⌘K` / `Ctrl K` | everywhere | open the palette |
| `/` | inbox | focus search |
| `/` | settings | focus the settings search |
| `j` / `k` | inbox | next / previous issue |
| `Enter` | inbox | open the issue |
| `o` | inbox | unfold the row (desktop) |
| `x` | inbox | select the row |
| `e` | inbox, issue | resolve |
| `i` | inbox, issue | ignore |
| `u` | inbox, issue | unresolve |
| `a` | inbox, issue | assign |
| `m` | inbox | merge the selection |
| `[` / `]` | issue | older / newer event |
| `Esc` | everywhere | close, clear the selection, leave a field |

Plain keys do nothing while the user is typing or a menu or dialog is open. `Enter` and `Space` belong to a focused button, link or menu item, so they never also run a page shortcut.

## Phone

Designed at 390px, checked at 375px.

- Navigation moves to a bottom tab bar: issues, releases, uptime, alerts, more. Theme and sign out are under more.
- Project and environment filters stay on the inbox, as a row under the page bar.
- Tapping a row opens the issue; rows do not unfold. Titles wrap to two lines instead of cutting off.
- With a selection, the tab bar gives way to an action bar holding the bulk actions.
- An issue's actions sit in a sticky bar at the bottom, the main action filled.
- A dialog opens as a sheet from the bottom edge, full width, with the page's bars still visible above it. Its buttons are pinned along the sheet's bottom, main action first, so they stay in thumb reach while the content scrolls.
- Stats sit in one row and the chart is short, so the stack trace starts on the first screen.
- Code scrolls sideways inside its own box, and a box that scrolls shows a cut-off edge so the user can tell.
- No hover-only information.

## Copy

- Use the user's words. No vendor names, internal names, or status codes on screen.
- No filler: no "Welcome", no "Manage your…", no text that restates the heading.
- Errors say what happened and what to do next, in one sentence.
- Buttons name the action ("Resolve", "Delete 3 issues"), not "OK" or "Submit".
- Counts are exact up to the backend's limit, then shown as `1000+`.
- Times are relative in lists (`7m`, `3d`) and exact on hover. On the issue page a relative time opens to the exact one on tap, and the event's time is written out (without the year and seconds on a phone).
- Words are not abbreviated: `9 events`, not `9 ev`.

## Not built yet

- Alerts, and with them the project's Alerts tab; until then `?tab=alerts` says it is not built.
- The server-stored theme preference; the theme is per browser for now.
