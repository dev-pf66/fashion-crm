import { createClient } from '@supabase/supabase-js'

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
// PEOPLE
// ============================================================

export async function getPeople() {
  const { data, error } = await supabase.from('people').select('*').order('name')
  if (error) throw error
  return data
}

export async function getPersonByEmail(email) {
  const { data, error } = await supabase.from('people').select('*').eq('email', email).single()
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

export async function getSeasons() {
  const { data, error } = await supabase.from('seasons').select('*').order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createSeason(season) {
  const { data, error } = await supabase.from('seasons').insert([season]).select().single()
  if (error) throw error
  return data
}

export async function updateSeason(id, updates) {
  const { data, error } = await supabase.from('seasons').update(updates).eq('id', id).select().single()
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

export async function getStyles(seasonId, filters = {}) {
  let query = supabase
    .from('styles')
    .select('*, suppliers(id, name, country), people:assigned_to(id, name)')
    .eq('season_id', seasonId)
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

export async function getSamples(seasonId) {
  const { data, error } = await supabase
    .from('samples')
    .select('*, styles!inner(id, name, style_number, thumbnail_url, season_id), suppliers(id, name), people:assigned_to(id, name)')
    .eq('styles.season_id', seasonId)
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

export async function getDashboardStats(seasonId) {
  const [styles, samples, pos] = await Promise.all([
    supabase.from('styles').select('id, status').eq('season_id', seasonId),
    supabase.from('samples').select('id, status, round, style_id, styles!inner(season_id)').eq('styles.season_id', seasonId),
    supabase.from('purchase_orders').select('id, status').eq('season_id', seasonId),
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

export async function getPurchaseOrders(seasonId, filters = {}) {
  let query = supabase
    .from('purchase_orders')
    .select('*, suppliers(id, name), people:assigned_to(id, name)')
    .eq('season_id', seasonId)
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

export async function getActivityLog(seasonId, filters = {}) {
  let query = supabase
    .from('activity_log')
    .select('*, people(id, name)')
    .order('created_at', { ascending: false })
  if (seasonId) query = query.eq('season_id', seasonId)
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
  if (filters.person_id) query = query.eq('person_id', filters.person_id)
  if (filters.limit) query = query.limit(filters.limit)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ============================================================
// DASHBOARD ENHANCEMENTS
// ============================================================

export async function getUpcomingDeadlines(seasonId) {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 86400000)
  const nowStr = now.toISOString().slice(0, 10)
  const futureStr = weekFromNow.toISOString().slice(0, 10)

  const [samples, pos] = await Promise.all([
    supabase
      .from('samples')
      .select('id, expected_date, round, round_number, colorway, status, styles!inner(id, name, style_number, season_id)')
      .eq('styles.season_id', seasonId)
      .gte('expected_date', nowStr)
      .lte('expected_date', futureStr)
      .not('status', 'in', '("approved","rejected")')
      .order('expected_date'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, delivery_date, status, suppliers(id, name)')
      .eq('season_id', seasonId)
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
      label: `${p.po_number} - ${p.suppliers?.name || ''}`,
      date: p.delivery_date,
      status: p.status,
    })
  })

  deadlines.sort((a, b) => new Date(a.date) - new Date(b.date))
  return deadlines
}

export async function getOverdueItems(seasonId) {
  const nowStr = new Date().toISOString().slice(0, 10)

  const [samples, pos] = await Promise.all([
    supabase
      .from('samples')
      .select('id, expected_date, round, status, styles!inner(id, name, style_number, season_id)')
      .eq('styles.season_id', seasonId)
      .lt('expected_date', nowStr)
      .not('status', 'in', '("approved","rejected")'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, delivery_date, status')
      .eq('season_id', seasonId)
      .lt('delivery_date', nowStr)
      .not('status', 'in', '("received","cancelled")'),
  ])

  return {
    overdueSamples: samples.data || [],
    overduePOs: pos.data || [],
    total: (samples.data?.length || 0) + (pos.data?.length || 0),
  }
}
