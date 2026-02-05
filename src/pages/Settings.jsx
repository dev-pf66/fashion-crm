import { useState } from 'react'
import { useSeason } from '../contexts/SeasonContext'
import { createSeason, updateSeason } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Calendar, Edit } from 'lucide-react'

export default function Settings() {
  const { seasons, refreshSeasons } = useSeason()
  const [showForm, setShowForm] = useState(false)
  const [editSeason, setEditSeason] = useState(null)

  async function handleSave() {
    setShowForm(false)
    setEditSeason(null)
    await refreshSeasons()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Manage seasons and app configuration</p>
        </div>
      </div>

      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--gray-100)' }}>
          <h3 style={{ margin: 0, padding: 0, border: 'none' }}>Seasons</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditSeason(null); setShowForm(true) }}>
            <Plus size={14} /> New Season
          </button>
        </div>

        {seasons.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <h3>No seasons</h3>
            <p>Create your first season to start tracking styles.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create Season</button>
          </div>
        ) : (
          <div className="seasons-list">
            {seasons.map(s => (
              <div key={s.id} className="season-item">
                <div>
                  <div className="season-item-name">{s.name}</div>
                  <div className="season-item-code">{s.code}</div>
                </div>
                <div className="season-item-dates">
                  {s.start_date && s.end_date
                    ? `${new Date(s.start_date).toLocaleDateString()} - ${new Date(s.end_date).toLocaleDateString()}`
                    : 'No dates set'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {s.is_active && <span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>Active</span>}
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditSeason(s); setShowForm(true) }}>
                    <Edit size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <SeasonForm
          season={editSeason}
          onClose={() => { setShowForm(false); setEditSeason(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function SeasonForm({ season, onClose, onSave }) {
  const isEdit = !!season
  const [form, setForm] = useState({
    name: season?.name || '',
    code: season?.code || '',
    start_date: season?.start_date || '',
    end_date: season?.end_date || '',
    is_active: season?.is_active ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await updateSeason(season.id, form)
      } else {
        await createSeason(form)
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Season' : 'New Season'} onClose={onClose}>
      {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group"><label>Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Spring/Summer 2026" required /></div>
          <div className="form-group"><label>Code *</label><input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. SS26" required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
          <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 'auto' }} />
            Active Season
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Season'}</button>
        </div>
      </form>
    </Modal>
  )
}
