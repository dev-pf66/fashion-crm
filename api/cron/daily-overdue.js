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
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return res.status(500).json({ error: 'Server configuration missing' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const today = new Date().toISOString().split('T')[0]

    // Get completed stage
    const { data: stages } = await adminClient
      .from('production_stages')
      .select('id')
      .eq('name', 'Completed')
      .single()
    const completedStageId = stages?.id

    // Get all overdue assigned pieces (due_date < today AND not completed)
    let query = adminClient
      .from('range_styles')
      .select('id, name, category, silhouette, due_date, assigned_to, ranges!range_id(name)')
      .not('assigned_to', 'is', null)
      .lt('due_date', today)

    if (completedStageId) {
      query = query.neq('production_stage_id', completedStageId)
    }

    const { data: overdueStyles, error: stylesError } = await query
    if (stylesError) throw stylesError

    if (!overdueStyles?.length) {
      return res.status(200).json({ sent: 0, message: 'No overdue items' })
    }

    // Group by merchandiser
    const byPerson = {}
    overdueStyles.forEach(s => {
      if (!byPerson[s.assigned_to]) byPerson[s.assigned_to] = []
      byPerson[s.assigned_to].push(s)
    })

    // Get people with email notifications enabled
    const personIds = Object.keys(byPerson).map(Number)
    const { data: people } = await adminClient
      .from('people')
      .select('id, name, email, email_notifications_enabled')
      .in('id', personIds)

    let sentCount = 0
    for (const person of (people || [])) {
      if (!person.email || person.email_notifications_enabled === false) continue

      const items = byPerson[person.id]
      if (!items?.length) continue

      const itemRows = items.map(s => {
        const daysOverdue = Math.ceil((new Date(today) - new Date(s.due_date)) / (1000 * 60 * 60 * 24))
        return `
          <tr>
            <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0;">${s.name || s.category || '—'}</td>
            <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0;">${s.silhouette || '—'}</td>
            <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0;">${s.ranges?.name || '—'}</td>
            <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; color: #ef4444; font-weight: 600;">${daysOverdue} day${daysOverdue > 1 ? 's' : ''}</td>
          </tr>
        `
      }).join('')

      await sendEmail({
        to: person.email,
        subject: `${items.length} overdue piece${items.length > 1 ? 's' : ''} need attention`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #1e293b; margin-bottom: 0.5rem;">Overdue Brief</h2>
            <p style="color: #64748b; font-size: 0.95rem;">
              Hi ${person.name.split(' ')[0]}, you have <strong style="color: #ef4444;">${items.length}</strong> overdue piece${items.length > 1 ? 's' : ''}:
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 1rem 0;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.75rem; text-transform: uppercase;">Piece</th>
                  <th style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.75rem; text-transform: uppercase;">Silhouette</th>
                  <th style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.75rem; text-transform: uppercase;">Range</th>
                  <th style="padding: 0.5rem 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.75rem; text-transform: uppercase;">Overdue</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
            <a href="${appUrl}/my-work" style="display: inline-block; margin-top: 0.5rem; padding: 0.6rem 1.5rem; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 500;">
              View My Work
            </a>
            <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 2rem;">
              Sourcing CRM — Jade Couture
            </p>
          </div>
        `,
      })
      sentCount++
    }

    return res.status(200).json({ sent: sentCount, overdueTotal: overdueStyles.length })
  } catch (err) {
    console.error('Daily overdue cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
