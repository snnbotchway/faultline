# Changelog

All notable changes to Faultline are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Sign-up, with a closed-registration screen when the server allows none, and sign-in with a social provider, including the step that asks for an email when the provider shares none.
- Two-step sign-in with a security key, alongside the authenticator and recovery codes.
- Password reset: ask for a link, wait before sending another, and set a new password from the link, or learn it has expired.
- Organization invitations for people who are signed out or signed in, and a clear screen for a link that has expired or was used.
- A profile page: name and time zone, emails, password, linked accounts, alert emails, two-step setup (authenticator app, recovery codes, security keys), API tokens with their permissions in plain words, and deleting the account.
- Old GlitchTip links to the profile, API tokens, the command-line wizard and an organization's own sign-in page keep working.
- Projects home at `/` and `/:org/projects`: every project with its open issues, errors over the last 14 days, when it last broke and how many alerts it has.
- Organization settings on one searchable page, with sign-in apps (single sign-on through OpenID Connect or Google), members (invite, copy an invite link, send it again, change role and teams, remove, transfer ownership) and teams (create, rename, delete, join, leave, members, projects).
- Project settings: name, platform, teams with access, share of events to drop, client keys with rate limits, environments, delete.
- New project with the SDK code for its platform, and a set-up step that shows when the first event arrives.
- Create an organization, and a system info page.

### Changed

- Forms check themselves and say what is wrong under the field, in Faultline's words, instead of the server's.
- `/` opens the projects home instead of going to the last organization's issues.
- The organization menu leads to its projects, members, teams and settings.
