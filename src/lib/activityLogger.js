import { supabase } from './supabase'

export function logActivity(personId, action, entityType, entityId, details = {}, seasonId = null) {
  // Fire-and-forget — non-blocking
  supabase
    .from('activity_log')
    .insert([{ person_id: personId, action, entity_type: entityType, entity_id: entityId, details, season_id: seasonId }])
    .then(({ error }) => { if (error) console.warn('Activity log failed:', error.message) })
    .catch(() => {})
}

export function formatActivityMessage(entry) {
  const name = entry.people?.name || 'Someone'
  const d = entry.details || {}
  switch (entry.action) {
    case 'created': return `${name} created ${entry.entity_type} "${d.name || d.style_number || ''}"`
    case 'updated': return `${name} updated ${entry.entity_type} "${d.name || d.style_number || ''}"`
    case 'deleted': return `${name} deleted ${entry.entity_type} "${d.name || d.style_number || ''}"`
    case 'status_changed': return `${name} changed ${entry.entity_type} status to ${d.new_status || ''}`
    default: return `${name} ${entry.action} ${entry.entity_type}`
  }
}

export function getRelativeTime(timestamp) {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
