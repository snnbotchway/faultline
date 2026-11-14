# Changelog

All notable changes to Faultline are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

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
- Uptime monitors: a list grouped by down, flapping, slow, up and waiting, with each monitor's downtime over 24 hours or 14 days and releases marked on it; a monitor page with downtime periods, latest checks, response times, heartbeat address and the alert rules that cover it; new and edit in a dialog.
- Status pages: list them with the monitors on each, and create one.
- Alert rules for every project on one page, with an editor for conditions, environments and recipients, and a test send.
- Releases: a list grouped by day under the events chart, with new issues, deploys and commits per release; a release page with the issues it brought, deploys, commits and files.

[Unreleased]: https://github.com/snnbotchway/faultline/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/snnbotchway/faultline/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/snnbotchway/faultline/releases/tag/v0.1.0
