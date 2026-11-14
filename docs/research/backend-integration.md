# GlitchTip 7.0.0: backend integration reference for Faultline

Verified against a live 7.0.0 instance (the dev backend in `dev/compose.yml`, seeded demo user) and source:

| Tag | Repo | Commit | Notes |
|---|---|---|---|
| `FE` | `gitlab.com/glitchtip/glitchtip-frontend` `v7.0.0` | `f2d8ae690eeda6ccc7aed84e68b38938e47d57c1` (2026-11-09) | Served bundle matches this tag. `master` was already 4 days ahead (`7f733a2`); not used. |
| `BE` | `gitlab.com/glitchtip/glitchtip-backend` `v7.0.0` | `ff0d7bb2f6fb312305ee23792b14d0f3d751956b` (2026-11-09) | `django-ninja 1.7.1`, `django-allauth-async 65.19.1.1` (wraps allauth 65.x), Django 6.1.1 |

Citations are repo-relative: `FE src/app/...` and `BE glitchtip/...`. "Live" means I ran it with curl against 7.0.0.
Machine-readable specs: `GET /api/openapi.json` (REST, `ENABLE_OPENAPI`), `GET /_allauth/openapi.json` (allauth headless, `HEADLESS_SERVE_SPECIFICATION=True`, `BE glitchtip/settings.py:1484`). The FE generates types from both (`FE package.json` scripts `openapi-typescript`, `openapi-typescript-allauth`).

---

## 1. Auth flow

### 1.1 Transport rules

| Item | Value | Source |
|---|---|---|
| Auth backend | allauth **headless**, `HEADLESS_ONLY=True`, `HEADLESS_CLIENTS=("browser",)`, email login only, `ACCOUNT_SIGNUP_FIELDS=email,password` | `BE glitchtip/settings.py:1463-1491` |
| Base path | `/_allauth/browser/v1` (`allauthBase`) | `FE src/app/constants.ts:4` |
| Session cookie | `sessionid`, HttpOnly, SameSite=Lax, Path=/, Max-Age 1209600 (14 d, `SESSION_COOKIE_AGE`), `Secure` iff `GLITCHTIP_URL` is https | live; `BE settings.py:878-881,1259` |
| CSRF cookie | `csrftoken`, **not** HttpOnly, SameSite=Lax, Max-Age 31449600 | live |
| CSRF header | `X-CSRFToken: <cookie value>` on every POST/PUT/PATCH/DELETE (also for `/api/0/*` session auth; missing header gives `403 {"detail":"CSRF check Failed"}`; allauth gives bare 403) | `FE src/app/shared/api/api.ts:18-25`; live |
| CSRF form field | `csrfmiddlewaretoken` for the one native form POST (`provider/redirect`) | `FE src/app/api/allauth/authentication.service.ts:15-29,97-105` |
| Who sets the cookie | `GET /_allauth/browser/v1/auth/session` (and `/config`) emit `Set-Cookie: csrftoken`. `GET /` (the SPA shell) does **not** | live |
| Rotation | Login re-issues `csrftoken` (new value in the login response). Read the cookie fresh on every request, do not cache | live |
| Bearer tokens | `Authorization: Bearer <api token>` bypasses CSRF and sessions (`TokenAuth` before `SessionAuth`). Not used by the SPA | `BE glitchtip/api/api.py:50-54`, `glitchtip/api/authentication.py` |
| Origin check | Django CSRF compares `Origin`/`Referer` with the request host and `CSRF_TRUSTED_ORIGINS`. Same-origin proxying with `Host` preserved needs nothing. If the proxy rewrites `Host`, also rewrite `Origin` and `Referer` (Kudcrafts does this) | `BE settings.py:826`; Kudcrafts `vite.config.ts`, `deploy/default.conf.template` |
| Proxy headers | `X-Forwarded-Proto` is honoured from any peer; `X-Forwarded-For` only from `TRUSTED_PROXIES` (default `private`). Login/signup/reset rate limits are keyed on the client IP, so forward the real one | `BE glitchtip/proxy_headers.py:7-11`; CHANGELOG 7.0.0 |

All allauth responses are `{"status": <http>, "data": {...}, "meta": {...}}` or `{"status": 400, "errors":[{"message","code","param"}]}`.
Logged-in test: **HTTP status of `GET /auth/session`**: 200 means authenticated, 401 means not. `meta.is_authenticated` is the same bit.

### 1.2 Endpoints the stock SPA calls

| Purpose | Method + path (under `/_allauth/browser/v1`) | Body | Result | FE source |
|---|---|---|---|---|
| Boot check | `GET /auth/session` | none | 200 `{data:{user:{id,display,email,has_usable_password},methods:[...]},meta:{is_authenticated:true}}`; 401 `{data:{flows:[{id:"login"},{id:"signup"},{id:"mfa_login_webauthn"}]},meta:{is_authenticated:false}}`. A half-logged-in session (password OK, MFA pending) is a 401 whose `flows` has `{id:"mfa_authenticate", types:[...]}` | `auth.service.ts:30-55` |
| Login | `POST /auth/login` | `{email,password}` | 200 authenticated; 401 + `flows` containing `mfa_authenticate` means ask for MFA; 400 `{errors:[{code:"email_password_mismatch",param:"password",...}]}` | `login.service.ts:80-103` |
| MFA code | `POST /auth/2fa/authenticate` | `{code}` (TOTP **or** recovery code, same field) | 200 authenticated; 400 errors | `authentication.service.ts:50` |
| MFA WebAuthn | `GET /auth/webauthn/authenticate` then `POST /auth/webauthn/authenticate` | GET returns `data.request_options`; POST `{credential}` | 200 authenticated | `auth.service.ts:77-92` |
| Signup | `POST /auth/signup` | `{email,password}` | 200 authenticated (verification is `optional`, or `none` when email is off, `BE settings.py:1471`); 400 field errors; 403 if registration closed | `register.service.ts` |
| Logout | `DELETE /auth/session` | none | 401 on success (session now anonymous). Stock then does `window.location.href="/login"` | `auth.service.ts:109-121` |
| Reset request | `POST /auth/password/request` | `{email}` | 200 `{"status":200}` (live: also 200 for an unknown address; 400 `invalid` for a malformed one). With email off nothing is sent but the response is unchanged (`BE glitchtip/adapters.py:73-85`) | `reset-password.service.ts:44` |
| Reset confirm | `POST /auth/password/reset` | `{key,password}` | **401 means success** (flow continues to login/MFA). 400 means bad key or password | `set-new-password-state.ts:29-52` |
| Verify email | `POST /auth/email/verify` | `{key}` | 200; stock then navigates to `/profile`. `GET` with header `X-Email-Verification-Key` returns the pending address (defined, unused) | `confirm-email.component.ts:22` |
| Social login | `POST /auth/provider/redirect` as an **HTML form** (`application/x-www-form-urlencoded`) with fields `provider`, `process` (`login` or `connect`), `callback_url`, `csrfmiddlewaretoken` | browser follows 302 to the IdP | Success: back to `callback_url` (stock uses `/login/finalize?next=...`). Failure: 302 to `/login?socialLoginError=true&error=...&error_process=login` (live, with a bogus provider) | `authentication.service.ts:94-105`; `login.service.ts:111-125`; `BE settings.py:1476-1482` |
| Change password | `POST /account/password/change` | `{current_password,new_password}`; omit `current_password` when `has_usable_password=false` | 200; 400 field errors | `password.service.ts:47` |
| Linked accounts | `DELETE /account/providers` | `{provider,account}` | 200 | `social-auth.service.ts:48` |
| List authenticators | `GET /account/authenticators` | | `data:[{type:"totp"\|"webauthn"\|"recovery_codes",...}]` (live: `[]`) | `multi-factor-auth.service.ts:70` |
| TOTP | `GET /account/authenticators/totp` | | **404** with `meta:{secret,totp_url}` when not enrolled (live). `POST {code}` enrols, `DELETE` removes | `multi-factor-auth.service.ts:160-197` |
| Recovery codes | `POST /account/authenticators/recovery-codes` | none | regenerate; codes in `data.unused_codes`. `GET` is 404 until set (live) | `multi-factor-auth.service.ts:141` |
| WebAuthn keys | `GET /account/authenticators/webauthn` (creation options in `data.creation_options`), `POST {name,credential}`, `DELETE {authenticators:[id]}` | | | `multi-factor-auth.service.ts:232-279` |

Endpoints that exist and the stock SPA never calls (all in `/_allauth/openapi.json`): `GET /config`, `POST /auth/reauthenticate`, `POST /auth/2fa/reauthenticate`, `auth/webauthn/reauthenticate`, `auth/webauthn/login` (passkey login), `auth/provider/token`, `auth/provider/signup` (GET/POST, needed when an IdP returns no email: flow id `provider_signup`), `auth/email/verify/resend`, `account/email` (allauth's own; stock uses GlitchTip's `/api/0/users/{id}/emails/` instead), `account/phone`, `auth/code/confirm`.
Reauth is effectively off (`ACCOUNT_REAUTHENTICATION_TIMEOUT = SESSION_COOKIE_AGE`, `BE settings.py:1472`).

`GET /config` (live): `{account:{login_methods:["email"],is_open_for_signup:true,email_verification_by_code_enabled:false,...},socialaccount:{providers:[]},mfa:{supported_types:["totp","webauthn","recovery_codes"],passkey_login_enabled:true}}`.

### 1.3 Extra GlitchTip endpoints around MFA

| Method + path | Behaviour | Source |
|---|---|---|
| `GET /api/0/generate-recovery-codes/` | Generates a seed, caches it per user, returns `{codes:[8-digit strings x10]}` **without saving** | `BE apps/users/api.py:258-267`; live |
| `POST /api/0/generate-recovery-codes/` `{code}` | `code` must be one of the previewed codes; replaces recovery authenticator; **204** on success, 400 `No recovery codes set, use GET first` / `Invalid code` | `BE apps/users/api.py:270-293` |

Stock TOTP enrolment order: GET codes, show QR (`GET .../totp` 404 meta), user enters the TOTP code (`POST .../totp`), then stage 2 asks them to type one preview recovery code (`POST /generate-recovery-codes/`; stock treats any non-200 as success, `multi-factor-auth.service.ts:205-222`).

### 1.4 How the SPA decides "logged in"

1. `localStorage.isAuthenticated` seeds the signal so reloads do not flash (`FE auth.service.ts:11-19`).
2. App start calls `GET /auth/session`; 200 sets true, 401 sets false and captures `flows` (`auth.service.ts:30-55`).
3. `loggedInGuard` computed: if authenticated return true; else wait for `initialized`; then redirect to `/login?next=<url>` (`guards.ts`).
4. Current user is `GET /api/0/users/me/` keyed on `isAuthenticated` (`user.service.ts`). It returns `{id,options,username,email,hasPasswordAuth,identities,isSuperuser,isActive,name,...}`; `identities` carries the social accounts.
5. Any `/api/0` 401/403 whose body `detail` is `"Unauthorized"` or `"Authentication credentials were not provided."` sets `isAuthenticated=false` and does `location.href="/"` (`api.ts:27-47`). Live unauthenticated body: `401 {"detail":"Unauthorized"}`.

### 1.5 `GET /api/settings/` (anonymous)

Live response and the flags that matter (`BE glitchtip/api/api.py:169-262`):

```json
{"socialApps":[], "billingEnabled":false, "iPaidForGlitchTip":false, "enableUserRegistration":true,
 "enableSocialAppsUserRegistration":true, "enableOrganizationCreation":false, "stripePublicKey":null,
 "chatwootWebsiteToken":null, "sentryDSN":null, "sentryTracesSampleRate":0.01, "environment":null,
 "version":"7.0.0", "serverTimeZone":"UTC", "glitchtipInstanceName":null, "enabledFeatures":["logs","uptime","email"]}
```

| Field | Effect in stock UI | Gotcha |
|---|---|---|
| `socialApps[]` `{name, client_id, provider, scopes, brand}` | Login and register buttons; Account "connect" select. `provider` is the `provider_id` for multi-instance providers (use it as the form `provider` value); `brand` picks the logo | `client_id` is snake_case, the rest camel (Ninja `ModelSchema`) |
| `enableUserRegistration` | Show/hide register form and "Create account" links | Forced `true` while the user table is empty (first-run bootstrap). Allauth `/config` `is_open_for_signup` agrees |
| `enableSocialAppsUserRegistration` | Show/hide social register | Same empty-table override. Org-linked social apps can still create accounts |
| `enableOrganizationCreation` | Nav create-org link | **Raw setting only.** Backend also allows create when no org exists or user is superuser (`BE apps/organizations_ext/api.py:103-110`, `utils.py:8-12`). Stock gets this wrong (always shows it) |
| `billingEnabled` | Subscription page variant; terms banner; new-org redirect to subscription | `true` only when both Stripe keys are set |
| `iPaidForGlitchTip` | Support menu variant | True when billing on, env flag, or a support license key stored |
| `enabledFeatures` | `logs` and `uptime` gate nav items; `mcp` shows the post-copy hint; **`email` is not read by the 7.0.0 frontend** though the backend comment says clients should hide reset/resend and offer copy-link invites when it is absent (`BE api.py:222-226`) | Faultline should honour `email` |
| `serverTimeZone`, `version`, `glitchtipInstanceName` | System info page, "copy for AI" header | Instance name is markdown |
| `sentryDSN`, `sentryTracesSampleRate`, `environment` | Optional frontend self-error reporting (micro-sentry) | Optional |
| `chatwootWebsiteToken`, `stripePublicKey` | Hosted-only widgets | Skip |

Other anonymous endpoints: `GET /api/settings/{organization_slug}/` returns only `{socialApps}` for that org's own login page (empty list for unknown slugs). The backend builds `loginUrl = {GLITCHTIP_URL}/login/{org-slug}` (`BE apps/organizations_ext/schema.py:204-209`) but the stock router has no such page.
Instance-license endpoints (`/api/0/instance-license/`, `/support-link/`) need a session.

### 1.6 Account errors (live, 7.0.0)

Faultline never shows the backend's sentences. It words each error by allauth's `code` and by GlitchTip's `detail` string (`src/api/form-errors.ts`), and logs the raw body.

| Where | Answer |
|---|---|
| `POST .../auth/signup`, `.../account/password/change` (`new_password`), `.../auth/password/reset` | 400 with one entry per failed rule on the password param: `password_too_short`, `password_too_common`, `password_entirely_numeric` (and `password_too_similar`) |
| `POST .../auth/signup` | `email_taken` (param `email`); `invalid` (param `email`) for a malformed address |
| `POST .../account/password/change` | A wrong current password is `enter_current_password` (param `current_password`), not a mismatch code |
| `GET .../auth/password/reset` with header `X-Password-Reset-Key: <key>` | 200 for a usable key, 400 `invalid_password_reset` (param `key`) for a bad, used or expired one. Lets the set-new-password page say "expired" before the user types |
| `POST .../auth/email/verify` | 400 `invalid_or_expired_key` (param `key`) |
| `POST .../account/authenticators/totp` | 400 `unverified_email` (param `code`) while **any** of the user's addresses is unverified, not only the primary |
| `POST /api/0/users/me/emails/` | 400 `Email already exists` when the user already has it. An address that belongs to another account is accepted (unverified). 422 Ninja `detail` list for a malformed address |
| `DELETE /api/0/users/me/` | 400 `User is organization owner. Delete organization or transfer ownership first.` |
| `POST /api/0/generate-recovery-codes/` | 400 `Invalid code`, or `No recovery codes set, use GET first` |
| `POST /api/0/wizard-set-token/` | 422 when `hash` is not 64 characters; 400 `Token not found` for an unknown or used hash |
| `POST /api/0/api-tokens/` | Accepts an empty `label` and an empty `scopes` list; Faultline requires both |
| `PUT /api/0/users/me/` | Needs `options` in the body (422 `missing` otherwise); `name` is at most 255 characters |
| `DELETE .../account/providers` | 400 `no_password`, `no_verified_email` or `disconnect_last` when disconnecting would leave no way to sign in; `account_not_found` |
| `POST .../auth/provider/redirect` with `process=connect` | A failed connection comes back to the `callback_url` with `?error=…&error_process=connect` |
| Any `.../account/*` endpoint after the session ended | 401 with `meta.is_authenticated` not `true`. Faultline treats that as signed out; sign-in endpoints keep their own 401 handling |
| Any `.../account/*` endpoint that needs a fresh sign-in | 401 with `meta.is_authenticated: true` and a `reauthenticate` (or `mfa_reauthenticate`) flow, not pending (`allauth/headless/base/views.py` `ReauthenticationResponse`). Faultline says "Sign in again to make this change." `ACCOUNT_REAUTHENTICATION_TIMEOUT` equals the session age, so it does not appear in practice |
| Every allauth text input, passwords included | Stripped before validation (Django `CharField`, `strip=True`): a password of only spaces is `required`, outer spaces do not count towards the 8 characters, and the stored password has none |
| `POST .../auth/2fa/authenticate` after the pending sign-in expired | 401 with no pending flow, the same as signed out |

---

## 2. Invite acceptance

Email link and `inviteLink` field are the same URL: `{GLITCHTIP_URL}/accept/{orgUserId}/{token}/`. Token is `InvitationTokenGenerator`, valid 15 days (`REGISTRATION_TIMEOUT_DAYS`), bound to the org-user id and timestamp, not to an email or account (`BE apps/organizations_ext/invitation_backend.py`). Anyone holding the link can accept it.

| Step | Call | Notes |
|---|---|---|
| 1. Land | SPA route `/accept/:memberId/:token`, no auth guard | `FE src/app/app.routes.ts` |
| 2. Preview | `GET /api/0/accept/{org_user_id}/{token}/` (anonymous) | `{acceptInvite:false, orgUser:{id,role,email,organization:{name,slug,...},pending,...}}`. Live: bad token `403 {"detail":"Invalid invite token"}`, unknown id `404 {"detail":"Not Found"}` (`BE apps/organizations_ext/api.py:430-452`) |
| 3. If anonymous | Links to `/register?next=/accept/:id/:token` and `/login?next=...` | `FE accept-invite.component.html`; `nextUrl = /accept/${memberId}/${token}` |
| 4. If logged in and already a member of that org (compare `organization.slug` with `GET /organizations/`) | Show warning + "log out" link, no accept button | `accept-invite.service.ts:30-42` |
| 5. Accept | `POST /api/0/accept/{org_user_id}/{token}/` body `{"acceptInvite":true}` (needs session + CSRF) | Binds the current user to the org-user row and clears its `email`. 200 returns the same shape with `acceptInvite:true`. Stock then reloads orgs, snackbar "You have been added to X", navigates `/`. A 500 containing "already exists" means they are already a member |

Create side: `POST /api/0/organizations/{org}/members/` body `{email, orgRole, teamRoles:[{teamSlug,role}], sendInvite, reinvite}` returns 201 with `inviteLink`. Rules (`BE apps/organizations_ext/api.py:221-299`): 409 if already a member or already invited (unless `reinvite:true`, which resends); 403 `Only existing users may be invited` when registration is closed and the email is unknown; 403 `User must have a verified email address` only when `EMAIL_ENABLED` **and** `EMAIL_INVITE_REQUIRE_VERIFICATION=true` (default false, `BE settings.py:1432`) and the inviter has no verified email; throttled to `EMAIL_THROTTLE_COUNT` (50) per `EMAIL_THROTTLE_INTERVAL` (300 s) per inviter; role ceiling enforced (managers cannot invite owners). Stock posts one request per comma-separated email.

---

## 3. Issue search, lists, bulk actions

### 3.1 List

`GET /api/0/organizations/{org}/issues/` (`BE apps/issue_events/api/issues.py:431-469`, filters `apps/issue_events/services.py:59-66`)

| Param | Type | Notes |
|---|---|---|
| `query` | string | Syntax below. Stock default when absent: `is:unresolved` (client side) |
| `sort` | `last_seen`, `first_seen`, `count`, `priority`, each optionally `-` prefixed | Default `-last_seen` |
| `project` | repeated int | `project=1&project=2` (openapi-fetch explode style) |
| `environment` | repeated string | Stock sends one. Matches the `environment` issue tag |
| `start`, `end` | ISO datetime **or** `now`, `now-30m`, `now-1h`, `now-7d` (single optional subtraction, units m/h/d, regex `now\s*\-\s*\d+\s*(m\|h\|d)`) | Filter on **first_seen** (`first_seen__gte/lte`), not activity time |
| `id` | repeated int | Used by bulk PUT/DELETE |
| `limit` | int | Default 50 (`NINJA_PAGINATION_PER_PAGE`), clamped to 100 (`NINJA_MAX_PER_PAGE_SIZE` default; ninja `settings`). Stock asks 200 in places and silently gets 100 |
| `cursor` | opaque base64 string | From the `Link` header |
| `shortIdLookup=1` | flag | With `query` equal to a short id (`PROJ-1A`) returns that issue and sets `X-Sentry-Direct-Hit: 1`. Stock does not send it |

Query syntax (parsed with `shlex.split`, falling back to whitespace split; `BE services.py:139-220`):

| Token | Meaning |
|---|---|
| `is:unresolved\|resolved\|ignored` | Status |
| `level:fatal\|error\|warning\|info\|debug\|sample` | Level |
| `has:<tagkey>` | Issue has any value for the tag |
| `<key>:<value>` | Tag equality (e.g. `browser:Chrome`, `release:1.2.0`, `user.email:x`). Quotes stripped: `"key":"value"` works as the tag links do. One value per key; no OR, no negation |
| bare word(s) | Full-text search over the issue index. **The first bare token ends structured parsing**: everything from there on is joined into the text search. Put filters first |
| `word*` | If any `*` appears in the text, becomes `title ILIKE %word%` OR FTS. Kudcrafts appends `*` to the trailing text for as-you-type matches |
| a UUID | Event lookup: filters to issues containing that event, sets `X-Sentry-Direct-Hit: 1`, and `matchingEventId` is filled; stock then navigates to `/:org/issues/:id/events/:matchingEventId` |

Response: array of `IssueSchema` (camelCase): `id` (string), `count` (string), `status`, `level`, `type`, `title`, `culprit`, `metadata`, `project{id,slug,name,platform}`, `shortId`, `numComments`, `userCount`, `firstSeen`, `lastSeen`, `firstRelease`, `lastRelease`, `statusDetails`, `assignedTo`, `matchingEventId`, `permalink`, `stats{"24h":[]}` (empty here; use issues-stats).

Pagination: `Link`, `X-Hits` (exact count up to `X-Max-Hits`), `X-Max-Hits` (1000; show `1000+` when `hits === maxHits`, as stock does). Live:

```
x-hits: 9
x-max-hits: 1000
link: {'<http://localhost:8600/api/0/organizations/demo-co/issues/?limit=2&query=is:unresolved&sort=-last_seen>; rel="previous"; results="false", <.../issues/?cursor=cD0y...&limit=2&query=is%3Aunresolved&sort=-last_seen>; rel="next"; results="true"; cursor="cD0y..."'}
```

**Quirk: the queryset-paginated routes emit the header wrapped in `{'...'}`** (Python set literal, `BE glitchtip/api/pagination.py:215`: `response["Link"] = {", ".join(links)} if links else {}`). The raw-SQL helper (`pagination.py:12-57`) emits a clean header. Parse tolerantly: split on `, <`, match `rel="(\w+)"`, `results="(true|false)"`, `cursor="([^"]+)"`; only follow a rel whose `results="true"`. The stock regex `<(.*)>; rel="(\w*)"` plus a `results` check works (`FE shared/pagination.utils.ts`). The URLs in `Link` are absolute and built from the request host.

Stats: `GET /organizations/{org}/issues-stats/?groups=<id>&groups=<id>&statsPeriod=24h|14d` returns `[{id, stats:{"24h":[[unixSeconds,count],...]}}]`, only buckets that had events, max 200 issues (`BE apps/issue_events/api/issues.py:782-837`).

Other filters: `GET /organizations/{org}/environments/` and `/projects/{org}/{project}/environments/` for the env dropdown (names, `isHidden`).

### 3.2 Bulk update / delete / merge

**A request without `id` acts on every issue matching the filters, for update, merge and delete alike.** openapi-fetch drops an empty `id=[]`, so the client must refuse an empty selection itself (`selectionQuery` in `src/api/issues.ts`).

| Action | Request | Body | Notes |
|---|---|---|---|
| Update selected | `PUT /organizations/{org}/issues/?id=1&id=2` | `{"status":"resolved"\|"unresolved"\|"ignored"}` | Also accepts `muted` (= ignored) and `resolvedInNextRelease`. Response echoes the payload (`{status,...}`); stock reads `data.status` |
| Update all matches | `PUT /organizations/{org}/issues/?project=..&query=..&start=..&end=..&environment=..` (no `id`) | `{"status":...}` | **First 50 applied synchronously, the rest queued** (`BE apps/issue_events/api/issues.py:552-614`, `limit = 50`). Stock patches the visible rows locally rather than refetching. The backend freezes the matching set (`id__lte max_id`), so issues that arrive meanwhile are not caught |
| Merge | `PUT .../issues/?id=1&id=2&id=3` | `{"merge":1}` | Same project only, else 400 `Cannot merge issues from different projects`. The newest id (highest) survives. Needs 2+ ids |
| Single issue | `PUT /organizations/{org}/issues/{id}/` (or `PUT /issues/{id}/`) | `{"status":"resolved","statusDetails":{"inNextRelease":true}}` or `{"inRelease":"1.2.0"}` | Response `{status, statusDetails}`; `statusDetails.inRelease` set when it pinned a release. `inNextRelease` needs a single project (400 otherwise). Any non-resolved status clears the pinned release |
| Assign | same PUT | `{"assignedTo":"user:<id>"\|"team:<slug>"\|"<email>"\|""}` | Backend supports it; no stock UI |
| Delete selected | `DELETE /organizations/{org}/issues/?id=1&id=2` | none | Marks deleted, enqueues purge; body is `{"status":"resolved"}` (sic) |
| Delete all matches | `DELETE .../issues/?project=..&query=..` (no `id`) | none | Same filters as list |
| Delete one | `DELETE /issues/{id}/` | none | |
| Project-scoped (CLI) | `PUT /projects/{org}/{project}/issues/` | as above | `sentry-cli issues resolve/mute/unresolve`; not used by SPA |

Permissions: `event:write` or `event:admin` on the org; reads need `event:read`. Unmerging hashes needs `event:admin` (`BE apps/issue_events/api/hashes.py:64`).

### 3.3 Event and issue detail

| Call | Notes |
|---|---|
| `GET /issues/{id}/` | `IssueDetailSchema` = list item + `userReportCount`. Unknown id gives 404 (stock shows "Issue not found") |
| `GET /issues/{id}/events/latest/` and `/events/{event_id}/` | `IssueEventDetailSchema`: `entries`, `contexts`, `context`, `tags`, `user`, `sdk`, `nextEventID`, `previousEventID`, `dateCreated`, `groupID`, etc. `{event_id}` is the **server UUIDv7 `id`**, not the SDK `eventID` |
| `GET /issues/{id}/tags/?key=` | `[{key,name,topValues:[{name,value,count,key}],uniqueValues,totalValues}]` |
| `GET /organizations/{org}/issues/{id}/events/{event_id}/json/` | Raw event JSON. The stock "raw JSON" link is `/organizations/{org}/issues/{id}/events/{eid}/json/`, which the backend 302s to the `/api/0/...` URL (`BE glitchtip/urls.py:36-41`, live 302). Link to the API URL directly |
| `GET`/`POST /issues/{id}/comments/` `{data:{text}}`; `PUT`/`DELETE .../comments/{cid}/` | Edit/delete: author, manager or owner only (7.0 breaking) |
| `GET`/`DELETE /organizations/{org}/issues/{id}/hashes/` | `DELETE ?id=<hashId>&id=...` returns 202 (unmerge). Never unmerge all hashes |
| `GET /issues/{id}/user-reports/` | Paginated; `UserReportSchema{eventID,event,dateCreated,user,id,name,email,comments}` |

---

## 4. Paths that must be reachable on the SPA origin

`FE proxy.conf.json` (the stock dev proxy) lists `/api`, `/accounts`, `/_allauth`, `/oauth`, `/admin`. The backend's own SPA catch-all regex is `^(auth|login|register|(.*)/issues|(.*)/settings|(.*)/performance|(.*)/projects|(.*)/releases|organizations|profile|(.*)/uptime-monitors|(.*)/logs|accept|reset-password|system-info).*$` (`BE glitchtip/urls.py:66-70` (after `re_path(r"^$", index)`)). Kudcrafts proxies `api|_allauth|accounts|oauth|mcp|admin|media|static|.well-known` (`deploy/default.conf.template`).

| Prefix | Needed for | Required? | Evidence |
|---|---|---|---|
| `/api/` (all of `/api/0`, `/api/settings/`, `/api/embed/`, ingest `/api/{id}/store\|envelope\|minidump\|security/`) | The whole REST API; SDK DSN ingest if the same origin is the DSN host | **Yes** | `BE glitchtip/urls.py` |
| `/_allauth/` | All auth, MFA, social redirect | **Yes** | live |
| `/accounts/` | IdP callbacks, e.g. `/accounts/{provider}/login/callback/` and OIDC `.../callback/`; this is the `callbackUrl` shown to org SSO admins. With `HEADLESS_ONLY` it serves no pages (live: `/accounts/` is a 404 HTML) | Yes if any social app is configured | `BE settings.py:1475`, `urls.py:63`; `FE src/app/server-routes.ts:11-18` |
| `/oauth/authorize/` | OAuth consent page used by the MCP server flow (server-rendered). Anonymous hits 302 to `/login?next=/oauth/authorize/...`; after login the SPA must **full-page navigate** to `next` | Only for MCP | live; `FE server-routes.ts:20` |
| `/admin/` | Django admin (server-rendered). Anonymous hits 302 to `/login?next=%2Fadmin%2Flogin%2F`, so the SPA must honour `next` with a full navigation | If admin is exposed (`ENABLE_ADMIN`) | live |
| `/static/` | Django admin and status-page CSS, `favicon.ico` (backend redirects `/favicon.ico` to `/static/favicon.ico`) | If `/admin/` or status pages are exposed | live (`/static/favicon.ico` 200) |
| `/media/` | Uploaded files when local storage is used (served by Django only when `DEBUG`) | Usually no | `BE urls.py:77-78`; stock UI never references it |
| `/status-pages/{org}/{slug}/` | Public uptime status page, server-rendered HTML, cached 60 s | Only if you expose status pages | `BE apps/uptime/urls.py`, `views.py` |
| `/mcp`, `/.well-known/oauth-authorization-server*`, `/.well-known/oauth-protected-resource*` | MCP + OAuth metadata (ASGI dispatcher, only when `GLITCHTIP_ENABLE_MCP`) | Only for MCP | `BE glitchtip/asgi.py:43-90` |
| `/v1/logs`, `/api/{id}/envelope/` | OTLP / SDK ingest (DSN host) | Only if Faultline origin is the DSN host | `BE urls.py:28-34` |
| `/_health/`, `/robots.txt`, `/metrics` | Ops | Optional (`/metrics` needs `ENABLE_OBSERVABILITY_API`) | |
| `/organizations/{org}/issues/{id}/events/{eid}/json/` | Legacy raw-JSON path | No (use the `/api/0/` URL) | live 302 |
| `/api/` itself | Backend 302s `GET /api/` to `/profile/auth-tokens` (SPA route, must exist) | Keep route | `BE urls.py:35` |

SPA-side routes the backend redirects to, which Faultline must serve: `/login` (with `?next=` and `?socialLoginError=true`), `/login/{org-slug}`, `/profile/confirm-email/{key}/`, `/reset-password`, `/reset-password/set-new-password/{key}`, `/accept/{id}/{token}`, `/profile/auth-tokens`, `/register`, `/organizations/...`, `/{org}/issues/...`. Allauth's frontend URL map is `HEADLESS_FRONTEND_URLS` (`BE settings.py:1476-1482`).

Sub-path deployment: backend honours `BASE_PATH`/`FORCE_SCRIPT_NAME` and rewrites `<base href>` in its `index.html` (`BE glitchtip/views.py`); the stock SPA derives the API base URL from `<base>` (`FE shared/api/api.ts:50-57`).

---

## 5. Version-sensitive behaviour (7.0.0) and API gotchas

| Topic | Detail | Source |
|---|---|---|
| Org id or slug | Every org-scoped path accepts the numeric id or the slug (`/api/0/organizations/42/...`). Slugs can no longer be all digits. Stock sends the id (from `GET /organizations/`) to save a lookup | CHANGELOG 7.0.0; `FE api/organizations.service.ts:orgPath` |
| Tightened roles | Org delete = owner only; team rename, project update, key create, env hide, alert create/update/test need admin+; managers cannot grant/manage owners; comment edit/delete = author, manager or owner. Gate UI on `access[]` scopes from `GET /organizations/{org}/` (`org:`, `project:`, `team:`, `member:`, `event:` read/write/admin, plus `project:releases`, `org:integrations`) | CHANGELOG; live `access` array |
| Link header wrapper | Set-literal wrapper on queryset paginators (see 3.1) | `BE pagination.py:215` |
| Page size | Default 50, max 100 regardless of `limit` | `BE settings.py:1522`; ninja default |
| `X-Hits` cap | `X-Max-Hits: 1000`; counts above that read 1000 | live |
| Error shapes | 422 `{"detail":[{type,loc,msg,ctx}]}`; 400/403/404 `{"detail":"..."}`; throttle 429 `{"message":"Please retry later"}` + `Retry-After`; 413 plain text; cold-storage 503 + `Retry-After: 1`; unknown `/api/0/*` path `404 {"detail":"Not found"}`; allauth `{status,errors:[...]}`. The stock `handleError` wraps 400 detail strings into `[{msg}]` | `BE glitchtip/api/api.py:97-150`; `FE shared/api/api-errors.ts` |
| API token create | OpenAPI says `scopes: integer` (bitmask) but the route also accepts an array of scope names, which is what the stock form sends. Valid names: `project:{read,write,admin,releases}`, `team:{read,write,admin}`, `event:{read,write,admin}`, `org:{read,write,admin}`, `member:{read,write,admin}`. 422 `{"detail":[{"scopes":"Invalid scope"}]}` | `BE apps/api_tokens/models.py:25-44`, `schema.py:11-32` |
| Notification prefs | `PUT /users/me/notifications/alerts/` body `{"<projectId>": -1\|0\|1}` returns 204 (`-1` = inherit default); `GET` returns a map keyed by project id | `FE profile/notifications/notifications-state.ts` |
| User id `me` | `{user_id}` paths accept the literal `me` | `FE api/user/user.service.ts:25` |
| Release version in path | URL-encode; versions contain `/` and `@` | |
| Env writes | `PUT /projects/{org}/{project}/environments/{name}/` body is the whole environment object (`isHidden`) | `FE project-environments.service.ts` |
| Alerts payload | `alertRecipients` is a discriminated union on `recipientType` (`email`, `webhook`, `discord`, `googlechat`, `ntfy`, `teams`, `feishu`, `slack`, `zulip`). Zulip carries `botEmail`, `apiKey`, `channel`, `topic`; saved Zulip recipients return those inside `config` (snake_case), but input is flat | `FE project-alerts.service.ts:28-60` |
| Monitor types | API enum `Ping, GET, POST, TCP Port, SSL, Heartbeat`; stock form offers all but SSL. `interval` max 86400 in the schema (the stock form text says 32768); `timeout` 1-60; `confirmationThreshold` 1-100 exists, not in stock form | `/api/openapi.json`; `FE monitor-form.component.ts:113` |
| Org-creation rule | Allowed if `ENABLE_ORGANIZATION_CREATION`, or no org exists yet, or the user is superuser | `BE apps/organizations_ext/api.py:103-110` |
| Email feature flag | `enabledFeatures` has `email` only when a mail transport is configured. Without it: no reset mail, no verification, invites need copy-link | `BE api.py:222-226`; `settings.py:1454-1471` |
| Passkeys | `MFA_PASSKEY_LOGIN_ENABLED=True` so `session` flows list `mfa_login_webauthn`; the stock login page ignores it | live |
| `MFA_WEBAUTHN_ALLOW_INSECURE_ORIGIN` | Only when `DEBUG`; WebAuthn needs https or localhost otherwise | `BE settings.py:1491` |
| CSP | Backend sets `default-src 'self'` with a per-request nonce on `index.html`. Faultline is served elsewhere so this only matters if the SPA is hosted by Django | live headers |
| Frontend ahead of / behind backend | Backend returns `inviteLink`, supports `shortIdLookup`, `assignedTo`, social-app and status-page APIs, `/api/settings/{org}/`; the tagged frontend uses none of them | grep of `FE src/app` |

---

## 6. Kudcrafts alternative (`/home/jarvis/dev/scratch/glitchtip-demo/frontend`): what to borrow, what to avoid

| Topic | What it does | Verdict |
|---|---|---|
| Session/CSRF | Plain `fetch` wrapper for allauth (`credentials:"include"`, `X-CSRFToken` from cookie), `openapi-fetch` for `/api/0` with the same header on non-GET (`src/lib/api.ts`). Session probe is `GET /auth/session` | Same as stock. Correct |
| CSRF edge | Sends an **empty** `X-CSRFToken` if the cookie is missing, and sets it on every non-GET even for GET-safe allauth calls | Works only because `session` is fetched first (it sets the cookie). Better: fetch `/auth/session` before any write and fail loudly if no cookie |
| Login | Email + password, then a single "Authenticator code" field if a pending `mfa_authenticate` flow appears (`flows.find(f => f.is_pending)`) | TOTP/recovery only; no WebAuthn, no social, no signup, no reset. Note the stock UI matches on `flow.id === "mfa_authenticate"` without `is_pending` |
| 401 handling | `unwrap()` dispatches a `glitchtip:unauthorized` event on any 401/403 | Simpler than stock's body sniffing; but it would also fire on legitimate 403s (permissions) |
| Pagination | Reads only `rel="next"` with `results="true"` and the `cursor="..."` attribute via regex, so the `{'...'}` wrapper is harmless; `x-hits` for totals | Good. Does not use `previous` (infinite scroll) |
| Search | `toApiQuery()` keeps structured tokens first (`/^[\w.-]+:\S/`) and appends `*` to trailing free text (prefix/mid-word matching while typing) | Clever and matches the backend rule that the first bare word ends structured parsing. Caveat: `*` switches to `ILIKE %text%` on the title and ORs the FTS, which can be slow on big orgs; debounce is 140 ms |
| Status tabs | Rewrites `is:<status>` inside the query string when switching tabs | Fine; stock has no tabs, only the query |
| Sort | Only `-last_seen`, `-first_seen`, `-count`, `-priority` | Drops the ascending variants stock offers |
| Bulk | `PUT .../issues/?id=` for selected only | No "all matching" mode, no merge, no delete |
| Keyboard | `j`/`k`/arrows move the row cursor, `e` toggles resolve (`routes/issues.tsx:130-138`), a command palette (`components/command.tsx`) searches issues and projects | Not in stock; keep as an extra |
| Hosting | Nginx proxies `api\|_allauth\|accounts\|oauth\|mcp\|admin\|media\|static\|.well-known`, rewrites `Origin`/`Referer`/`Host` to the backend, forces `X-Forwarded-Proto https` and takes the client IP from `CF-Connecting-IP` | Needed only because the SPA host differs from the backend host. Prefer same-host path routing |
| Stale types | Schema uses `{organization_slug}` path params, from an older backend | 7.0.0 uses `{organization_id_or_slug}`; regenerate types from the target backend's `/api/openapi.json` |

---

## 7. Commands used (for reproducing)

```sh
# session + csrf cookie
curl -s -c jar -b jar -D- http://localhost:8600/_allauth/browser/v1/auth/session
CSRF=$(awk '$6=="csrftoken"{print $7}' jar)
# login
curl -s -c jar -b jar -X POST http://localhost:8600/_allauth/browser/v1/auth/login \
  -H "X-CSRFToken: $CSRF" -H 'Content-Type: application/json' -H 'Origin: http://localhost:8600' \
  -d '{"email":"demo@example.com","password":"demo-pass-123"}'
# api
curl -s -b jar http://localhost:8600/api/0/organizations/demo-co/issues/?limit=2
```
