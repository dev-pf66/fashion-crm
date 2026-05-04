// Vercel image proxy. Fetches a Supabase Storage image once, resizes with
// sharp, and serves it with aggressive Cache-Control headers so Vercel's
// edge cache holds it for the whole CDN. Subsequent users hit the edge,
// not Supabase — egress drops dramatically.
//
// Usage from the front-end:
//   /api/img-proxy?url=<encoded supabase url>&w=240&q=70
//
// Only Supabase Storage URLs from this project are accepted to prevent the
// proxy being abused as an open image resizer.

import sharp from 'sharp'

const ALLOWED_HOST = 'rrisbrgagwwerywgvoyk.supabase.co'

export const config = {
  api: {
    responseLimit: '8mb',
  },
}

export default async function handler(req, res) {
  const { url, w = '240', q = '70', fmt = 'webp' } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' })
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return res.status(400).json({ error: 'invalid url' })
  }

  if (parsed.host !== ALLOWED_HOST) {
    return res.status(403).json({ error: 'host not allowed' })
  }

  const width = Math.min(Math.max(parseInt(w, 10) || 240, 16), 2000)
  const quality = Math.min(Math.max(parseInt(q, 10) || 70, 30), 95)
  const format = ['webp', 'jpeg', 'png'].includes(fmt) ? fmt : 'webp'

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream fetch failed' })
    }
    const arrayBuffer = await upstream.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    let pipeline = sharp(inputBuffer).rotate().resize({ width, withoutEnlargement: true })
    if (format === 'webp') pipeline = pipeline.webp({ quality })
    else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true })
    else pipeline = pipeline.png({ quality })

    const out = await pipeline.toBuffer()

    res.setHeader('Content-Type', `image/${format === 'jpeg' ? 'jpeg' : format}`)
    // Long browser cache + long Vercel edge cache. The URL changes only when
    // the underlying file URL changes, so we can be aggressive.
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=31536000, immutable')
    return res.status(200).send(out)
  } catch (err) {
    console.error('img-proxy error:', err)
    return res.status(500).json({ error: err.message || 'proxy failed' })
  }
}
