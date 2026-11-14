# Changelog

All notable changes to Faultline are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

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
- A banner under the top bar while the open organization is dropping some of its new events, with the share dropped and who can change it.
- Your theme choice is saved to your account, so it follows you to another browser; this browser's copy stays the fallback.
- `BASE_PATH` serves Faultline under a prefix such as `/faultline`, for a proxy that shares one host between apps. Give GlitchTip the same `BASE_PATH`.

### Changed

- Instance settings, your account, your organizations and the open organization refresh in the background while the tab is in view.
- A monitor's page lists every check, newest first, a page at a time, with an "Incidents only" switch for the checks where it went down or came back, and says what share of the last 24 hours or 14 days it was up, or of the time since its first check for a younger monitor.

### Fixed

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

[Unreleased]: https://github.com/snnbotchway/faultline/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/snnbotchway/faultline/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/snnbotchway/faultline/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/snnbotchway/faultline/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/snnbotchway/faultline/releases/tag/v0.1.0
