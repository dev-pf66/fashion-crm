import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.EMAIL_FROM || 'noreply@jadecouture.com'
const appUrl = process.env.APP_URL || 'https://fashion-crm-five.vercel.app'

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Jade CRM <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to send email')
  return data
}

function layout({ bannerColor, bannerTitle, bannerSubtitle, body }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <div style="background: ${bannerColor}; padding: 28px; border-radius: 12px; color: white; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0 0 6px 0; font-size: 24px;">${bannerTitle}</h1>
        <p style="margin: 0; opacity: 0.92; font-size: 14px;">${bannerSubtitle}</p>
      </div>
      ${body}
      <div style="text-align: center; padding: 8px 0 4px;">
        <a href="${appUrl}/my-work" style="background: #1a472a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Open My Work</a>
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
        Jade CRM — rooting for you, keeping the list.
      </p>
    </div>
  `
}

function allClearEmail(person) {
  const firstName = person.name.split(' ')[0]
  return {
    subject: 'Nothing overdue today. Hero behaviour.',
    html: layout({
      bannerColor: 'linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)',
      bannerTitle: 'All clear.',
      bannerSubtitle: "You're living the dream. Keep living it.",
      body: `
        <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 16px; line-height: 1.6;">
          <p style="margin: 0 0 12px 0;">Hi ${firstName},</p>
          <p style="margin: 0 0 12px 0;">Zero overdue pieces. No drama, no excuses, no table of shame below. Just vibes.</p>
          <p style="margin: 0;">The CRM would send a trophy emoji but we're keeping it professional. Consider yourself spiritually high-fived.</p>
        </div>
      `,
    }),
  }
}

function lowOverdueEmail(person, items) {
  const firstName = person.name.split(' ')[0]
  const rows = items.map(s => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.name || s.category || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.silhouette || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.ranges?.name || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #f59e0b; font-weight: 600;">${s.daysOverdue} day${s.daysOverdue > 1 ? 's' : ''}</td>
    </tr>
  `).join('')

  return {
    subject: `${items.length} thing${items.length > 1 ? 's' : ''} would like a word with you`,
    html: layout({
      bannerColor: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
      bannerTitle: `${items.length} nudge${items.length > 1 ? 's' : ''}.`,
      bannerSubtitle: "Nothing a coffee and 20 minutes can't fix.",
      body: `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 16px; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;">Hi ${firstName},</p>
          <p style="margin: 0;">Small list today — <strong>${items.length} overdue piece${items.length > 1 ? 's' : ''}</strong>. Not catastrophic. Not great either. Let's call it character-building.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 16px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">Piece</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">Silhouette</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">Range</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 11px; text-transform: uppercase;">Overdue</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="background: #fff8e1; padding: 14px 16px; border-radius: 10px; border-left: 4px solid #f59e0b; margin: 0 0 16px 0; font-style: italic; line-height: 1.6;">
          If you clear these today, we never have to speak of it again.
        </p>
      `,
    }),
  }
}

function highOverdueEmail(person, items) {
  const firstName = person.name.split(' ')[0]
  const sorted = [...items].sort((a, b) => b.daysOverdue - a.daysOverdue)
  const rows = sorted.map(s => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.name || s.category || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.silhouette || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.ranges?.name || '—'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-weight: 700;">${s.daysOverdue} day${s.daysOverdue > 1 ? 's' : ''}</td>
    </tr>
  `).join('')

  return {
    subject: `We need to talk. (${items.length} overdue)`,
    html: layout({
      bannerColor: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
      bannerTitle: `${items.length} overdue.`,
      bannerSubtitle: "Let's untangle this. Deep breath.",
      body: `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 16px; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;">Hi ${firstName},</p>
          <p style="margin: 0 0 10px 0;">So. <strong>${items.length} overdue pieces.</strong> That's not a number, that's a situation.</p>
          <p style="margin: 0;">Here's the roll call. Please don't shoot the messenger — the messenger is a cron job and has no feelings. The messenger does, however, have receipts:</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 16px 0;">
          <thead>
            <tr style="background: #fef2f2;">
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; color: #991b1b; font-size: 11px; text-transform: uppercase;">Piece</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; color: #991b1b; font-size: 11px; text-transform: uppercase;">Silhouette</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; color: #991b1b; font-size: 11px; text-transform: uppercase;">Range</th>
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #fecaca; color: #991b1b; font-size: 11px; text-transform: uppercase;">Overdue</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="background: #fef2f2; padding: 14px 16px; border-radius: 10px; border-left: 4px solid #dc2626; margin: 0 0 16px 0; line-height: 1.6;">
          Start with the oldest one at the top. You've got this — but also, you've had this for a while.
        </p>
      `,
    }),
  }
}

export default async function handler(req, res) {
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
    // Day of week in IST (UTC+5:30). Cron fires at 03:30 UTC = 09:00 IST.
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const dayOfWeek = istNow.getUTCDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const sendAllClear = dayOfWeek === 1 || dayOfWeek === 5

    const { data: stages } = await adminClient
      .from('production_stages')
      .select('id')
      .eq('name', 'Finishing')
      .single()
    const completedStageId = stages?.id

    // Fetch all assigned (non-completed) pieces for all merchandisers
    let assignedQuery = adminClient
      .from('range_styles')
      .select('id, name, category, silhouette, due_date, assigned_to, ranges!range_id(name)')
      .not('assigned_to', 'is', null)
    if (completedStageId) {
      assignedQuery = assignedQuery.neq('production_stage_id', completedStageId)
    }
    const { data: assignedStyles, error: assignedError } = await assignedQuery
    if (assignedError) throw assignedError

    // Group per person: overdue list + has-any-active-work flag
    const byPerson = {}
    for (const s of (assignedStyles || [])) {
      if (!byPerson[s.assigned_to]) byPerson[s.assigned_to] = { overdue: [], total: 0 }
      byPerson[s.assigned_to].total++
      if (s.due_date && s.due_date < today) {
        const daysOverdue = Math.ceil((new Date(today) - new Date(s.due_date)) / (1000 * 60 * 60 * 24))
        byPerson[s.assigned_to].overdue.push({ ...s, daysOverdue })
      }
    }

    const personIds = Object.keys(byPerson).map(Number)
    if (!personIds.length) {
      return res.status(200).json({ sent: 0, message: 'No active assignments' })
    }

    const { data: people } = await adminClient
      .from('people')
      .select('id, name, email, email_notifications_enabled, is_active')
      .in('id', personIds)

    const results = { allClear: 0, sassy: 0, verySassy: 0, skipped: 0, failed: 0 }

    for (const person of (people || [])) {
      if (!person.email || person.is_active === false || person.email_notifications_enabled === false) {
        results.skipped++
        continue
      }

      const overdue = byPerson[person.id]?.overdue || []
      const count = overdue.length

      let email, template
      if (count === 0) {
        if (!sendAllClear) { results.skipped++; continue }
        email = allClearEmail(person)
        template = 'all_clear'
        results.allClear++
      } else if (count < 10) {
        email = lowOverdueEmail(person, overdue)
        template = 'low_overdue'
        results.sassy++
      } else {
        email = highOverdueEmail(person, overdue)
        template = 'high_overdue'
        results.verySassy++
      }

      let resendId = null
      let status = 'sent'
      let errorMessage = null
      try {
        const sendRes = await sendEmail({ to: person.email, ...email })
        resendId = sendRes?.id || null
      } catch (err) {
        status = 'failed'
        errorMessage = err.message || String(err)
        results.failed++
      }

      try {
        await adminClient.from('email_log').insert([{
          person_id: person.id,
          to_email: person.email,
          subject: email.subject,
          template,
          overdue_count: count,
          status,
          error_message: errorMessage,
          resend_id: resendId,
        }])
      } catch (logErr) {
        console.error('Failed to write email_log row:', logErr)
      }

      // Resend free tier caps at 2 sends/sec. 600ms keeps us comfortably under.
      await new Promise(r => setTimeout(r, 600))
    }

    return res.status(200).json({ dayOfWeek, sendAllClear, ...results })
  } catch (err) {
    console.error('Daily overdue cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
