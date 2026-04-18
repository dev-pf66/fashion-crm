import { createClient } from '@supabase/supabase-js'
import { maskSupplierName } from './constants'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\s+/g, '')
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/\s+/g, '')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    flowType: 'implicit',
  },
})

// ============================================================
// ADMIN USER MANAGEMENT (via serverless function)
// ============================================================

async function adminApiCall(body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const res = await fetch('/api/admin-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function adminCreateUser({ email, password, name, role_id }) {
  return adminApiCall({ action: 'create_user', email, password, name, role_id })
}

export async function adminResetPassword(user_id, new_password) {
  return adminApiCall({ action: 'reset_password', user_id, new_password })
}

export async function adminListAuthUsers() {
  return adminApiCall({ action: 'list_users' })
}

// ============================================================
// EMAIL NOTIFICATIONS
// ============================================================

async function emailApiCall(body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return // silently skip if not authenticated

  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('Email notification failed:', err)
  }
}

export async function sendAssignmentEmail(merchandiserId, pieceCount, assignerName) {
  return emailApiCall({
    action: 'assignment_notification',
    merchandiser_id: merchandiserId,
    piece_count: pieceCount,
    assigner_name: assignerName,
  })
}

export async function updateEmailNotifications(personId, enabled) {
  const { error } = await supabase
    .from('people')
    .update({ email_notifications_enabled: enabled })
    .eq('id', personId)
  if (error) throw error
}

// ============================================================
// PEOPLE
// ============================================================

export async function getPeople() {
  const { data, error } = await supabase.from('people').select('*, roles(id, name, permissions)').order('name')
  if (error) throw error
  return data
}

export async function getRoles() {
  const { data, error } = await supabase.from('roles').select('*').order('name')
  if (error) throw error
  return data
}

// Silhouettes
export async function getSilhouettes(category) {
  let query = supabase.from('silhouettes').select('*').order('sort_order')
  if (category) query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createSilhouette(silhouette) {
  const { data, error } = await supabase.from('silhouettes').insert([silhouette]).select().single()
  if (error) throw error
  return data
}

export async function updateSilhouette(id, updates) {
  const { data, error } = await supabase.from('silhouettes').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSilhouette(id) {
  const { error } = await supabase.from('silhouettes').delete().eq('id', id)
  if (error) throw error
}

// Price Brackets
export async function getPriceBrackets() {
  const { data, error } = await supabase.from('price_brackets').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function createPriceBracket(bracket) {
  const { data, error } = await supabase.from('price_brackets').insert([bracket]).select().single()
  if (error) throw error
  return data
}

export async function updatePriceBracket(id, updates) {
  const { data, error } = await supabase.from('price_brackets').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePriceBracket(id) {
  const { error } = await supabase.from('price_brackets').delete().eq('id', id)
  if (error) throw error
}

// Production Stages
export async function getProductionStages() {
  const { data, error } = await supabase.from('production_stages').select('*').order('sort_order')
  if (error) throw error
  return data
}

export async function createProductionStage(stage) {
  const { data, error } = await supabase.from('production_stages').insert([stage]).select().single()
  if (error) throw error
  return data
}

export async function updateProductionStage(id, updates) {
  const { data, error } = await supabase.from('production_stages').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProductionStage(id) {
  const { error } = await supabase.from('production_stages').delete().eq('id', id)
  if (error) throw error
}

// Production Status Log
export async function logProductionStatusChange({ style_id, changed_by, old_stage_id, new_stage_id, old_stage_name, new_stage_name }) {
  const { error } = await supabase.from('production_status_log').insert([{
    style_id, changed_by, old_stage_id, new_stage_id, old_stage_name, new_stage_name
  }])
  if (error) throw error
}

export async function getProductionStatusLog(styleId) {
  const { data, error } = await supabase
    .from('production_status_log')
    .select('*, person:changed_by(id, name)')
    .eq('style_id', styleId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// DASHBOARD TARGETS
// ============================================================

export async function getDashboardTargets(rangeId) {
  const { data, error } = await supabase
    .from('dashboard_targets')
    .select('*')
    .eq('range_id', rangeId)
  if (error) throw error
  return data
}

export async function upsertDashboardTarget({ range_id, target_type, target_key, target_value, updated_by }) {
  const { data, error } = await supabase
    .from('dashboard_targets')
    .upsert({
      range_id,
      target_type,
      target_key: target_key || '_total',
      target_value,
      updated_by,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'range_id,target_type,target_key' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRangeDashboardData(rangeId) {
  const [stylesRes, targetsRes, stagesRes] = await Promise.all([
    supabase
      .from('range_styles')
      .select('id, name, category, silhouette, embroidery, price_category, assigned_to, production_stage_id, due_date, thumbnail_url, assignee:assigned_to(id, name), stage:production_stage_id(id, name, color, sort_order)')
      .eq('range_id', rangeId),
    supabase
      .from('dashboard_targets')
      .select('*')
      .eq('range_id', rangeId),
    supabase
      .from('production_stages')
      .select('*')
      .order('sort_order'),
  ])
  if (stylesRes.error) throw stylesRes.error
  if (targetsRes.error) throw targetsRes.error
  if (stagesRes.error) throw stagesRes.error
  return {
    styles: stylesRes.data || [],
    targets: targetsRes.data || [],
    stages: stagesRes.data || [],
  }
}

export async function getPersonByEmail(email) {
  const { data, error } = await supabase.from('people').select('*').eq('email', email).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getPersonByUserId(userId) {
  const { data, error } = await supabase.from('people').select('*').eq('user_id', userId).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createPerson(person) {
  const { data, error } = await supabase.from('people').insert([person]).select().single()
  if (error) throw error
  return data
}

export async function updatePerson(id, updates) {
  const { data, error } = await supabase.from('people').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// SEASONS
// ============================================================

export async function getDivisions() {
  const { data, error } = await supabase.from('divisions').select('*').order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createDivision(division) {
  const { data, error } = await supabase.from('divisions').insert([division]).select().single()
  if (error) throw error
  return data
}

export async function updateDivision(id, updates) {
  const { data, error } = await supabase.from('divisions').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ============================================================
// SUPPLIERS
// ============================================================

export async function getSuppliers(filters = {}) {
  let query = supabase.from('suppliers').select('*').order('name')
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.country) query = query.eq('country', filters.country)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getSupplier(id) {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createSupplier(supplier) {
  const { data, error } = await supabase.from('suppliers').insert([{ ...supplier, updated_at: new Date().toISOString() }]).select().single()
  if (error) throw error
  return data
}

export async function updateSupplier(id, updates) {
  const { data, error } = await supabase.from('suppliers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// MATERIALS
// ============================================================

export async function getMaterials(filters = {}) {
  let query = supabase.from('materials').select('*, suppliers(id, name)').eq('is_active', true).order('name')
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getMaterial(id) {
  const { data, error } = await supabase.from('materials').select('*, suppliers(id, name)').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createMaterial(material) {
  const { data, error } = await supabase.from('materials').insert([material]).select('*, suppliers(id, name)').single()
  if (error) throw error
  return data
}

export async function updateMaterial(id, updates) {
  const { data, error } = await supabase.from('materials').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*, suppliers(id, name)').single()
  if (error) throw error
  return data
}

export async function deleteMaterial(id) {
  const { error } = await supabase.from('materials').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ============================================================
// STYLES
// ============================================================

export async function getStyles(divisionId, filters = {}) {
  let query = supabase
    .from('styles')
    .select('*, suppliers(id, name, country), people:assigned_to(id, name)')
    .eq('division_id', divisionId)
    .order('style_number')
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,style_number.ilike.%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getStyle(id) {
  const { data, error } = await supabase
    .from('styles')
    .select('*, suppliers(id, name, country, code), people:assigned_to(id, name, email)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createStyle(style) {
  const { data, error } = await supabase
    .from('styles')
    .insert([style])
    .select('*, suppliers(id, name, country), people:assigned_to(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function updateStyle(id, updates) {
  const { data, error } = await supabase
    .from('styles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, suppliers(id, name, country), people:assigned_to(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteStyle(id) {
  const { error } = await supabase.from('styles').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// BOM ITEMS
// ============================================================

export async function getBomItems(styleId) {
  const { data, error } = await supabase
    .from('bom_items')
    .select('*, materials(id, name, code, swatch_image_url), suppliers(id, name)')
    .eq('style_id', styleId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createBomItem(item) {
  const { data, error } = await supabase
    .from('bom_items')
    .insert([item])
    .select('*, materials(id, name, code, swatch_image_url), suppliers(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function updateBomItem(id, updates) {
  const { data, error } = await supabase
    .from('bom_items')
    .update(updates)
    .eq('id', id)
    .select('*, materials(id, name, code, swatch_image_url), suppliers(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteBomItem(id) {
  const { error } = await supabase.from('bom_items').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// SAMPLES
// ============================================================

export async function getSamples(divisionId) {
  const { data, error } = await supabase
    .from('samples')
    .select('*, styles!inner(id, name, style_number, thumbnail_url, division_id), suppliers(id, name), people:assigned_to(id, name)')
    .eq('styles.division_id', divisionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSamplesForStyle(styleId) {
  const { data, error } = await supabase
    .from('samples')
    .select('*, suppliers(id, name), people:assigned_to(id, name)')
    .eq('style_id', styleId)
    .order('round_number')
  if (error) throw error
  return data
}

export async function getSample(id) {
  const { data, error } = await supabase
    .from('samples')
    .select('*, styles(id, name, style_number, thumbnail_url), suppliers(id, name), people:assigned_to(id, name), reviewer:reviewed_by(id, name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSample(sample) {
  const { data, error } = await supabase
    .from('samples')
    .insert([sample])
    .select('*, styles(id, name, style_number, thumbnail_url), suppliers(id, name), people:assigned_to(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function updateSample(id, updates) {
  const { data, error } = await supabase
    .from('samples')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, styles(id, name, style_number, thumbnail_url), suppliers(id, name), people:assigned_to(id, name), reviewer:reviewed_by(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteSample(id) {
  const { error } = await supabase.from('samples').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(divisionId) {
  const [styles, samples, pos] = await Promise.all([
    supabase.from('styles').select('id, status').eq('division_id', divisionId),
    supabase.from('samples').select('id, status, round, style_id, styles!inner(division_id)').eq('styles.division_id', divisionId),
    supabase.from('purchase_orders').select('id, status').eq('division_id', divisionId),
  ])
  if (styles.error) throw styles.error
  if (samples.error) throw samples.error
  if (pos.error) throw pos.error

  // Group styles by status
  const stylesByStatus = {}
  ;(styles.data || []).forEach(s => {
    stylesByStatus[s.status] = (stylesByStatus[s.status] || 0) + 1
  })

  // Group samples by round
  const samplesByRound = {}
  ;(samples.data || []).forEach(s => {
    samplesByRound[s.round] = (samplesByRound[s.round] || 0) + 1
  })

  return {
    totalStyles: (styles.data || []).length,
    inDevelopment: (styles.data || []).filter(s => ['concept', 'development', 'sampling', 'costing'].includes(s.status)).length,
    samplesForReview: (samples.data || []).filter(s => s.status === 'received').length,
    openPos: (pos.data || []).filter(p => ['issued', 'confirmed', 'in_production'].includes(p.status)).length,
    stylesByStatus,
    samplesByRound,
  }
}

// ============================================================
// PURCHASE ORDERS
// ============================================================

export async function getPurchaseOrders(divisionId, filters = {}) {
  let query = supabase
    .from('purchase_orders')
    .select('*, suppliers(id, name), people:assigned_to(id, name)')
    .eq('division_id', divisionId)
    .order('created_at', { ascending: false })
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id)
  if (filters.search) query = query.or(`po_number.ilike.%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPurchaseOrder(id) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(id, name, country, code), people:assigned_to(id, name, email)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createPurchaseOrder(po) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([po])
    .select('*, suppliers(id, name), people:assigned_to(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function updatePurchaseOrder(id, updates) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, suppliers(id, name), people:assigned_to(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function deletePurchaseOrder(id) {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// PO LINE ITEMS
// ============================================================

export async function getPOLineItems(poId) {
  const { data, error } = await supabase
    .from('po_line_items')
    .select('*, styles(id, name, style_number)')
    .eq('purchase_order_id', poId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createPOLineItem(item) {
  const { data, error } = await supabase
    .from('po_line_items')
    .insert([item])
    .select('*, styles(id, name, style_number)')
    .single()
  if (error) throw error
  return data
}

export async function updatePOLineItem(id, updates) {
  const { data, error } = await supabase
    .from('po_line_items')
    .update(updates)
    .eq('id', id)
    .select('*, styles(id, name, style_number)')
    .single()
  if (error) throw error
  return data
}

export async function deletePOLineItem(id) {
  const { error } = await supabase.from('po_line_items').delete().eq('id', id)
  if (error) throw error
}

export async function updatePOTotals(poId) {
  const { data: items, error } = await supabase
    .from('po_line_items')
    .select('quantity, total_price')
    .eq('purchase_order_id', poId)
  if (error) throw error

  const total_qty = (items || []).reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0)
  const total_amount = (items || []).reduce((sum, i) => sum + (parseFloat(i.total_price) || 0), 0)

  await supabase.from('purchase_orders').update({ total_qty, total_amount }).eq('id', poId)
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export async function getActivityLog(divisionId, filters = {}) {
  let query = supabase
    .from('activity_log')
    .select('*, people(id, name)')
    .order('created_at', { ascending: false })
  if (divisionId) query = query.eq('division_id', divisionId)
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
  if (filters.person_id) query = query.eq('person_id', filters.person_id)
  if (filters.limit) query = query.limit(filters.limit)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAuditLog({ personId, action, entityType, since, limit = 200 } = {}) {
  let query = supabase
    .from('activity_log')
    .select('id, created_at, person_id, action, entity_type, entity_id, details, before_data, after_data, people(id, name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (personId) query = query.eq('person_id', personId)
  if (action) query = query.eq('action', action)
  if (entityType) query = query.eq('entity_type', entityType)
  if (since) query = query.gte('created_at', since)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getLastActivityPerPerson() {
  const { data, error } = await supabase
    .from('activity_log')
    .select('person_id, created_at, action, entity_type')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) throw error
  const seen = {}
  for (const row of (data || [])) {
    if (!row.person_id) continue
    if (!seen[row.person_id]) seen[row.person_id] = row
  }
  return seen
}

// ============================================================
// DASHBOARD ENHANCEMENTS
// ============================================================

export async function getUpcomingDeadlines(divisionId, personName) {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 86400000)
  const nowStr = now.toISOString().slice(0, 10)
  const futureStr = weekFromNow.toISOString().slice(0, 10)

  const [samples, pos] = await Promise.all([
    supabase
      .from('samples')
      .select('id, expected_date, round, round_number, colorway, status, styles!inner(id, name, style_number, division_id)')
      .eq('styles.division_id', divisionId)
      .gte('expected_date', nowStr)
      .lte('expected_date', futureStr)
      .not('status', 'in', '("approved","rejected")')
      .order('expected_date'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, delivery_date, status, suppliers(id, name)')
      .eq('division_id', divisionId)
      .gte('delivery_date', nowStr)
      .lte('delivery_date', futureStr)
      .not('status', 'in', '("received","cancelled")')
      .order('delivery_date'),
  ])

  const deadlines = []

  ;(samples.data || []).forEach(s => {
    deadlines.push({
      type: 'sample',
      id: s.id,
      label: `${s.styles?.style_number || ''} - ${s.round} #${s.round_number}`,
      date: s.expected_date,
      status: s.status,
    })
  })

  ;(pos.data || []).forEach(p => {
    deadlines.push({
      type: 'po',
      id: p.id,
      label: `${p.po_number} - ${p.suppliers?.name ? maskSupplierName(p.suppliers.name, adminAccess) : ''}`,
      date: p.delivery_date,
      status: p.status,
    })
  })

  deadlines.sort((a, b) => new Date(a.date) - new Date(b.date))
  return deadlines
}

// ============================================================
// GLOBAL SEARCH
// ============================================================

export async function globalSearch(query, divisionId, adminAccess) {
  const q = query.toLowerCase()
  const results = []

  const [styles, suppliers, pos, people, tasks] = await Promise.all([
    divisionId
      ? supabase.from('styles').select('id, name, style_number, status, category, suppliers(name), people:assigned_to(name)').eq('division_id', divisionId).or(`name.ilike.%${q}%,style_number.ilike.%${q}%`).limit(5)
      : { data: [] },
    supabase.from('suppliers').select('id, name, code, country, status').or(`name.ilike.%${q}%,code.ilike.%${q}%`).limit(5),
    divisionId
      ? supabase.from('purchase_orders').select('id, po_number, status, suppliers(name), people:assigned_to(name)').eq('division_id', divisionId).ilike('po_number', `%${q}%`).limit(5)
      : { data: [] },
    supabase.from('people').select('id, name, email, role').ilike('name', `%${q}%`).limit(5),
    supabase.from('tasks').select('id, title, status, priority, people:assigned_to(name)').ilike('title', `%${q}%`).limit(5),
  ])

  ;(styles.data || []).forEach(s => {
    results.push({ type: 'style', id: s.id, label: `${s.style_number} - ${s.name}`, sub: s.suppliers?.name ? maskSupplierName(s.suppliers.name, adminAccess) : (s.category || '') })
  })
  ;(suppliers.data || []).forEach(s => {
    results.push({ type: 'supplier', id: s.id, label: maskSupplierName(s.name, adminAccess), sub: [s.code, s.country].filter(Boolean).join(' · ') })
  })
  ;(pos.data || []).forEach(p => {
    results.push({ type: 'purchase_order', id: p.id, label: p.po_number, sub: p.suppliers?.name ? maskSupplierName(p.suppliers.name, adminAccess) : '' })
  })
  ;(people.data || []).forEach(p => {
    results.push({ type: 'person', id: p.id, label: p.name, sub: p.role || p.email || '' })
  })
  ;(tasks.data || []).forEach(t => {
    results.push({ type: 'task', id: t.id, label: t.title, sub: t.people?.name || t.status || '' })
  })

  return results
}

// ============================================================
// STYLE COSTINGS
// ============================================================

export async function getStyleCosting(styleId) {
  const { data, error } = await supabase
    .from('style_costings')
    .select('*')
    .eq('style_id', styleId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertStyleCosting(styleId, costingData) {
  // Try update first
  const existing = await getStyleCosting(styleId)
  if (existing) {
    const { data, error } = await supabase
      .from('style_costings')
      .update({ ...costingData, updated_at: new Date().toISOString() })
      .eq('style_id', styleId)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('style_costings')
      .insert([{ style_id: styleId, ...costingData }])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================================
// COMPLIANCE TESTS
// ============================================================

export async function getComplianceTests(styleId) {
  const { data, error } = await supabase
    .from('compliance_tests')
    .select('*, people:submitted_by(id, name)')
    .eq('style_id', styleId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createComplianceTest(test) {
  const { data, error } = await supabase
    .from('compliance_tests')
    .insert([test])
    .select('*, people:submitted_by(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function updateComplianceTest(id, updates) {
  const { data, error } = await supabase
    .from('compliance_tests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, people:submitted_by(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteComplianceTest(id) {
  const { error } = await supabase.from('compliance_tests').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// COMMENTS
// ============================================================

export async function getComments(entityType, entityId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, people:person_id(id, name, email)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createComment(comment) {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment])
    .select('*, people:person_id(id, name, email)')
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// CALENDAR DATA
// ============================================================

export async function getCalendarEvents(divisionId, startDate, endDate) {
  const events = []

  const [samples, pos, styles, tasks] = await Promise.all([
    supabase
      .from('samples')
      .select('id, expected_date, round, round_number, status, colorway, styles!inner(id, name, style_number, division_id)')
      .eq('styles.division_id', divisionId)
      .gte('expected_date', startDate)
      .lte('expected_date', endDate)
      .not('status', 'in', '("approved","rejected")'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, status, delivery_date, ex_factory_date, suppliers(id, name)')
      .eq('division_id', divisionId),
    supabase
      .from('styles')
      .select('id, style_number, name, development_start, target_delivery, status')
      .eq('division_id', divisionId),
    supabase
      .from('tasks')
      .select('id, title, due_date, status, priority, people:assigned_to(id, name)')
      .not('due_date', 'is', null)
      .gte('due_date', startDate)
      .lte('due_date', endDate),
  ])

  ;(samples.data || []).forEach(s => {
    if (s.expected_date) {
      events.push({
        id: `sample-${s.id}`,
        date: s.expected_date,
        title: `${s.styles?.style_number} ${s.round} #${s.round_number}`,
        type: 'sample',
        status: s.status,
        link: '/samples',
      })
    }
  })

  ;(pos.data || []).forEach(p => {
    if (p.ex_factory_date && p.ex_factory_date >= startDate && p.ex_factory_date <= endDate) {
      events.push({
        id: `po-exf-${p.id}`,
        date: p.ex_factory_date,
        title: `${p.po_number} Ex-Factory`,
        type: 'po_exfactory',
        status: p.status,
        link: `/orders/${p.id}`,
      })
    }
    if (p.delivery_date && p.delivery_date >= startDate && p.delivery_date <= endDate) {
      events.push({
        id: `po-del-${p.id}`,
        date: p.delivery_date,
        title: `${p.po_number} Delivery`,
        type: 'po_delivery',
        status: p.status,
        link: `/orders/${p.id}`,
      })
    }
  })

  ;(styles.data || []).forEach(s => {
    if (s.development_start && s.development_start >= startDate && s.development_start <= endDate) {
      events.push({
        id: `style-dev-${s.id}`,
        date: s.development_start,
        title: `${s.style_number} Dev Start`,
        type: 'style_dev',
        status: s.status,
        link: `/styles/${s.id}`,
      })
    }
    if (s.target_delivery && s.target_delivery >= startDate && s.target_delivery <= endDate) {
      events.push({
        id: `style-del-${s.id}`,
        date: s.target_delivery,
        title: `${s.style_number} Target Delivery`,
        type: 'style_delivery',
        status: s.status,
        link: `/styles/${s.id}`,
      })
    }
  })

  ;(tasks.data || []).forEach(t => {
    if (t.due_date) {
      events.push({
        id: `task-${t.id}`,
        date: t.due_date,
        title: t.title,
        type: 'task',
        status: t.status,
        link: '/tasks',
      })
    }
  })

  events.sort((a, b) => a.date.localeCompare(b.date))
  return events
}

// ============================================================
// STYLE REQUESTS
// ============================================================

export async function getStyleRequests(divisionId) {
  let query = supabase
    .from('style_requests')
    .select('*, people:submitted_by(id, name, email)')
    .order('created_at', { ascending: false })
  if (divisionId) query = query.eq('division_id', divisionId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createStyleRequest(request) {
  const { data, error } = await supabase
    .from('style_requests')
    .insert([request])
    .select('*, people:submitted_by(id, name, email)')
    .single()
  if (error) throw error
  return data
}

export async function updateStyleRequest(id, updates) {
  const { data, error } = await supabase
    .from('style_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, people:submitted_by(id, name, email)')
    .single()
  if (error) throw error
  return data
}

export async function deleteStyleRequest(id) {
  const { error } = await supabase.from('style_requests').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// RANGE PLANNING
// ============================================================

export async function getRanges(divisionId) {
  let query = supabase
    .from('ranges')
    .select('*, range_styles(id, category, status, production_qty)')
    .order('created_at', { ascending: false })
  if (divisionId) query = query.eq('division_id', divisionId)
  const { data, error } = await query
  if (error) throw error
  // Fetch creator names separately
  if (data?.length) {
    const creatorIds = [...new Set(data.map(r => r.created_by).filter(Boolean))]
    if (creatorIds.length) {
      const { data: people } = await supabase.from('people').select('id, name').in('id', creatorIds)
      const peopleMap = Object.fromEntries((people || []).map(p => [p.id, p]))
      data.forEach(r => { r.creator = peopleMap[r.created_by] || null })
    }
  }
  return data
}

export async function getRange(id) {
  const { data, error } = await supabase
    .from('ranges')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  if (data?.created_by) {
    const { data: person } = await supabase.from('people').select('id, name').eq('id', data.created_by).single()
    data.creator = person || null
  }
  return data
}

export async function createRange(range) {
  const { data, error } = await supabase
    .from('ranges')
    .insert([range])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRange(id, updates) {
  const { data, error } = await supabase
    .from('ranges')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRange(id) {
  const { error } = await supabase.from('ranges').delete().eq('id', id)
  if (error) throw error
}

export async function getRangeStyles(rangeId) {
  const { data, error } = await supabase
    .from('range_styles')
    .select('*, suppliers:supplier_id(id, name), assignee:assigned_to(id, name)')
    .eq('range_id', rangeId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function getMyAssignedStyles(personId) {
  const { data, error } = await supabase
    .from('range_styles')
    .select('*, ranges!range_id(id, name, division), assignee:assigned_to(id, name), stage:production_stage_id(id, name, color, sort_order)')
    .eq('assigned_to', personId)
    .order('range_id')
  if (error) throw error
  return data
}

export async function getAllAssignedStyles() {
  const { data, error } = await supabase
    .from('range_styles')
    .select('*, ranges!range_id(id, name, division), assignee:assigned_to(id, name), stage:production_stage_id(id, name, color, sort_order)')
    .not('assigned_to', 'is', null)
    .order('assigned_to')
  if (error) throw error
  return data
}

export async function assignStyleTo(styleId, personId) {
  const { error } = await supabase.from('range_styles').update({ assigned_to: personId }).eq('id', styleId)
  if (error) throw error
}

export async function bulkAssignStyles(styleIds, personId) {
  const { error } = await supabase.from('range_styles').update({ assigned_to: personId }).in('id', styleIds)
  if (error) throw error
}

export async function getRangeStyle(id) {
  const { data, error } = await supabase
    .from('range_styles')
    .select('*, range_style_files(*), suppliers:supplier_id(id, name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createRangeStyle(style) {
  const { data, error } = await supabase
    .from('range_styles')
    .insert([style])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRangeStyle(id, updates) {
  const { data, error } = await supabase
    .from('range_styles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRangeStyle(id) {
  const { error } = await supabase.from('range_styles').delete().eq('id', id)
  if (error) throw error
}

export async function updateRangeStyleOrder(items) {
  const promises = items.map(({ id, sort_order }) =>
    supabase.from('range_styles').update({ sort_order }).eq('id', id)
  )
  await Promise.all(promises)
}

export async function getRangeStyleFiles(styleId) {
  const { data, error } = await supabase
    .from('range_style_files')
    .select('*')
    .eq('style_id', styleId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRangeStyleFile(file) {
  const { data, error } = await supabase
    .from('range_style_files')
    .insert([file])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRangeStyleFile(id) {
  const { error } = await supabase.from('range_style_files').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getNotifications(personId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error

  // Fetch from_person names
  const fromIds = [...new Set((data || []).map(n => n.from_person_id).filter(Boolean))]
  let peopleMap = {}
  if (fromIds.length > 0) {
    const { data: ppl } = await supabase.from('people').select('id, name').in('id', fromIds)
    if (ppl) ppl.forEach(p => { peopleMap[p.id] = p })
  }

  return (data || []).map(n => ({
    ...n,
    from_person: peopleMap[n.from_person_id] || null,
  }))
}

export async function createNotification(notification) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notification])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(personId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('person_id', personId)
    .eq('read', false)
  if (error) throw error
}

// ============================================================
// OVERDUE ITEMS
// ============================================================

// ============================================================
// TASKS
// ============================================================

const TASK_SELECT = '*, people:assigned_to(id, name), creator:created_by(id, name), styles:style_id(id, name, style_number), suppliers:supplier_id(id, name), purchase_orders:purchase_order_id(id, po_number), ranges:range_id(id, name), collaborators'

export async function getTasks(filters = {}) {
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (filters.division_id) query = query.eq('division_id', filters.division_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTask(id) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createTask(task) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select(TASK_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(TASK_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function updateTaskOrder(items) {
  const promises = items.map(({ id, sort_order }) =>
    supabase.from('tasks').update({ sort_order }).eq('id', id)
  )
  await Promise.all(promises)
}

// ============================================================
// TASK SUBTASKS
// ============================================================

export async function getTaskSubtasks(taskId) {
  const { data, error } = await supabase
    .from('task_subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return data
}

export async function createTaskSubtask(subtask) {
  const { data, error } = await supabase
    .from('task_subtasks')
    .insert([subtask])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTaskSubtask(id, updates) {
  const { data, error } = await supabase
    .from('task_subtasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTaskSubtask(id) {
  const { error } = await supabase.from('task_subtasks').delete().eq('id', id)
  if (error) throw error
}

export async function getTasksForRange(rangeId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('range_id', rangeId)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function resolveCollaborators(collaboratorIds) {
  if (!collaboratorIds?.length) return []
  const { data, error } = await supabase
    .from('people')
    .select('id, name')
    .in('id', collaboratorIds)
  if (error) throw error
  return data || []
}

export async function getTaskSubtaskCounts() {
  const { data, error } = await supabase
    .from('task_subtasks')
    .select('task_id, completed')
  if (error) throw error
  const counts = {}
  ;(data || []).forEach(s => {
    if (!counts[s.task_id]) counts[s.task_id] = { total: 0, done: 0 }
    counts[s.task_id].total++
    if (s.completed) counts[s.task_id].done++
  })
  return counts
}

// ============================================================
// TASK METRICS
// ============================================================

export async function getTaskMetrics() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, status, due_date')
  if (error) throw error
  const now = new Date().toISOString().slice(0, 10)
  const tasks = data || []
  return {
    total: tasks.length,
    overdue: tasks.filter(t => t.due_date && t.due_date < now && t.status !== 'done').length,
    dueToday: tasks.filter(t => t.due_date === now && t.status !== 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }
}

// ============================================================
// OVERDUE ITEMS
// ============================================================

// ============================================================
// ADMIN COMMAND CENTER
// ============================================================

export async function getRangeProgress() {
  const { data, error } = await supabase
    .from('ranges')
    .select('id, name, status, range_styles(id, category, status, delivery_drop)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(range => {
    const styles = range.range_styles || []
    const byStatus = {}
    const dropMap = {}
    styles.forEach(s => {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
      if (s.delivery_drop) {
        if (!dropMap[s.delivery_drop]) dropMap[s.delivery_drop] = { name: s.delivery_drop, styles: [] }
        dropMap[s.delivery_drop].styles.push(s)
      }
    })
    const totalStyles = styles.length
    const approved = byStatus.approved || 0
    return {
      id: range.id,
      name: range.name,
      status: range.status,
      totalStyles,
      byStatus,
      approvedPct: totalStyles > 0 ? Math.round((approved / totalStyles) * 100) : 0,
      deliveryDrops: Object.values(dropMap),
    }
  })
}

export async function getTeamTaskWorkload() {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('tasks')
    .select('id, status, priority, due_date, assigned_to, people:assigned_to(id, name)')
    .neq('status', 'done')
  if (error) throw error
  const byPerson = {}
  ;(data || []).forEach(t => {
    const pid = t.assigned_to
    if (!pid) return
    if (!byPerson[pid]) {
      byPerson[pid] = {
        id: pid,
        name: t.people?.name || 'Unknown',
        total: 0,
        overdue: 0,
        highPriority: 0,
        inProgress: 0,
        todo: 0,
        review: 0,
      }
    }
    const p = byPerson[pid]
    p.total++
    if (t.due_date && t.due_date < today) p.overdue++
    if (t.priority === 'high' || t.priority === 'urgent') p.highPriority++
    if (t.status === 'in_progress') p.inProgress++
    if (t.status === 'todo') p.todo++
    if (t.status === 'review') p.review++
  })
  return Object.values(byPerson).sort((a, b) => b.total - a.total)
}

export async function getOverdueTasks() {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, people:assigned_to(id, name)')
    .lt('due_date', today)
    .neq('status', 'done')
    .order('due_date')
  if (error) throw error
  return data || []
}

export async function getStaleTasks() {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, created_at, people:assigned_to(id, name), creator:created_by(id, name)')
    .eq('status', 'todo')
    .lt('created_at', weekAgo)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function flagStaleTasks(fromPersonId) {
  const staleTasks = await getStaleTasks()
  let created = 0
  for (const task of staleTasks) {
    const recipientId = task.people?.id || task.creator?.id
    if (!recipientId) continue
    const age = Math.floor((new Date() - new Date(task.created_at)) / 86400000)
    await createNotification({
      person_id: recipientId,
      from_person_id: fromPersonId || null,
      type: 'stale_task',
      title: `Task not started for ${age} days`,
      message: task.title,
      link: '/tasks',
      read: false,
    })
    created++
  }
  return created
}

export async function getOverdueItems(divisionId) {
  const nowStr = new Date().toISOString().slice(0, 10)

  const [samples, pos] = await Promise.all([
    supabase
      .from('samples')
      .select('id, expected_date, round, status, styles!inner(id, name, style_number, division_id)')
      .eq('styles.division_id', divisionId)
      .lt('expected_date', nowStr)
      .not('status', 'in', '("approved","rejected")'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, delivery_date, status')
      .eq('division_id', divisionId)
      .lt('delivery_date', nowStr)
      .not('status', 'in', '("received","cancelled")'),
  ])

  return {
    overdueSamples: samples.data || [],
    overduePOs: pos.data || [],
    total: (samples.data?.length || 0) + (pos.data?.length || 0),
  }
}
