# Faultline

A modern frontend for self-hosted GlitchTip: React 19, Vite, TanStack Router + Query, Tailwind v4, shadcn/ui, Bun. It replaces the stock UI and talks to an unmodified GlitchTip backend on the same origin.

## Commands

Use Bun; npm and npx are not used in this repo.

| Task | Command |
|---|---|
| Backend for dev and e2e (GlitchTip 7.0.0 on :8600) | `bun run backend:up`, then `bun run seed` |
| App with backend proxy (:5190) | `bun run dev` |
| Checks | `bun run lint && bun run typecheck && bun run test` |
| End-to-end, against the image on :8620 | `docker compose -f dev/compose.yml --profile app up -d --wait --build && bun run e2e` |
| Refresh API schemas after a backend upgrade | `bun run api:schema` |

Demo login: `demo@example.com` / `demo-pass-123`, organisation `demo-co`.

## Rules

- **Backend calls live only in `src/api/`.** Screens import query options and actions from there and never call `fetch`. GlitchTip's API is not a stable contract, so this is the one place that changes when it does. Read `docs/research/backend-integration.md` before touching auth, CSRF, search, pagination or bulk actions. In particular, a bulk request without ids acts on every matching issue.
- **Routes mirror the stock GlitchTip paths** (`/:org/issues/:id`, `/:org/settings/projects/:slug`, `/login`, `/accept/:id/:token`, …), so links in old alerts and emails keep working. `docs/parity.md` lists every stock route; tick a row when Faultline reaches parity for it.
- **Every backend path proxied on the same origin** is listed in `src/api/backend-paths.ts`, and `docker/Caddyfile` mirrors it (a test enforces this).
- **UI follows `DESIGN.md`.** Read it before building or changing a screen.
- **Tests:** Vitest only for browser logic the server does not check; Playwright (`e2e/`) for happy paths only, against a real GlitchTip. No mocks of the backend.
- **Fixed value sets** are `as const` objects with a same-name type, not raw strings or `enum`.
- **Compatibility:** when testing a new GlitchTip version, follow `docs/compatibility.md`.
