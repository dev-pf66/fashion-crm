import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.EMAIL_FROM || 'noreply@jadecouture.com'
const appUrl = process.env.APP_URL || 'https://fashion-crm-five.vercel.app'

async function sendWelcomeEmail({ to, name, password }) {
  if (!resendApiKey) return
  const firstName = name.split(' ')[0]
  const loginUrl = `${appUrl}/login`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%); padding: 32px; border-radius: 12px; color: white; text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0 0 8px 0; font-size: 26px;">Welcome to Jade CRM</h1>
        <p style="margin: 0; opacity: 0.9; font-size: 15px;">Your account is ready, ${firstName}.</p>
      </div>
      <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 16px;">
        <p style="margin: 0 0 16px 0; line-height: 1.6;">Use the credentials below to log in for the first time:</p>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 14px;">
          <div style="margin-bottom: 8px;"><strong style="color: #6b7280;">Email:</strong> ${to}</div>
          <div><strong style="color: #6b7280;">Password:</strong> ${password}</div>
        </div>
      </div>
      <div style="text-align: center; padding: 8px 0 16px;">
        <a href="${loginUrl}" style="background: #1a472a; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Log in to Jade CRM</a>
      </div>
      <p style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 16px;">
        Please change your password after your first login.<br>
        Questions? Reply to this email or ask an admin.
      </p>
    </div>
  `
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Jade CRM <${fromEmail}>`,
        to: [to],
        subject: 'Welcome to Jade CRM — your login details',
        html,
      }),
    })
  } catch (err) {
    console.error('Welcome email failed:', err.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration missing' })
  }

  // Verify the caller is authenticated and is an admin
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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { action } = req.body

  try {
    if (action === 'create_user') {
      const { email, password, name, role_id } = req.body
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' })
      }

      // Create auth user
      const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError) {
        return res.status(400).json({ error: createError.message })
      }

      // Create or update people record
      const { data: person, error: personError } = await adminClient
        .from('people')
        .upsert({
          email,
          name,
          user_id: authData.user.id,
          role_id: role_id ? parseInt(role_id) : null,
          is_active: true,
        }, { onConflict: 'email' })
        .select('*, roles(id, name)')
        .single()

      if (personError) {
        return res.status(400).json({ error: personError.message })
      }

      await sendWelcomeEmail({ to: email, name, password })

      return res.status(200).json({ user: authData.user, person })
    }

    if (action === 'reset_password') {
      const { user_id, new_password } = req.body
      if (!user_id || !new_password) {
        return res.status(400).json({ error: 'User ID and new password are required' })
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      })
      if (resetError) {
        return res.status(400).json({ error: resetError.message })
      }

      return res.status(200).json({ success: true })
    }

    if (action === 'list_users') {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
      if (listError) {
        return res.status(400).json({ error: listError.message })
      }

      return res.status(200).json({ users })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
