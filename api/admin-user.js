import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
