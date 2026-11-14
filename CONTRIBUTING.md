# Contributing to Faultline

Thanks for helping. Faultline is a volunteer project: a frontend for self-hosted GlitchTip that aims to replace the stock UI completely.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Check `docs/parity.md` for what is still missing; unticked rows are good places to start.
- Faultline is not affiliated with GlitchTip. Bugs in the GlitchTip backend belong at https://gitlab.com/glitchtip/glitchtip-backend.

## Set up

You need [Bun](https://bun.sh) and Docker.

```sh
bun install
bun run backend:up   # GlitchTip 7.0.0 + Postgres + Valkey on :8600
bun run seed         # demo@example.com / demo-pass-123, org demo-co
bun run dev          # http://localhost:5190
```

## Working on the code

`AGENTS.md` holds the rules that apply to people and coding agents alike: where backend calls live, how routes are named, and what to test. `DESIGN.md` describes the design system.

Before you open a pull request:

```sh
bun run lint && bun run typecheck && bun run test
docker compose -f dev/compose.yml --profile app up -d --wait --build && bun run e2e
```

- Keep commits small and focused, with messages in the imperative ("Add release files list").
- Add an entry under `## [Unreleased]` in `CHANGELOG.md` for user-visible changes.
- For a UI change, include phone- and desktop-width screenshots, in light and dark mode.

## Licence

By contributing you agree that your contribution is licensed under the MIT licence of this repository.
