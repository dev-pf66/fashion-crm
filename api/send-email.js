import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.EMAIL_FROM || 'notifications@jadecouture.com'
const appUrl = process.env.APP_URL || 'https://fashion-crm-five.vercel.app'

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Sourcing CRM <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to send email')
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return res.status(500).json({ error: 'Server configuration missing' })
  }

  // Verify the caller is authenticated
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)
  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !caller) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Check caller is admin
  const { data: callerPerson } = await anonClient
    .from('people')
    .select('*, roles(permissions)')
    .eq('user_id', caller.id)
    .single()

  const isAdmin = callerPerson?.roles?.permissions?.includes('admin.access') || callerPerson?.role === 'admin'
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { action } = req.body

  try {
    if (action === 'assignment_notification') {
      const { merchandiser_id, piece_count, assigner_name } = req.body

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: person } = await adminClient
        .from('people')
        .select('name, email, email_notifications_enabled')
        .eq('id', merchandiser_id)
        .single()

      if (!person?.email || person.email_notifications_enabled === false) {
        return res.status(200).json({ skipped: true, reason: 'Email notifications disabled or no email' })
      }

      await sendEmail({
        to: person.email,
        subject: `New pieces assigned to you`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #1e293b; margin-bottom: 0.5rem;">New Assignment</h2>
            <p style="color: #64748b; font-size: 0.95rem;">
              Hi ${person.name.split(' ')[0]},
            </p>
            <p style="color: #334155; font-size: 0.95rem;">
              <strong>${assigner_name}</strong> has assigned <strong>${piece_count} piece${piece_count > 1 ? 's' : ''}</strong> to you.
            </p>
            <a href="${appUrl}/my-work" style="display: inline-block; margin-top: 1rem; padding: 0.6rem 1.5rem; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500;">
              View My Work
            </a>
            <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 2rem;">
              Sourcing CRM — Jade Couture
            </p>
          </div>
        `,
      })

      return res.status(200).json({ sent: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
