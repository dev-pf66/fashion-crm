// Helper for routing Supabase Storage thumbnails through the /api/img-proxy
// resizer. Cards use small widths (240px), the lightbox uses the original
// URL untouched.
//
// Pass-through for anything that's already a proxied URL or not a Supabase
// Storage URL — keeps the helper safe to drop in everywhere.

const PROXY_PATH = '/api/img-proxy'

export function thumbUrl(url, opts = {}) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('/storage/v1/object/')) return url
  if (url.startsWith(PROXY_PATH) || url.includes(PROXY_PATH)) return url
  const { w = 240, q = 70, fmt = 'webp' } = opts
  const params = new URLSearchParams({
    url,
    w: String(w),
    q: String(q),
    fmt,
  })
  return `${PROXY_PATH}?${params.toString()}`
}
