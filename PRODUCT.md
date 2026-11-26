# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who runs a self-hosted GlitchTip and wants a better interface for it, starting with the maintainer's own instance. The person using it most is a developer working through errors: triaging the inbox at a desk with the keyboard, or opening an alert link on a phone to see what broke. The same people also run the instance's settings (projects, alerts, members, uptime monitors), so admin screens are part of daily use and not an afterthought.

## Product Purpose

Faultline replaces GlitchTip's stock frontend with a dense, fast one built for daily triage, while the backend stays exactly as GlitchTip ships it. It has reached parity with the stock UI (`docs/parity.md`), so a team never has to switch back. Success is other GlitchTip users adopting it: a self-hoster can drop the image in front of their instance and find everything they had, done better.

## Positioning

- One container in front of an unmodified GlitchTip. Faultline serves the app and proxies API, sign-in and ingest on the same origin, so sessions, SDK DSNs and old alert and email links keep working.
- Every issue sits on one shared time axis with release markers, so "what changed" is answered by looking.
- Keyboard first and complete on a phone.

## Operating Context

- Users arrive from GlitchTip's alert emails and notification links, which point at stock URL paths; Faultline keeps those paths so the links open the right screen.
- Installed by self-hosters with `docker run` or a Compose service next to GlitchTip, sometimes under a `BASE_PATH` behind a TLS proxy.
- Tested in CI against a real GlitchTip; `docs/compatibility.md` records which versions each release supports.

## Capabilities and Constraints

- Covers issues, uptime monitors and status pages, performance, logs, releases, alerts, usage, organisation and project settings, and sign-in (including MFA and social logins).
- The GlitchTip backend is never modified. Its API is not a stable contract, so all backend calls live in `src/api/`.
- Routes mirror the stock GlitchTip paths.
- Ships in English, French and Norwegian Bokmål; every string goes through `src/i18n/` in all three.
- Light and dark themes.
- Open decision: whether Faultline adds features the stock UI lacks, beyond parity. Anything it adds must still work against an unmodified backend.

## Brand Commitments

- The name is Faultline. It is an independent project, not affiliated with or endorsed by GlitchTip, and must never imply otherwise.
- Open source under MIT, distributed as `ghcr.io/snnbotchway/faultline`, supported through GitHub Sponsors.
- The visual system and voice ("Fieldbook") are recorded in `DESIGN.md`.

## Evidence on Hand

- Screenshots of the inbox and an issue, desktop and phone, light and dark: `docs/screenshots/`.
- The parity checklist (`docs/parity.md`) and the compatibility record (`docs/compatibility.md`).
- No testimonials, named deployments, user counts or benchmarks exist. Do not invent them.

## Product Principles

1. **Drop-in, never a fork.** If a feature needs a backend change, it does not ship.
2. **Triage speed over breadth.** A screen earns its place by helping someone understand and act on a failure faster.
3. **Old links keep working.** URL compatibility with stock GlitchTip is a feature, not a legacy burden.
4. **Every screen, every language, every device.** Nothing ships in one language, desktop only, or keyboard only.

## Accessibility & Inclusion

Every main screen passes axe with no serious or critical findings, in light and dark (`e2e/accessibility.spec.ts`); a new screen gets a row there. Keyboard, screen reader, speech and touch users are all first-class; `DESIGN.md` holds the specific rules.
