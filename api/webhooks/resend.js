import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const signingSecret = process.env.RESEND_WEBHOOK_SECRET // "whsec_..." from Resend dashboard

// Vercel Node runtime gives us the raw body via req.body as parsed JSON by default.
// Signature verification needs the raw bytes, so we disable body parsing.
export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

// Svix signature format: "v1,<base64 hmac>" (space-separated when multiple)
// Signed payload = `${svix-id}.${svix-timestamp}.${raw body}`
function verifySignature({ id, timestamp, signatureHeader, rawBody, secret }) {
  if (!id || !timestamp || !signatureHeader || !secret) return false
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedPayload = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secretBytes).update(signedPayload).digest('base64')
  // Header can contain multiple versions: "v1,xxx v1,yyy"
  const provided = signatureHeader.split(' ').map(s => s.split(',')[1]).filter(Boolean)
  return provided.some(sig => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(expected, 'base64'))
    } catch {
      return false
    }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!supabaseUrl || !serviceRoleKey) return res.status(500).json({ error: 'Server not configured' })

  const rawBody = await readRawBody(req)

  // Skip verification only if no secret is configured (useful for local testing).
  if (signingSecret) {
    const ok = verifySignature({
      id: req.headers['svix-id'],
      timestamp: req.headers['svix-timestamp'],
      signatureHeader: req.headers['svix-signature'],
      rawBody,
      secret: signingSecret,
    })
    if (!ok) return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try { event = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const type = event.type
  const emailId = event.data?.email_id || event.data?.id
  if (!emailId) return res.status(200).json({ ignored: 'no email id' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date().toISOString()
  let update = null

  if (type === 'email.delivered') {
    update = { delivered_at: now }
  } else if (type === 'email.opened') {
    // Increment open_count and set opened_at if first open.
    const { data: existing } = await admin
      .from('email_log')
      .select('id, opened_at, open_count')
      .eq('resend_id', emailId)
      .maybeSingle()
    if (existing) {
      await admin.from('email_log').update({
        opened_at: existing.opened_at || now,
        open_count: (existing.open_count || 0) + 1,
      }).eq('id', existing.id)
    }
    return res.status(200).json({ ok: true })
  } else if (type === 'email.bounced') {
    update = { bounced_at: now, status: 'failed', error_message: event.data?.bounce?.message || 'bounced' }
  } else if (type === 'email.complained') {
    update = { complained_at: now }
  }

  if (update) {
    await admin.from('email_log').update(update).eq('resend_id', emailId)
  }

  return res.status(200).json({ ok: true, type })
}
