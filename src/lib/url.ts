// The address bar treats a host without a scheme as https; so do the fields that take an address.
export const withScheme = (url: string) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`)
