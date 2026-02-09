import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getRanges, createRange, deleteRange } from '../lib/supabase'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Layers, Trash2 } from 'lucide-react'

const RANGE_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'locked', label: 'Locked' },
]

export default function RangePlanning() {
  const { currentPerson } = useApp()
  const toast = useToast()
  const [ranges, setRanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getRanges()
      setRanges(data || [])
    } catch (err) {
      console.error('Failed to load ranges:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e, id, name, styleCount) {
    e.preventDefault()
    e.stopPropagation()
    if (styleCount > 0) {
      if (!confirm(`"${name}" has ${styleCount} styles. Delete this range and all its styles?`)) return
    } else {
      if (!confirm(`Delete range "${name}"?`)) return
    }
    try {
      await deleteRange(id)
      toast.success('Range deleted')
      loadData()
    } catch (err) {
      toast.error('Failed to delete range')
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Range Planning</h1>
          <p className="subtitle">{ranges.length} range{ranges.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Range
        </button>
      </div>

      {ranges.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Layers size={48} />
            <h3>No ranges yet</h3>
            <p>Create your first range to start planning a collection.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Range
            </button>
          </div>
        </div>
      ) : (
        <div className="rp-range-list">
          {ranges.map(range => {
            const styleCount = range.range_styles?.length || 0
            const byCategory = {}
            const byStatus = {}
            ;(range.range_styles || []).forEach(s => {
              byCategory[s.category] = (byCategory[s.category] || 0) + 1
              byStatus[s.status] = (byStatus[s.status] || 0) + 1
            })
            return (
              <Link key={range.id} to={`/range-planning/${range.id}`} className="rp-range-card card">
                <div className="rp-range-card-header">
                  <div>
                    <h3>{range.name}</h3>
                    {range.season && <span className="tag">{range.season}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <StatusBadge status={range.status} />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => handleDelete(e, range.id, range.name, styleCount)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="rp-range-card-stats">
                  <span className="rp-stat-big">{styleCount}</span>
                  <span className="text-sm text-muted">style{styleCount !== 1 ? 's' : ''}</span>
                </div>
                {styleCount > 0 && (
                  <div className="rp-range-card-breakdown">
                    {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, count]) => (
                      <span key={cat} className="rp-breakdown-item">{cat}: {count}</span>
                    ))}
                    {Object.keys(byCategory).length > 4 && (
                      <span className="rp-breakdown-item text-muted">+{Object.keys(byCategory).length - 4} more</span>
                    )}
                  </div>
                )}
                <div className="rp-range-card-footer">
                  <span className="text-sm text-muted">
                    by {range.creator?.name || 'Unknown'} &middot; {new Date(range.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showForm && (
        <NewRangeForm
          personId={currentPerson?.id}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData() }}
        />
      )}
    </div>
  )
}

function NewRangeForm({ personId, onClose, onSave }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createRange({
        name: name.trim(),
        season: season.trim() || null,
        created_by: personId,
      })
      toast.success('Range created!')
      onSave()
    } catch (err) {
      console.error('Create range error:', err)
      toast.error('Failed to create range')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New Range" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Range Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SS26 Womenswear" required autoFocus />
        </div>
        <div className="form-group">
          <label>Season</label>
          <input type="text" value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. SS26, AW26" />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Range'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
