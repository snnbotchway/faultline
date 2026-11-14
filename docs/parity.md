# Faultline parity checklist (stock GlitchTip 7.0.0 UI)

Source of truth: `glitchtip-frontend` tag **v7.0.0** (`f2d8ae6`, Angular 22 + Material, 2026-11-09), cross-checked with `glitchtip-backend` **v7.0.0** (`ff0d7bb`) and a live 7.0.0 instance. The served bundle matches the tag (`copy for AI`, `termsUpdate20261121Dismissed`, `glitchtip-sidenav-collapsed` all present).
Wire-level detail (auth, CSRF, search syntax, proxy paths) lives in [research/backend-integration.md](research/backend-integration.md).

Conventions
- `FE` = `src/app/` in the frontend repo. Route files: `FE/app.routes.ts` plus one `routes.ts` per feature folder.
- `{org}` = `:org-slug`. Endpoints are written `METHOD /path` relative to `/api/0` unless they start with `/_allauth` or `/api/settings`.
- `{org}` in the API means `organization_id_or_slug`. The stock UI sends the numeric org id (from `GET /organizations/`), and the backend accepts either.
- `scope:` marks the stock UI permission gate (`FE/api/organizations.service.ts`, org `access` array). Controls are hidden, not disabled, when the scope is missing.
- Status column: tick `[x]` when Faultline reaches parity for that row. `[+]` rows are backend-only features the stock UI never exposes (see the last section).
- `[-]` marks a row that does not apply to Faultline (reason given).

Totals: **44 routed screens** and **6 redirects** in the stock router, plus 5 screens that are tabs or dialogs with no route of their own (project tabs, alert editor, monitor tabs, team dialog, platform picker).

---

## 1. Auth & account (outside the logged-in shell)

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Auth | `/login` (`alreadyLoggedInGuard`) | Email + password form, social-app buttons, MFA step (TOTP / recovery code / WebAuthn) | `GET /api/settings/` (socialApps, enableUserRegistration); `/_allauth/browser/v1/auth/login`; `.../auth/2fa/authenticate`; `.../auth/webauthn/authenticate` (GET options, POST credential); `POST .../auth/provider/redirect` (form POST) | [x] |
| Auth | `/login/finalize` | Waits for `GET .../auth/session`, then follows `?next` or sends back to `/login`. Social login callback lands here | `GET /_allauth/browser/v1/auth/session` | [x] |
| Auth | `/register` (`alreadyLoggedInGuard`) | Email, password, confirm. Social register buttons. Shows "registration closed" copy. With `?next` goes there, else `/organizations/new` | `GET /api/settings/`; `POST /_allauth/browser/v1/auth/signup`; `POST .../auth/provider/redirect` | [x] |
| Auth | `/reset-password` | Request reset email | `POST /_allauth/browser/v1/auth/password/request` | [x] |
| Auth | `/reset-password/set-new-password/:key` | Set new password from emailed key. Allauth answers 401 on success (flow continues to login/MFA) | `POST /_allauth/browser/v1/auth/password/reset` | [x] |
| Auth | `/accept/:memberId/:token` | Org invite landing: shows org name, accept button if logged in, else register/login links carrying `next=/accept/:id/:token` | `GET /accept/{org_user_id}/{token}/` (anonymous); `POST /accept/{org_user_id}/{token}/` body `{acceptInvite:true}` | [x] |
| Auth | `/profile/confirm-email/:key` (inside shell, so needs login) | Posts the email-verification key, then goes to `/profile` | `POST /_allauth/browser/v1/auth/email/verify` | [x] |
| Auth | (none) session boot | `GET .../auth/session` on app start; 401 means logged out, 401 with `mfa_authenticate` flow means half-logged-in. `isAuthenticated` mirrored in `localStorage` to avoid a flash | `GET /_allauth/browser/v1/auth/session` | [x] |
| Auth | (none) logout | User menu "Log Out", then hard navigate to `/login` | `DELETE /_allauth/browser/v1/auth/session` | [x] |
| Auth | (none) global 401 handler | Any non-session 401/403 with `detail` "Unauthorized" or "Authentication credentials were not provided." clears auth and reloads `/` | n/a | [x] |
| Auth | (none) `?next` handling | After login/register: `/admin/` and `/oauth/authorize/` do a full page load, everything else is a router navigate. Must reject `//host` and `/\host` (open redirect) | n/a (`FE/server-routes.ts`) | [x] |

### Compat redirects (router level)

| Stock path | Redirects to | Faultline |
|---|---|---|
| `/:org/:project/issues/:id` | `/:org/issues/:id` | [x] |
| `/orgredirect/organizations/:org/settings/auth-tokens` | `/profile/auth-tokens` | [x] |
| `/account/settings/wizard/:hash` | `/profile/wizard/:hash` | [x] |
| `/:org/:project-slug` | `/:org/settings/projects/:project-slug` | [x] |
| `/:org/performance` | `/:org/performance/transaction-groups` | [x] |
| `**` | `/` | [x] |

---

## 2. Home, org switching, misc (logged-in shell)

Shell (`FE/logged-in.component.*`, `FE/main-nav/`): `loggedInGuard` redirects to `/login?next=<url>`.

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Home | `/` | All projects across orgs, one row each: 14-day error trend, unresolved count, last seen, alert count, links to issues and project settings. "New project" if `canWriteProject`. Empty state "No organization yet" | `GET /organizations/` (fetch-all, limit 200 x5 pages); `GET /organizations/{org}/stats_v2/` (`category=error&interval=1h&field=sum(quantity)&project&start&end`); `GET /organizations/{org}/issues/?project&query=is:unresolved&limit=1` (X-Hits = count); same with `sort=-last_seen&limit=1`; `GET /projects/{org}/{slug}/alerts/` | [x] |
| Org | `/organizations/new` | Create org (name, max 200). With billing on, goes to `/:slug/settings/subscription` | `POST /organizations/` | [x] |
| Misc | `/system-info` | Read-only: server time zone, org creation, registration, version, instance name (markdown), docs link. Stock bug: "Organization creation" row reads `enableUserRegistration` **Faultline:** the instance name is plain text and there is no docs link; it adds which features are on. | `GET /api/settings/` | [x] |
| Shell | side nav | Items: Issues, Uptime Monitors (feature `uptime`), Performance, Logs (feature `logs`), Projects, Releases. Org menu: General settings, Projects, Subscription, Teams, Members. Profile menu: Account, MFA, Notifications, Auth tokens. Org `<select>` with "create new". Collapse toggle (`localStorage glitchtip-sidenav-collapsed`). Mobile drawer + toolbar | `GET /api/settings/` (`enabledFeatures`); `GET /organizations/`; `GET /organizations/{org}/` | [x] |
| Shell | support menu | Docs, bug report, Liberapay link when unpaid + billing off, "Open Support Chat" when `iPaidForGlitchTip`, chatwoot widget when token set | `GET /instance-license/support-link/`; `GET /instance-license/` | [ ] Faultline: No support menu: no docs or bug-report links, no Liberapay link, no support chat. |
| Shell | banners | verify-email banner (primary email unverified, resend), terms banner (billing on only, `localStorage termsUpdate20261121Dismissed`), upgrade banner (throttled org), support banner | `GET /users/me/emails/`; `POST /users/me/emails/confirm/`; stripe overage endpoints | [ ] Faultline: No banners. Verify-email prompts exist only on the profile page (`src/features/account/profile-page.tsx:92`), none in the shell. The terms and upgrade banners need billing on. |
| Shell | over-limit snackbar | Opens once per session per org when `eventThrottleRate > 0`; dismissals kept in memory only | `GET /organizations/{org}/` | [ ] Faultline: No over-limit snackbar; `eventThrottleRate` is read only on the project page (`src/features/settings/project-page.tsx:186`). |
| Shell | theme | `userOptions.preferredTheme` (system/light/dark) with `localStorage theme` fallback; follows `prefers-color-scheme` | `PUT /users/me/` | [ ] Faultline: Theme is `localStorage theme` plus `prefers-color-scheme` (`src/lib/theme.ts`); `userOptions.preferredTheme` is never read or written, so the choice does not follow the user between browsers. |
| Shell | title | `document.title` per route; default "GlitchTip" | n/a | [x] |
| Shell | locales | en, fr, nb (`src/locale/*.xlf`) | n/a | [ ] Faultline: English only; no i18n layer, no fr or nb. |

---

## 3. Issues

All under `/:org/issues`. URL state: `query` (default `is:unresolved`), `sort` (default `-last_seen`), `project` (repeated), `environment`, `start`, `end`, `cursor`.

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Issues | `/:org/issues` | Issue list: select, bulk actions, search, sort, env filter, project multiselect, time range, 24h/14d trend toggle, cursor paging | `GET /organizations/{org}/issues/`; `GET /organizations/{org}/issues-stats/?groups&statsPeriod`; `GET /organizations/{org}/environments/` or `GET /projects/{org}/{slug}/environments/` (when exactly one project picked); `PUT`/`DELETE /organizations/{org}/issues/` | [x] |
| Issues | `/:org/issues/:issue-id` (default child, "Details") | Issue header (title, level, counts, first/last seen, first release, resolved-in), status dropdown, delete, latest event, tag facets sidebar | `GET /issues/{id}/`; `GET /issues/{id}/events/latest/`; `GET /issues/{id}/tags/`; `PUT /organizations/{org}/issues/{id}/`; `DELETE /issues/{id}/` | [x] |
| Issues | `/:org/issues/:issue-id/events/:event-id` | Specific event: same body as default, Older/Newer navigation, raw JSON link, copy for AI **Faultline:** the copy button and the one-time MCP hint are in the event header. | `GET /issues/{id}/events/{event_id}/` (carries `nextEventID` / `previousEventID`) | [x] |
| Issues | `/:org/issues/:issue-id/comments` | Comment list, add, edit, delete (author, manager or owner only since 7.0) | `GET`/`POST /issues/{id}/comments/` (body `{data:{text}}`); `PUT`/`DELETE /issues/{id}/comments/{cid}/` | [x] |
| Issues | `/:org/issues/:issue-id/merged` | Hash list for the issue, select hashes and unmerge (never all of them). Hidden when only one hash | `GET /organizations/{org}/issues/{id}/hashes/`; `DELETE .../hashes/?id=<hash>&id=...` (202) | [x] |
| Issues | `/:org/issues/:issue-id/user-reports` | Crash-report/feedback list (name, email, comments, linked event) with paging **Faultline:** a section of the issue page, every page fetched; each report's name line links to its event. | `GET /issues/{id}/user-reports/` | [x] |

Easy-to-miss inside Issues:

- [x] Search box with help popover: `is:` (unresolved, resolved, ignored), `level:` (fatal, error, warning, info, debug, sample), `key:value` tags, `has:key`, free text last, `*` prefix match. Tokens are AND only.
- [x] Default query `is:unresolved` is applied client-side when `query` is absent; submitting an empty string means "everything".
- [x] Event-id search: a UUID in the query returns `X-Sentry-Direct-Hit: 1` and the UI jumps straight to `/:org/issues/:id/events/:matchingEventId` (replaceUrl).
- [x] Sort options: Last Seen (`-last_seen`), First Seen (`first_seen`), Most Frequent (`-count`), Least Frequent (`count`), Highest Priority (`-priority`), Lowest Priority (`priority`). Sort control disabled when list is empty.
- [x] Time range select: none, last hour (`now-1h`), 24h (`now-1d`), 7d, 14d, 30d, custom (date + time pickers, sent as UTC ISO with `Z`). **Faultline:** the custom range is a dialog with two `datetime-local` fields in the viewer's time zone, sent as `start` and `end` in UTC with a `Z` (GlitchTip 7.0.0 filters on first seen).
- [x] Project multiselect (repeated `project=` ids); "add project" shortcut in the app bar. **Faultline:** the shortcut is a `+` beside the project filter, for users with `project:write`.
- [x] Environment select (single value, sent as `environment[]`); resets URL if the env is not valid for the newly chosen project. **Faultline:** the list is the shown environments of the chosen projects (`GET /projects/{org}/{slug}/environments/`), or the organization's when none is chosen; picking projects drops a choice none of them has.
- [x] Row checkbox with shift-click (or Shift X) range select; select-all-on-page; "Select all N issues that match this query" banner (switches bulk actions to query-based, no ids).
- [x] Bulk actions: Mark resolved, Mark unresolved, Mark ignored, Merge (needs 2+ rows, one project, not in all-results mode, confirm dialog), Delete (confirm dialog with count). Mobile uses a kebab menu.
- [x] Bulk update touches only the first 50 matches synchronously, the rest are queued server-side. List is patched in place (`status` only) rather than refetched.
- [-] Deleting everything on the current page resets the `cursor` so the user is not left on an empty page. **Faultline:** n/a, the inbox loads more pages as you scroll and keeps no `cursor` in the URL, so there is no empty page to be left on.
- [x] Trend sparkline per row, 24h hourly or 14d daily, plus event count, first/last seen ("seen X ago, N old"), CSP report label, `ignored`/`resolved` badges. **Faultline:** the Seen column shows the last seen and the age (`3d old`); a CSP report issue (`type: csp`) carries a `CSP report` tag, and a resolved or ignored issue carries its status in the "All" view.
- [x] Status dropdown on detail: Unresolved, Resolved, Ignored, plus "Resolve in next release" (`statusDetails.inNextRelease`); snackbar says which release it pinned or that none was found. **Faultline:** the notice reads the release from the issue's own `PUT` (`statusDetails.inRelease`); the bulk route refuses "next release" without a project and does not report it.
- [x] Issue not found and event not found empty states.
- [x] Tab badges: user report count, comment count.
- [x] Back link to the list keeps the issue's project filter (`?project=<id>`). **Faultline:** the link carries `project`, in the form the inbox writes for its own project filter.
- [x] Event header: event id, long date, "raw JSON" link, "copy for AI" (markdown payload with instance, org, issue, event URL and event JSON), one-time MCP hint when `enabledFeatures` has `mcp`. **Faultline:** "Copy for AI" copies the stock markdown payload; the hint shows once, under `localStorage mcpCopyHintSeen`, with a "Set up MCP" action. The dev backend has `mcp` off, so the hint is not covered by an end-to-end test.
- [x] Older / Newer event buttons, disabled at the ends.
- [x] Contexts summary (browser, OS, device, runtime, user) and full per-context tables.
- [x] Tag pills; each links to `/:org/issues?query=is:unresolved "key":"value"` (or `?environment=` for the `environment` tag); URL values get an external-link affordance. **Faultline:** a value that starts with `http://` or `https://` has an open-in-new-tab icon beside its row.
- [x] Exception entry: Full vs Raw toggle, "most recent call first/last" flip, per-frame expand with context lines and variables, mechanism data, in-app frame styling, syntax highlighting (Prism). **Faultline:** Full/Raw and Newest first/Oldest first toggles; raw is plain text in a Python or `at` layout; mechanism type, handled and function show under the exception; context lines are coloured by highlight.js, loaded when a frame opens, with the language taken from the file extension.
- [ ] Message entry, CSP violation entry, Request entry (method, URL, headers, query, cookies, body/data), Breadcrumbs entry (type, category, level, data, time). **Faultline:** Message (`issue-page.tsx:350`), Request without cookies (`issue-sections.tsx:111`) and Breadcrumbs (`Timeline`, `issue-sections.tsx:47`) exist. Missing: CSP violation entry, request cookies; a breadcrumb's level shows as colour only.
- [x] "Additional Data" (`event.context`), SDK name/version. (`packages`, `errors`, `_meta` are returned but not rendered by stock.) **Faultline:** an "Additional data" section beside the SDK, one row per key; nested values show as JSON.
- [x] Issue tag facets sidebar: top 10 values per tag with percent bars and "other"; a tag with one value renders flat. **Faultline:** the ten commonest values, an "other" bar for the rest, and a single-valued tag drawn without percent or bar. 7.0.0 returns every value in `topValues`, so the screen sorts and cuts them.
- [x] `shortId` (e.g. `MOBILE-2`) chip on the header and in the sidebar "Issue #" field.

Where Faultline differs on purpose:

- Comments, merged fingerprints and user reports are sections of the issue page; the stock tab paths redirect to it.
- An issue that was merged into another shows "Issue not found" at its old address; the backend keeps no pointer to the issue that survived.

---

## 4. Logs (feature flag `logs`)

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Logs | `/:org/logs` | Log table (level, timestamp, service, body), message search, multi-select level filter (trace, debug, info, warn, error, fatal), service filter, project + time range from app bar, "Load more" (accumulates pages, `limit=200`), clear filters | `GET /organizations/{org}/logs/?cursor&level&service&query&project&start&end&limit`; `GET /organizations/{org}/logs/resources/?resource_type=service` | [x] |

- [x] Empty states: "No logs yet" vs "No matching logs".
- [x] Initial hit count kept while paging (`X-Hits` from the first page).
- Faultline also filters by environment and host, counts each filter value, charts logs per hour (pick an hour to narrow the list), opens a log with its attributes, and lists the other logs in its trace or span. Backend limits: the search matches the message only, and counts above 1000 read `1000+` where the hourly statistics cannot answer (a text search, a host or a trace). The backend cannot filter by span, so a span's logs are picked from the first 1000 of its trace, and the screen says so when the trace has more.

---

## 5. Uptime monitors (feature flag `uptime`)

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Uptime | `/:org/uptime-monitors` | Monitor list: status dot, name, project, last change; sort (Down First `status`, Newest `-created`, Oldest `created`, Name `name`, Project `project`); cursor paging; "New monitor" if `canWriteProject` **Faultline:** no sort control: monitors are listed by name and grouped by health (down, flapping, slow, up, waiting), which puts what is down first; paged with "More monitors". | `GET /organizations/{org}/monitors/?sort&cursor` | [x] |
| Uptime | `/:org/uptime-monitors/new` | Create: name, type (Ping, GET, POST, TCP Port, Heartbeat; SSL exists in the API enum but is not offered), URL or `host:port`, project, environment, expected status, expected body, interval seconds, timeout 1-60 (hidden for Heartbeat), events-per-month estimate vs plan allowance **Faultline:** no events-per-month estimate; the plan allowance belongs to hosted billing. | `POST /organizations/{org}/monitors/`; `GET /projects/{org}/{slug}/environments/` | [x] |
| Uptime | `/:org/uptime-monitors/:monitor-id` (`?tab=overview` default, `checks`, `alerts`) | Detail: uptime %, avg response, last change, URL, response-time chart, heartbeat URL panel (Heartbeat type), checks table (status, reason, response time, "incidents only" filter, paging), alerts tab (project alerts that have `uptime` on, with count)  **Faultline:** one page instead of tabs: health and since when, a downtime strip with releases (24h or 14d), downtime periods with the release before each, the last 60 checks with response times, the heartbeat address and the alert rules that cover it. Missing: the full checks table with its paging and "incidents only" filter, and uptime %. | `GET /organizations/{org}/monitors/{id}/`; `GET .../monitors/{id}/checks/?cursor&is_change`; `GET /projects/{org}/{slug}/alerts/` | [ ] |
| Uptime | `/:org/uptime-monitors/:monitor-id/update` | Edit with the same form | `PUT /organizations/{org}/monitors/{id}/`; `DELETE` from the detail bar (confirm) | [x] |

- [x] Heartbeat check-in URL shown to the user is `heartbeatEndpoint` (backend route `POST /organizations/{slug}/heartbeat_check/{endpoint_id}/`).
- [x] `confirmationThreshold` exists in the API but is not in the stock form. Faultline offers it as "Down after" (1, 2, 3 or 5 failed checks; a value set elsewhere is kept).
- [x] Edit and delete gated on `canWriteProject`.

---

## 6. Projects & settings

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Projects | `/:org/projects` | Same project list component as Home, scoped to the active org | as Home | [x] |
| Projects | `/:org/settings/projects` | Same project-rows list as Home (trend, unresolved, alerts, settings link); "New project" if `canWriteProject`; empty state differs for writers vs non-writers **Faultline:** the projects are a group of the settings index, which this path opens. | `GET /organizations/{org}/projects/` (fetch-all); per-row stats as Home | [x] |
| Projects | `/:org/settings/projects/new` | Create: platform picker (grid, searchable), name (max 64), team select (opens "create team" dialog if none) **Faultline:** an organization with no team names its first one in the same form. | `POST /teams/{org}/{team_slug}/projects/`; `GET /organizations/{org}/teams/`; `POST /organizations/{org}/teams/` | [x] |
| Projects | `/:org/settings/projects/:project-slug` (`?tab=general` default, `dsn`, `environments`, `alerts`; `&alert=new` or `&alert=<id>`) | Project detail with four tabs, counts on tab labels **Faultline:** a Set up tab (`?tab=setup`) comes first. | `GET /projects/{org}/{slug}/`; `GET .../keys/?limit=200` | [x] |

General tab:
- [x] Rename (`PUT` `{name}`); needs `canWriteProject`. Server errors map onto the field.
- [x] Platform autocomplete (validates against the platform list, `PUT` `{name, platform}`).
- [x] "Your notifications" link to `/profile/notifications`.
- [x] Delete project (`canAdminProject`), confirms, then returns to the list.
- [x] Non-member admin note: "You can manage X as an organization admin". **Faultline:** a "Your access" row.

DSN tab:
- [x] Per key: DSN (`dsn.public`) with copy input, security/CSP report endpoint (`dsn.security`). Only list is used; key create/rename/rate-limit/delete are not in the stock UI.

Environments tab:
- [x] List with hidden toggle per environment (`PUT .../environments/{name}/` body is the environment object with `isHidden`); gated on `canWriteProject`. Empty state "No environments".

Alerts tab (see Alerts section).

---

## 7. Alerts (inside project detail, no route)

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Alerts | `/:org/settings/projects/:slug?tab=alerts` | Alert list: summary sentence, recipients with type icons, "New alert" | `GET /projects/{org}/{slug}/alerts/` **Faultline:** the same rows also make up `/:org/alerts`, every project's rules on one page. | [x] |
| Alerts | `...?tab=alerts&alert=new` / `&alert=<id>` | Editor: name, "an issue gets N events in M minutes" (quantity 0-10000, timespan), "uptime check fails" checkbox, environment multi-select (empty = all), recipients list, add/edit recipient dialog, save, delete (`canAdminProject`), test | `POST /projects/{org}/{slug}/alerts/`; `PUT .../alerts/{id}/`; `DELETE .../alerts/{id}/`; `POST .../alerts/{id}/test/` **Faultline:** a saved rule's project can't be changed, as the backend has no way to move one. | [x] |

- [x] At least one condition required: event frequency or uptime ("Select at least one condition").
- [x] Recipient types: Email, General (slack-compatible) Webhook, Discord, Google Chat, ntfy, Microsoft Teams, Zulip (bot email, API key, channel, topic default "GlitchTip Alerts"), Feishu (Lark). Email option hidden when an email recipient already exists. Default new alert starts with an email recipient.
- [x] URLs get `https://` prepended when no scheme.
- [x] "Send test" per recipient (hidden if `!canTest`). **Faultline:** one "Send test" on a saved rule sends to each of its saved recipients except email, which the backend never tests, and names any that couldn't be reached.
- [x] Alerts are gated on `canWriteProject`; tests, create, update need admin since 7.0 (backend enforces).

---

## 8. Organisation, teams, members

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Org | `/:org/settings` | General: project/team counts, rename (`canWriteOrg`), delete org (`canAdminOrg`, owner only) | `PUT /organizations/{org}/` `{name}`; `DELETE /organizations/{org}/` | [x] |
| Teams | `/:org/settings/teams` | "Your teams" and "Other teams"; join/leave (join needs `openMembership` or `canWriteOrg`), create team dialog (slug, `gtSlugify` blocks bad keys and paste, pattern `^[-a-zA-Z0-9_]+$`, max 50) | `GET /organizations/{org}/teams/`; `POST /organizations/{org}/teams/`; `POST`/`DELETE /organizations/{org}/members/{member_id}/teams/{team_slug}/` | [x] |
| Teams | `/:org/settings/teams/:team-slug/members` | Add member (select), member list with remove/leave, links to member detail | `GET /teams/{org}/{team}/members/`; `GET /organizations/{org}/members/`; `POST`/`DELETE .../members/{id}/teams/{team}/` | [x] |
| Teams | `/:org/settings/teams/:team-slug/projects` | Add project to team, list with remove | `GET /teams/{org}/{team}/` ; `POST`/`DELETE /projects/{org}/{project}/teams/{team}/` | [x] |
| Teams | `/:org/settings/teams/:team-slug/settings` | Rename slug (`canWriteTeam`), delete team (`canAdminTeam`) | `PUT`/`DELETE /teams/{org}/{team}/` | [x] |
| Members | `/:org/settings/members` | Member list: email link, pending tag, Account owner tag, role, resend invite (pending), remove or leave, role badge notes for owners | `GET /organizations/{org}/members/`; `POST /organizations/{org}/members/` (`reinvite:true` to resend); `DELETE .../members/{id}/` | [x] |
| Members | `/:org/settings/members/new` | Invite by email (comma-separated list), role radio with description, team multi-select; "Only existing users" hint when registration is closed | `POST /organizations/{org}/members/` per email, body `{email, orgRole, teamRoles:[{teamSlug, role}], sendInvite, reinvite}` | [x] |
| Members | `/:org/settings/members/:member-id` | Role radios (Member, Admin, Manager, Owner; owner changes owner-only), team list with links, transfer ownership (confirm) | `GET`/`PUT /organizations/{org}/members/{id}/` body `{orgRole, teamRoles}`; `POST .../members/{id}/set_owner/` | [x] |

Easy to miss:
- [x] Permission gates are scope based, from `GET /organizations/{org}/` `access[]`: `project:write|admin`, `team:write|admin`, `org:write|admin`, `member:write|admin`. Gates fail closed while the active org is still the first-org fallback.
- [x] Role names/descriptions: Owner (full), Manager (members and every team), Admin (teams and projects they are on), Member (issues and events).
- [x] Managers cannot grant, change or remove owners (7.0 breaking change).
- [x] Invite throttling is server-side (`Throttled`); UI shows the error.
- [x] `inviteLink` is returned on invite but not shown by the stock UI (see "Beyond parity").

---

## 9. Releases

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Releases | `/:org/releases` | Release table with two columns, Version (link, tooltip when truncated) and Date Created; cursor paging | `GET /organizations/{org}/releases/?cursor` | [x] |
| Releases | `/:org/releases/:version` | Release detail: header with project chips, file count (plural), `dateReleased`; single-column files table (Filename, read-only), paging; per-request error list | `GET /organizations/{org}/releases/{version}/`; `GET .../releases/{version}/files/?cursor` | [x] |

- [x] Version path segment must be URL-encoded (versions can contain `/`, `@`). A version with `/` can't be opened at all (the backend answers 404 for it); its page says so.
- [-] Project chip strips the `slug@` prefix when the version already starts with it. **Faultline:** n/a, releases show version and project slugs as separate text (`src/features/releases/release-page.tsx:91`, `release-list.tsx:117`), so there is no combined chip to strip.
- [-] Stock UI is read-only: no create release, deploys, commits, file delete or source-map upload (CLI/API only). **Faultline:** n/a, a statement about the stock UI, not a feature to match; Faultline already adds file delete (`src/api/releases.ts:199`).
- Note: the events-per-day chart adds up the backend's hourly buckets, which start on the UTC hour, into the viewer's days. In a time zone with a half-hour offset (India, parts of Australia) each day's first or last half hour lands in the neighbouring day. Left as is.

---

## 10. Performance (transactions)

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Perf | `/:org/performance/transaction-groups` | Transaction group list: columns Title (method, transaction, op) with project + transaction count, and Average Duration; env filter, sort (Slowest `-avg_duration`, Fastest, Most Frequent `-count`, Least Frequent), search `query`, project/time range, paging | `GET /organizations/{org}/transaction-groups/?cursor&query&start&end&sort&project&environment`; `GET /organizations/{org}/environments/` | [x] |
| Perf | `/:org/performance/transaction-groups/:id` | Group header (count, avg, p95, op chip), span breakdown table (sortable columns, op filter); "not found" state | `GET /organizations/{org}/transaction-groups/{id}/`; `GET .../transaction-groups/{id}/spans/` | [x] |

- [-] Environment filter and time range. Not built: GlitchTip 7.0.0 accepts `environment`, `start` and `end` on the list and ignores them, so every figure covers all environments and all time. **Faultline:** n/a, GlitchTip 7.0.0 ignores `environment`, `start` and `end` on this list, so there is nothing to build; the row itself says "Not built".
- Faultline adds the time spent per transaction, tabs for repeated queries (`/n-plus-one/`), transactions slower this week (`/trend/`, with the release they slowed down at) and failing ones, the 7-day duration chart, and the transaction beside the list on a desktop. The stock `sort` parameter is read as Faultline's `order`, so old links keep their order.
- "Slower this week" checks the 100 transactions that took the most time in all, one trend request each. It compares time in spans per request, and the backend's trend has no count per span group: a day on which requests start running a new query counts more requests than ran, so a regression that adds a query reads smaller than it is.
- Transactions that share a name (in two projects, or with two methods) share one trend, span breakdown and set of repeated queries, because the backend keys those by name alone. Faultline does not flag such a transaction as slower or link repeated queries to it, and its breakdown says it includes the others.
- Backend limits: the list's figures are all-time and its percentiles approximate. Breakdowns, trends and repeated queries cover the last 7 days and need cold storage (`GLITCHTIP_ENABLE_DUCKDB` and a storage directory or bucket); without it they are empty and the screens say so. GlitchTip keeps no individual transactions, so there is no waterfall: a breakdown is the average request's time per span group, in no order.

---

## 11. Profile & user settings (`/profile`)

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Profile | `/profile` (Account) | Name, time zone (autocomplete validated), theme (System/Light/Dark); change/set password; manage emails; connect/disconnect social accounts; delete account | `PUT /users/me/` `{name, options}`; `POST /_allauth/browser/v1/account/password/change`; `/users/{id}/emails/`; `/_allauth/browser/v1/account/providers`; `DELETE /users/me/` | [x] |
| Profile | `/profile/multi-factor-auth` | TOTP setup wizard (QR/secret, recovery codes preview, confirm code), turn off TOTP, regenerate recovery codes, WebAuthn keys (add with name, remove) | `GET /_allauth/browser/v1/account/authenticators`; `.../authenticators/totp` (GET 404 carries secret, POST code, DELETE); `.../authenticators/recovery-codes` (POST regenerates); `.../authenticators/webauthn` (GET creation options, POST, DELETE body `{authenticators:[id]}`); `GET`/`POST /generate-recovery-codes/` | [x] |
| Profile | `/profile/notifications` | Default "Project alerts" On/Off; per-project tri-state (Default / On / Off) grouped by org | `GET`/`PUT /users/me/notifications/`; `GET`/`PUT /users/me/notifications/alerts/` (body `{<projectId>: -1|0|1}`, 204); `GET /projects/` | [x] |
| Profile | `/profile/auth-tokens` | Token list: label, scope summary, token value in a copy-input (always visible, not one-time), delete; "New token" | `GET /api-tokens/`; `DELETE /api-tokens/{id}/` | [x] |
| Profile | `/profile/auth-tokens/new` | Label + scope checkboxes grouped by project/team/event/org/member with read/write/admin levels; shows 422 field errors | `POST /api-tokens/` | [x] |
| Profile | `/profile/wizard/:hash` | CLI login: posts the hash so `@sentry/wizard` gets a token; shows success/failure text | `POST /wizard-set-token/` `{hash}` | [x] |

Account page details:
- [x] Email list: Primary tag, Unverified pill, resend confirmation, make primary, remove; add email with duplicate check. Uses GlitchTip's own email API, not allauth's `/account/email`.
- [x] Social: "Connect an account" select (only when `socialApps` exist), connected accounts list with Disconnect (blocked when it would leave no login method), shows provider name.
- [x] Password: "Set password" variant when `hasPasswordAuth` is false (no current-password field). Min 8, confirm field.
- [x] Delete account: 400 means the user still owns an org; paid-subscription owners are blocked.
- [-] Preferences schema also has `stacktraceOrder`, `clock24Hours`, `language` but the stock UI never edits them (stack order toggle is per-view local state). **Faultline:** n/a, the stock UI never edits these preferences, so there is no behaviour to match.
- [x] MFA: first-time TOTP enrolment needs the user to type one of the preview recovery codes to confirm they saved them; `POST /generate-recovery-codes/` returns 204 on success and the stock UI treats any non-200 as success.
- [x] MFA: WebAuthn uses `@github/webauthn-json` (base64url JSON <-> ArrayBuffer). Passkey-only login (`mfa_login_webauthn` flow, `auth/webauthn/login`) is advertised by the backend but not used by the stock login page.
- [x] Recovery codes list shown once with copy and "I copied them" gate.

Where Faultline differs on purpose:

- New passwords have a Show toggle instead of a confirm field.
- An API token is shown in full once, when it is made; the list shows its first characters.
- Two-step setup asks for every unverified email to be verified or removed first, because the backend refuses it otherwise.

---

## 12. Billing / subscription (`/:org/settings/subscription`)

Hosted-only (Stripe). The page switches on `settings.billingEnabled`; a self-hosted install sees only the "self-hosted" variant.

| Area | Stock route | What it does | API endpoints | Faultline |
|---|---|---|---|---|
| Billing | `/:org/settings/subscription` (self-hosted variant, billing off) | Usage last 30 days (events by category), sponsor/support cards (Liberapay, GitLab, "Try Cloud"), billing email link when `iPaidForGlitchTip`, manage billing button | `GET /stripe/subscriptions/{org}/events_count/period/`; `GET /instance-license/`; `POST /stripe/organizations/{org}/create-billing-portal/` | [ ] Faultline: No subscription page and no "Subscription" entry in the org menu (`src/components/shell/app-shell.tsx:38`); nothing calls `/stripe/subscriptions/` or `/instance-license/`. The doc decided to build this variant. |
| Billing | same route (hosted variant, billing on) | Plans/checkout (`payment`), subscription status (trialing, past_due, canceled), daily + period usage charts, overage card (spend cap, enable/disable), "from Stripe" refresh polling, billing portal | `GET /stripe/products/`; `GET /stripe/subscriptions/{org}/`; `POST /stripe/subscriptions/`; `POST /stripe/organizations/{org}/create-stripe-subscription-checkout/`; `GET .../events_count/period/` and `/daily/`; `GET`/`POST` overage; `POST .../create-billing-portal/` | [-] n/a: hosted Stripe variant; the doc says it is out of scope unless asked, and billing is off on self-hosted installs. |

Decision for Faultline: implement the self-hosted variant (usage + links); hosted/Stripe variant is out of scope unless the user asks.

---

## 13. Wizard / CLI login

Covered by `/profile/wizard/:hash` and the `/account/settings/wizard/:hash` redirect above. Backend also has `GET /wizard/`, `GET`/`DELETE /wizard/{hash}/` used by the CLI, not the SPA.

---

## 14. Cross-cutting behaviour to match

- [x] Same-origin deployment with the proxy paths in `research/backend-integration.md` section 4.
- [x] CSRF: send `X-CSRFToken` (from the `csrftoken` cookie) on every POST, PUT, PATCH, DELETE. Re-read it each request (login rotates it).
- [x] Pagination: `Link` header (rel next/previous, `results="true|false"`, `cursor="..."`), `X-Hits`, `X-Max-Hits`. Page size 50 default, hard max 100 (stock asks 200 and silently gets 100).
- [x] Error shapes: 422 `{detail:[{type,loc,msg,ctx}]}`; 400/403/404 `{detail:"..."}`; allauth `{status, errors:[{message,code,param}]}`. Form fields map `param` to inputs.
- [x] Fetch-all lists (orgs, org projects) follow cursors up to 5 pages x limit.
- [ ] `localStorage` keys worth keeping compatible: `isAuthenticated`, `theme`, `glitchtip-sidenav-collapsed`, `termsUpdate20261121Dismissed`, `mcpCopyHintSeen`, `glitchtip-support-chat-opened`. **Faultline:** Only `theme` is shared (`src/lib/theme.ts`). Session state comes from the session query, not `isAuthenticated`; the side-nav, terms, MCP hint and support-chat keys are unused because those features are not built.
- [ ] Background refresh: `/api/settings/` once after 5 s then every 30 min; `/users/me/` once after 10 s; orgs and active org once after 30 s. **Faultline:** No timed refresh: `/api/settings/` and the session use `staleTime: Infinity` (`src/api/organizations.ts:54`, `src/api/auth.ts:52`); only monitors poll (`src/api/monitors.ts:68`).
- [-] Optional integrations driven by settings: Plausible page-view pings (`window.plausible`), chatwoot (`chatwootWebsiteToken`), frontend self-error-reporting to `sentryDSN`. Decide per feature; none are required. **Faultline:** n/a, the row itself says "Decide per feature; none are required".
- [ ] `<base href>` / `BASE_PATH` sub-path deployment (stock SPA derives the API base URL from `<base>`). **Faultline:** No `<base href>` or BASE_PATH support: `baseUrl: '/'` (`src/api/client.ts:96`), and Vite and Caddy serve from the root.
- [ ] Permission gating by scope, never inline role checks. **Faultline:** Gates use scopes (`src/api/organizations.ts:31`, `src/features/settings/access.ts:15`) but some use roles: `src/features/settings/teams.tsx:35`, `members.tsx:84,95,169`.
- [ ] Accessibility: stock uses Material components; Faultline must match keyboard and screen-reader behaviour of lists, menus, dialogs and tabs. **Faultline:** Built on Radix and shadcn primitives, but no keyboard or screen-reader checks or tests (`e2e/` has no a11y coverage); parity is not verified.
- [-] Keyboard shortcuts: **none** exist in the stock UI (only the team-slug field blocks bad keystrokes). Not part of parity; Kudcrafts adds `j/k/e` as an extra. **Faultline:** n/a, the row itself says it is not part of parity; Faultline adds its own shortcuts (`src/lib/hotkeys.ts`).

---

## 15. Beyond parity: backend features the stock UI never exposes

These are not required for parity. Tick only if Faultline chooses to ship them.

| Feature | Backend | Notes | Faultline |
|---|---|---|---|
| Org login page `/login/{org-slug}` | `GET /api/settings/{organization_slug}/` returns that org's social apps (including non-public ones). SPA regex in `glitchtip/urls.py` already serves `/login/...` | Backend-generated `loginUrl` for org SSO apps points here; stock router falls through to `**` and redirects to `/` | [x] |
| Org SSO / social-app management | `GET`/`POST /organizations/{org}/social-apps/`; `PUT`/`DELETE .../social-apps/{id}/` (name, serverUrl, clientID, clientSecret, provider; returns `callbackUrl` and `loginUrl`) | Gated by `organization_can_customize_sso`; listing needs manager or owner **Faultline:** a Sign-in apps group on the settings index, for managers and owners. | [x] |
| Status pages | `GET`/`POST /organizations/{org}/status-pages/`; public HTML at `/status-pages/{org}/{slug}/` | List and create only; no update/delete route in the schema. HTML is server-rendered and cached 60 s **Faultline:** listed at `/:org/uptime-monitors/status-pages`, an address of its own beside the monitors. | [x] |
| Copy-link invites | `inviteLink` in the invite response | Works with email disabled (`enabledFeatures` lacks `email`). Stock frontend ignores it | [x] |
| Short-ID jump | `GET /organizations/{org}/issues/?shortIdLookup=1&query=PROJECT-1A`; `GET .../shortids/{short_id}/` | Stock UI does not send `shortIdLookup` | [+] |
| Assign issue | `PUT` with `assignedTo` (`user:<id>`, `team:<slug>`, email, or empty) | Field is rendered nowhere in stock | [+] |
| DSN key management | `POST /projects/{org}/{slug}/keys/`; `GET`/`PUT`/`DELETE .../keys/{id}/` (name, rate limit) | Stock lists keys only. In 7.0.0 `PUT` changes nothing and rate limits are stored but not enforced **Faultline:** create with a name, and delete; no editing and no rate limit | [x] |
| Project rate limit / `eventThrottleRate`, org `isAcceptingEvents`, `require2fa`, `openMembership` | org and project `PUT` | Not editable in stock UI (read for the over-limit snackbar and team-join rule only) **Faultline:** the project rate is editable; the organization fields are not, the backend ignores them on `PUT`. | [+] |
| Release create/deploys/commits/files delete, source-map upload | `/organizations/{org}/releases/...`, `/chunk-upload/`, `/artifactbundle/assemble/`, difs, dsyms | CLI-oriented | [+] |
| Passkey login, reauthentication, email-code login | allauth `webauthn/login`, `auth/reauthenticate`, `code/confirm` | `reauthenticate` exists in the stock service but nothing calls it | [+] |
| Issue commits, project events list, log detail/stats, span groups, N+1, transaction trend | `GET /issues/{id}/commits/`, `/projects/{org}/{slug}/events/`, `/logs/{id}/`, `/logs/stats/`, `/span-groups/`, `/n-plus-one/`, `/transaction-groups/{id}/trend/` | No stock UI | [+] |
| Importer | `POST /import/` | No stock UI | [+] |
| Event raw JSON | `GET /organizations/{org}/issues/{id}/events/{eid}/json/` | Stock links to it through the legacy `/organizations/...` redirect | [+] |

## 16. Stock quirks we should not copy

- System-info "Organization creation" reads `enableUserRegistration` (wrong flag).
- `canCreateOrg` is `enableOrganizationCreation || user || orgCount`, so the create-org UI is always shown; the backend (`is_organization_creation_open`) also allows it when no org exists or the user is a superuser. Faultline should gate on `enableOrganizationCreation || orgs.length === 0 || user.isSuperuser`.
- `PAGE_LIMIT = 200` but the server caps at 100; fetch-all therefore needs up to 5 pages of 100 (500 rows max) and silently truncates beyond that.
- Recovery-code confirm treats every non-200 as success (the endpoint returns 204 and 400 on a bad code).
- Link-header parsing relies on a loose regex because the backend wraps the header in `{'...'}` (see integration doc).
- API token form sends `scopes` as an array of names although the OpenAPI schema says `integer`.
