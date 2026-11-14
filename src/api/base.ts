// The path Faultline is served under: '' at the root, '/faultline' for a deployment under /faultline/.
// The build's base is a placeholder that docker/entrypoint.sh replaces when the image starts.
export const basePathOf = (baseUrl: string) => baseUrl.replace(/\/$/, '')

export const BASE_PATH = basePathOf(import.meta.env.BASE_URL)

// An address on this origin for the browser to load itself: a backend page, a form target, a link out of the app.
export const withBase = (path: string) => `${BASE_PATH}${path}`

/**
 * An absolute address the backend built, with the base exactly once. GlitchTip joins GLITCHTIP_DOMAIN, which
 * carries the base, to routes that carry it too, so some of its addresses have it twice.
 */
export function backendAddress(address: string, base = BASE_PATH) {
  if (!base) return address
  const url = new URL(address)
  let path = url.pathname
  while (path.startsWith(`${base}/`)) path = path.slice(base.length)
  return `${url.origin}${base}${path}${url.search}`
}
