// Paths served by the GlitchTip backend on the same origin as Faultline (see
// docs/research/backend-integration.md §4). docker/Caddyfile mirrors this list.
export const BACKEND_PATHS = [
  '/api',
  '/_allauth',
  '/accounts', // social sign-in callbacks
  '/oauth', // MCP consent page
  '/mcp',
  '/.well-known',
  '/admin',
  '/static', // admin and status page assets
  '/media',
  '/status-pages', // public, server-rendered
  '/v1/logs', // OTLP log ingest
  '/_health',
] as const
