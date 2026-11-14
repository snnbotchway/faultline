# API fixtures

Real GlitchTip 7.0.0 responses for the seeded demo org (`bun dev/seed.ts`), for unit tests and prototypes.
Refresh them when the backend version changes.

The seed sends two weeks of events and then backdates them inside the local compose backend
(`dev/backdate.py`), so the demo org has new, spiking and ongoing issues, one resolved and one ignored.
For a backend that is not the local compose, run `bun dev/seed.ts <url> --no-backdate` (or set
`SEED_BACKDATE=0`); every issue then shows as new.
