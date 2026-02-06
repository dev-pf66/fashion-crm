import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatActivityMessage, getRelativeTime } from '../lib/activityLogger'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'

const ACTION_ICONS = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  status_changed: RefreshCw,
}

export default function ActivityFeed({ seasonId, limit = 8, compact = false }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivity()
  }, [seasonId])

  async function loadActivity() {
    try {
      let query = supabase
        .from('activity_log')
        .select('*, people(id, name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (seasonId) query = query.eq('season_id', seasonId)
      const { data, error } = await query
      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('Failed to load activity:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  if (entries.length === 0) {
    return <div className="empty-state" style={{ padding: '1.5rem' }}><p>No activity yet</p></div>
  }

  return (
    <div className="activity-feed-list">
      {entries.map(entry => {
        const Icon = ACTION_ICONS[entry.action] || Edit
        const initials = entry.people?.name
          ? entry.people.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          : '?'

        return (
          <div key={entry.id} className={`activity-feed-item ${compact ? 'compact' : ''}`}>
            <div className="activity-feed-avatar" title={entry.people?.name}>
              {initials}
            </div>
            <div className="activity-feed-content">
              <div className="activity-feed-text">{formatActivityMessage(entry)}</div>
              <div className="activity-feed-time">{getRelativeTime(entry.created_at)}</div>
            </div>
            <div className="activity-feed-icon"><Icon size={14} /></div>
          </div>
        )
      })}
    </div>
  )
}
