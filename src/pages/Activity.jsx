import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { supabase } from '../lib/supabase'
import { getRelativeTime } from '../lib/activityLogger'
import { useToast } from '../contexts/ToastContext'
import { Clock } from 'lucide-react'
import { ListSkeleton } from '../components/PageSkeleton'

const ENTITY_TYPES = [
  'range_styles',
  'ranges',
  'tasks',
  'people',
  'suppliers',
  'samples',
  'orders',
  'order_items',
  'production_stages',
  'silhouettes',
  'price_brackets',
  'dashboard_targets',
  'roles',
]

function entityLabel(t) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Activity() {
  const { people } = useApp()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ entity_type: '', person_id: '' })
  const [page, setPage] = useState(0)
  const toast = useToast()
  const PAGE_SIZE = 30

  useEffect(() => {
    loadActivity()
  }, [filters, page])

  async function loadActivity() {
    setLoading(true)
    try {
      let query = supabase
        .from('activity_log')
        .select('*, people(id, name)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
      if (filters.person_id) query = query.eq('person_id', filters.person_id)

      const { data, error } = await query
      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('Failed to load activity:', err)
      toast.error('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p className="subtitle">Track all changes across the workspace</p>
        </div>
      </div>

      <div className="filter-bar">
        <select
          value={filters.entity_type}
          onChange={e => { setFilters(p => ({ ...p, entity_type: e.target.value })); setPage(0) }}
        >
          <option value="">All Types</option>
          {ENTITY_TYPES.map(t => (
            <option key={t} value={t}>{entityLabel(t)}</option>
          ))}
        </select>
        <select
          value={filters.person_id}
          onChange={e => { setFilters(p => ({ ...p, person_id: e.target.value })); setPage(0) }}
        >
          <option value="">All People</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : entries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Clock size={48} />
            <h3>No activity found</h3>
            <p>Activity will appear here as you create and edit items.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 500 }}>{entry.people?.name || 'Unknown'}</td>
                    <td>
                      <span className="badge" style={{
                        background: entry.action === 'created' ? 'var(--success-light)' : entry.action === 'deleted' ? 'var(--danger-light)' : 'var(--info-light)',
                        color: entry.action === 'created' ? 'var(--success)' : entry.action === 'deleted' ? 'var(--danger)' : 'var(--info)',
                      }}>
                        {entry.action}
                      </span>
                    </td>
                    <td>{entityLabel(entry.entity_type)}</td>
                    <td style={{ color: 'var(--gray-500)' }}>
                      {entry.details?.name || entry.details?.style_number || entry.details?.po_number || '-'}
                    </td>
                    <td style={{ color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      {getRelativeTime(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </button>
            <span style={{ padding: '0.3125rem 0.625rem', fontSize: '0.8125rem', color: 'var(--gray-500)' }}>
              Page {page + 1}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={entries.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
