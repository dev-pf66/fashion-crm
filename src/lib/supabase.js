import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(seasonId) {
  const [styles, samples, pos] = await Promise.all([
    supabase.from('styles').select('id, status').eq('season_id', seasonId),
    supabase.from('samples').select('id, status, style_id, styles!inner(season_id)').eq('styles.season_id', seasonId),
    supabase.from('purchase_orders').select('id, status').eq('season_id', seasonId),
  ])
  if (styles.error) throw styles.error
  if (samples.error) throw samples.error
  if (pos.error) throw pos.error

  return {
    totalStyles: (styles.data || []).length,
    inDevelopment: (styles.data || []).filter(s => ['concept', 'development', 'sampling', 'costing'].includes(s.status)).length,
    samplesForReview: (samples.data || []).filter(s => s.status === 'received').length,
    openPos: (pos.data || []).filter(p => ['issued', 'confirmed', 'in_production'].includes(p.status)).length,
  }
}
