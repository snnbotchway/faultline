# Changelog

All notable changes to Faultline are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- On a phone, the More menu offers Language, as Profile does.

### Changed

- With a single project, home opens its issues straight away, or its setup page until its first event arrives; the organization's Projects page still lists it.

## [0.3.0] - 2026-11-15

Parity with the stock GlitchTip frontend, in English, French and Norwegian Bokmål. Tested against GlitchTip 7.0.0.

### Added

- French and Norwegian Bokmål on every screen, picked under Profile → Language or in the palette, or taken from the browser; dates and numbers follow the language.
- Issue page: a breadcrumb's level shows as a shape as well as a colour.
- The issue list's search box has a syntax popover (`is:`, `level:`, `key:value`, `has:`, `*`).
- The first-seen range offers "Last hour" and a custom range with date and time pickers, sent to GlitchTip in UTC.
- A `+` beside the project filter starts a new project, for people who can create one.
- Shift-click, or Shift X, ticks or unticks every issue between two clicks.
- Issue rows show how old the issue is, tag CSP reports, and show `Resolved` or `Ignored` in the "All" view.
- Issue page: "Copy for AI" in the event header copies the event as markdown, with a one-time pointer to MCP when the instance offers it; a user report links to its event; the way back to the list keeps the issue's project.
- Stack trace: Full and Raw views and newest or oldest call first, both remembered, a Copy button for the raw trace, how the exception was caught, and coloured code lines (highlight.js, loaded when a frame opens).
- Event: a CSP report section, request cookies, and an "Additional data" section for what the SDK attached.
- Tags: the four commonest values, with the rest of the ten one click away and an "other" bar, single-valued tags without a bar, and an open-in-new-tab link on web addresses.
- A Support menu in the top bar, and Help in More on a phone, with links to GlitchTip's support page, the Faultline and GlitchTip docs, and a way to report a Faultline bug.
- A banner under the top bar while your primary email is unverified, with a button to send the link again and a line saying where it went.
- A banner under the top bar while the open organization is dropping some of its new events or isn't accepting any, with the share dropped and who can change it.
- Your theme choice is saved to your account, so it follows you to another browser; this browser's copy stays the fallback.
- `BASE_PATH` serves Faultline under a prefix such as `/faultline`, for a proxy that shares one host between apps. Give GlitchTip the same `BASE_PATH`.
- Usage, under Settings (the stock `/:org/settings/subscription` path): the errors, transactions, logs and uptime checks an organization took in over the last 30 days, a day at a time on one axis. Pick a day to see its figures, unfold errors or transactions to see which project sent them, and see the share of new events the organization and each project are set to drop, when they drop any.
- A "Skip to content" link as the first Tab stop on every signed-in page, and the page content in one `main` landmark with a heading.

### Changed

- Instance settings, your account, your organizations and the open organization refresh in the background while the tab is in view.
- A monitor's page lists every check, newest first, a page at a time, with an "Incidents only" switch for the checks where it went down or came back, and says what share of the last 24 hours or 14 days it was up, or of the time since its first check for a younger monitor.

### Fixed

- Issue page: the copied issue link and the "Copy for AI" event URL and instance include the path Faultline is served under.
- The projects list's 14-day error traces count every event; GlitchTip 7.0.0 counts only the first hour of each day when asked by the day, so they are summed from hours.
- Closing a dialog with Esc or its buttons puts focus back on the control that opened it, or on the menu button whose item did.
- `j` and `k` in the inbox move focus with the cursor, so a screen reader reads the row and Enter opens it, and the cursor follows focus, so Tab or a click picks the row that `e`, `x` and `o` act on.
- Menu buttons that show a value (organization, projects, environment, sort, time range) and the issue page's relative times are named with the words they show, so speech control can find them; key hints are no longer read out as part of a button's name.
- Esc on a merge or delete confirmation in the inbox closes only the dialog, and keeps the selection.
- The command palette tells a screen reader which command is current as the arrow keys move.
- The bottom message stays while the pointer or focus is on it, so its Undo can be reached, and goes its full time after both leave.
- The settings back link is a full 44px target on a phone.
- The environment filter lists only the environments of the chosen projects, and drops a choice they do not have.
- "Resolve in next release" works on 7.0.0, names the release the issue was tied to (or says none was found) with an Undo, and the issue's status shows that release; it used to be refused by the bulk route.
- The image tells browsers to check for a new page on every load, so a new release shows without a hard refresh, and a missing script file is a 404 instead of the page.

## [0.2.1] - 2026-11-14

Release rows that tell only what GlitchTip knows. Tested against GlitchTip 7.0.0.

### Fixed

- Releases no longer say "Not deployed": GlitchTip only knows of deploys a pipeline reports, so the list shows a deploy count only when there is one, and a release page says none were recorded.
- A release's time stays on one line, release names line up in locales with a long clock, and a release with no projects leaves no gap where they would be and no errors chart that never loads.

## [0.2.0] - 2026-11-14

Releases, uptime monitors, status pages and alert rules. Tested against GlitchTip 7.0.0.

### Added

- Uptime monitors: a list grouped by down, flapping, slow, up and waiting, with each monitor's downtime over 24 hours or 14 days and releases marked on it; a monitor page with its downtime and releases on one strip, downtime periods with the release before each, latest checks, response times, heartbeat address and the alert rules that cover it; new and edit in a dialog.
- Status pages: list them with the monitors on each and a link to copy; a server admin, who can add monitors to one, can also create one.
- Alert rules for every project on one page, with an editor for conditions, environments and recipients, and a test send; and a project's own rules as its Alerts tab, on the stock `?tab=alerts&alert=` address, so links in old emails open the right rule.
- Releases: a list grouped by day under the events chart, with new issues, deploys and commits per release; a release page with its projects' errors over two weeks, the issues it brought, deploys, commits and files, where someone allowed to manage releases can delete a file.

## [0.1.1] - 2026-11-14

Tested against GlitchTip 7.0.0.

### Fixed

- Release labels on the timelines no longer run into each other: releases too close to name apart share one label, and a commit hash shows its first seven characters.
- The top bar, organization switcher, palette and Projects page show the organization's name, which can be changed, instead of its slug; the switcher and palette add the slug when the two differ.

## [0.1.0] - 2026-11-14

The first release. Tested against GlitchTip 7.0.0.

### Added

- Sign-in with email and password, then a two-step check by authenticator code or recovery code; old GlitchTip links keep working because Faultline uses the same URLs.
- Issue inbox: new, spiking and ongoing issues on one 14-day timeline with release markers, search and filters, keyboard triage (`j`/`k`, `x`, `e`, `u`, `i`, `a`, `m`, `/`), and bulk resolve, ignore, assign, merge and delete.
- Issue page: the latest event with its stack trace, breadcrumbs, request, tags and context, older and newer events, comments, user reports, merged fingerprints, and the raw event.
- A command palette (`⌘K` / `Ctrl K`) for every action that applies, light and dark themes, and a phone layout with a bottom tab bar.
- One Docker image that serves the app and passes API, sign-in and ingest requests through to an unmodified GlitchTip on the same origin.
- Sign-up, with a closed-registration screen when the server allows none, and sign-in with a social provider, including the step that asks for an email when the provider shares none.
- Two-step sign-in with a security key, alongside the authenticator and recovery codes.
- Password reset: ask for a link, wait before sending another, and set a new password from the link, or learn it has expired.
- Organization invitations for people who are signed out or signed in, and a clear screen for a link that has expired or was used.
- A profile page: name and time zone, emails, password, linked accounts, alert emails, two-step setup (authenticator app, recovery codes, security keys), API tokens with their permissions in plain words, and deleting the account.
- Old GlitchTip links to the profile, API tokens, the command-line wizard and an organization's own sign-in page keep working.
- Projects home at `/` and `/:org/projects`: every project with its open issues, errors over the last 14 days, when it last broke and how many alerts it has.
- Organization settings on one searchable page, with sign-in apps (single sign-on through OpenID Connect or Google), members (invite, copy an invite link, send it again, change role and teams, remove, transfer ownership) and teams (create, rename, delete, join, leave, members, projects).
- Project settings: name, platform, teams with access, share of events to drop, client keys (new, copy, delete), environments, delete.
- New project with the SDK code for its platform, and a set-up step that shows when the first event arrives.
- Create an organization, and a system info page.
- Performance (`/:org/performance/transaction-groups`): transactions ranked by the time they take, with tabs for repeated queries, those slower this week (and the release they slowed down at) and failing ones. A transaction shows its all-time figures, a 7-day chart and where an average request spends its time; on a desktop it opens beside the list. Breakdowns, charts and repeated queries need GlitchTip's cold storage.
- Logs (`/:org/logs`): search, filters by level, service, environment, host and project with counts, a time window and logs per hour, a log's attributes, and the other logs in its trace.

[Unreleased]: https://github.com/snnbotchway/faultline/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/snnbotchway/faultline/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/snnbotchway/faultline/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/snnbotchway/faultline/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/snnbotchway/faultline/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/snnbotchway/faultline/releases/tag/v0.1.0
