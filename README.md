# Faultline

[![CI](https://github.com/snnbotchway/faultline/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/snnbotchway/faultline/actions/workflows/ci.yml?query=branch%3Amain)
[![Release](https://img.shields.io/github/v/release/snnbotchway/faultline)](https://github.com/snnbotchway/faultline/releases/latest)
[![Licence: MIT](https://img.shields.io/github/license/snnbotchway/faultline)](LICENSE)
[![Image on GHCR](https://img.shields.io/badge/image-ghcr.io%2Fsnnbotchway%2Ffaultline-2496ED?logo=docker&logoColor=white)](https://github.com/snnbotchway/faultline/pkgs/container/faultline)
[![Tested against GlitchTip 7.0.0](https://img.shields.io/badge/GlitchTip-7.0.0-6C5FC7)](docs/compatibility.md)

**A modern frontend for self-hosted [GlitchTip](https://glitchtip.com).** It covers every screen of the stock GlitchTip UI: issues, uptime monitors and status pages, performance, logs, releases, alerts, usage, settings and sign-in. It ships in English, French and Norwegian Bokmål, and runs against an unmodified GlitchTip backend.

Faultline is an independent project and is not affiliated with or endorsed by GlitchTip.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/inbox-1440-dark.png">
  <img src="docs/screenshots/inbox-1440-light.png" alt="The issue inbox: issues grouped as new, spiking and ongoing on one 14-day timeline with release markers">
</picture>

![An issue: what happened, the stack trace with the line that threw, and tag breakdowns](docs/screenshots/issue-1440-dark.png)

<p>
  <img src="docs/screenshots/inbox-390-dark.png" alt="The inbox on a phone" width="260">
  <img src="docs/screenshots/issue-390-light.png" alt="An issue on a phone" width="260">
</p>

## Why

GlitchTip is a great open-source, Sentry-compatible error tracker. Faultline gives it a dense, fast interface built for daily triage:

- **At parity with the stock frontend:** every stock screen and route is covered, as [the parity checklist](docs/parity.md) records, so you never need to switch back.
- **Keyboard first:** `j`/`k` to move, `x` to select, `e` to resolve, `/` to search, `⌘K` for everything else.
- **See what's new and spiking at a glance:** every issue sits on one shared timeline, with release markers.
- **Works on a phone:** triage an alert from wherever you are.
- **Three languages:** English, French and Norwegian Bokmål, chosen under Profile or taken from the browser.
- **Light and dark** themes.
- **Drop-in:** one container in front of your existing GlitchTip. Old alert and email links keep working because Faultline uses the same URLs.

## Quick start

Faultline is one image: it serves the app and passes API, sign-in and ingest requests through to GlitchTip on the same origin, so sessions keep working.

```sh
docker run -d -p 8080:8080 -e BACKEND_URL=http://your-glitchtip:8000 ghcr.io/snnbotchway/faultline
```

Open http://localhost:8080 and sign in with your GlitchTip account.

### Next to GlitchTip in Docker Compose

Add a service to the Compose file that runs GlitchTip, and point your reverse proxy (or users) at Faultline instead of GlitchTip:

```yaml
services:
  faultline:
    image: ghcr.io/snnbotchway/faultline:latest
    environment:
      BACKEND_URL: http://web:8000   # the GlitchTip web service
    ports: ["8080:8080"]
    restart: unless-stopped
```

Set GlitchTip's `GLITCHTIP_DOMAIN` to Faultline's public URL, so the links in alerts and emails open Faultline. Your SDKs can keep their DSNs: Faultline also passes event ingest through to GlitchTip.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `BACKEND_URL` | (required) | Where the GlitchTip web service listens, as Faultline's container sees it, e.g. `http://glitchtip:8000`. |
| `PORT` | `8080` | Port Faultline listens on inside the container. |
| `BASE_PATH` | (empty) | Serve Faultline under a prefix such as `/faultline`, for a proxy that shares one host between apps. Letters, digits and `. _ ~ - /` only. See below. |

**Under a `BASE_PATH`**, give GlitchTip the same `BASE_PATH` and set its `GLITCHTIP_DOMAIN` to the URL with the prefix (`https://example.com/faultline`), so its admin, alert emails and DSNs use it too. GlitchTip 7.0.0 still serves its admin styles from `/static/` and sends password-reset and email-confirmation links to the root, outside the prefix. Faultline writes the prefix into a copy of the app under `/tmp`, so a read-only root filesystem needs a tmpfs there.

**Behind a TLS proxy** that forwards the original `Host` header (Caddy, Traefik, Tailscale Serve, most nginx setups), nothing else is needed. If your proxy rewrites `Host`, add Faultline's URL to GlitchTip's `CSRF_TRUSTED_ORIGINS`.

**Performance** needs GlitchTip's cold storage for span breakdowns, weekly trends and repeated queries; see [docs/compatibility.md](docs/compatibility.md#cold-storage-for-performance).

## Compatibility

Every release is tested in CI against a real GlitchTip backend. Faultline 0.3.0 is tested against GlitchTip 7.0.0; [docs/compatibility.md](docs/compatibility.md) lists every release, and the organisation slugs that clash with backend paths.

## Develop

You need [Bun](https://bun.sh) and Docker.

```sh
bun install
bun run backend:up && bun run seed:performance   # GlitchTip 7.0.0 with demo issues, transactions and logs on :8600
bun run dev                                      # http://localhost:5190, demo@example.com / demo-pass-123
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Coding agents: start with [AGENTS.md](AGENTS.md) or [llms.txt](public/llms.txt).

More in [docs/](docs): [parity checklist](docs/parity.md), [compatibility](docs/compatibility.md), [languages](docs/i18n.md), [GlitchTip backend notes](docs/research/backend-integration.md), and the [changelog](CHANGELOG.md).

## Licence

[MIT](LICENSE). The vendored API schemas come from GlitchTip and django-allauth, both MIT; see [src/api/schema/NOTICE.md](src/api/schema/NOTICE.md).
