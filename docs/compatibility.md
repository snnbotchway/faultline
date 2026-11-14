# Compatibility

Faultline talks to an unmodified GlitchTip backend. GlitchTip's API is not a stable public contract,
so each Faultline release lists the backend versions its end-to-end suite ran against.

| Faultline | GlitchTip backend | Tested in CI |
|---|---|---|
| unreleased (`main`) | 7.0.0 | yes |

## How a version gets tested

1. Add the version to the `e2e` matrix in `.github/workflows/ci.yml`.
2. Refresh the vendored schemas against it: `GLITCHTIP_VERSION=<version> bun run backend:up`, then `bun run api:schema`.
3. `bun run typecheck` shows every place an API shape changed. Fix them in `src/api/`, which is the only code that calls the backend.
4. Update this table.
