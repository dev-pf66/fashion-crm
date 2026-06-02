import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { updatePerson, getRoles, getTeamTaskWorkload, getLastActivityPerPerson, getAllAssignedStyles } from '../lib/supabase'
import { ROLES } from '../lib/constants'
import Modal from '../components/Modal'
import { Users } from 'lucide-react'

function relTime(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function Team() {
  const { people, refreshPeople } = useApp()
  const [editPerson, setEditPerson] = useState(null)
  const [workload, setWorkload] = useState({})
  const [lastActivity, setLastActivity] = useState({})
  const [piecesMap, setPiecesMap] = useState({})

  useEffect(() => {
    Promise.all([
      getTeamTaskWorkload(),
      getLastActivityPerPerson(),
      getAllAssignedStyles(),
    ]).then(([wl, la, pieces]) => {
      const wlMap = {}
      ;(wl || []).forEach(p => { wlMap[p.id] = p })
      setWorkload(wlMap)
      setLastActivity(la || {})
      const pm = {}
      ;(pieces || []).forEach(s => { if (s.assigned_to) pm[s.assigned_to] = (pm[s.assigned_to] || 0) + 1 })
      setPiecesMap(pm)
    }).catch(() => {})
  }, [])

  const activeCount = people.filter(p => p.is_active !== false).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="subtitle">{activeCount} active · {people.length} total</p>
        </div>
      </div>

      {people.length === 0 ? (
        <div className="card"><div className="empty-state">
          <Users size={48} />
          <h3>No team members</h3>
          <p>Add team members from the Command Center.</p>
        </div></div>
      ) : (
        <div className="team-grid">
          {people.map(p => {
            const wl = workload[p.id]
            const lastAct = lastActivity[p.id]
            const pieces = piecesMap[p.id] || 0
            const lastActAge = lastAct ? Date.now() - new Date(lastAct.created_at).getTime() : Infinity
            const isDormant = p.is_active !== false && lastActAge > 3 * 86400000
            const isActiveToday = lastActAge < 86400000
            const dotColor = !p.is_active ? '#cbd5e1' : isDormant ? '#f87171' : isActiveToday ? '#34d399' : '#fbbf24'

            return (
              <div key={p.id} className="team-card" onClick={() => setEditPerson(p)} style={{ cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: 48, margin: '0 auto 0.5rem' }}>
                  <div className="team-card-avatar" style={{ margin: 0 }}>
                    {p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: dotColor, border: '2px solid var(--bg-card)' }} />
                </div>

                <div className="team-card-name">{p.name}</div>

                <div className="team-card-role">
                  {p.roles?.name ? (
                    <span className={`role-badge role-${p.roles.name}`}>{p.roles.name}</span>
                  ) : (
                    ROLES.find(r => r.value === p.role)?.label || p.role || 'No role'
                  )}
                </div>

                <div className="team-card-email">{p.email}</div>

                {/* Live work stats */}
                {p.is_active !== false && (wl || pieces > 0) && (
                  <div style={{ marginTop: '0.625rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.25rem' }}>
                    {wl?.total > 0 && (
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: wl.overdue > 0 ? '#fee2e2' : 'var(--gray-100)', color: wl.overdue > 0 ? '#dc2626' : 'var(--gray-600)', fontWeight: 500 }}>
                        {wl.total} task{wl.total !== 1 ? 's' : ''}{wl.overdue > 0 ? ` · ${wl.overdue} overdue` : ''}
                      </span>
                    )}
                    {wl?.inProgress > 0 && (
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8', fontWeight: 500 }}>
                        {wl.inProgress} in progress
                      </span>
                    )}
                    {pieces > 0 && (
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 4, background: '#f3e8ff', color: '#7c3aed', fontWeight: 500 }}>
                        {pieces} piece{pieces !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Last active */}
                <div style={{ marginTop: '0.375rem', fontSize: '0.68rem', color: isDormant ? '#f87171' : 'var(--gray-400)' }}>
                  {lastAct ? (isDormant ? `⚠ ${relTime(lastAct.created_at)}` : relTime(lastAct.created_at)) : p.is_active !== false ? 'No activity yet' : ''}
                </div>

                {!p.is_active && <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', marginTop: '0.5rem' }}>Inactive</span>}
              </div>
            )
          })}
        </div>
      )}

      {editPerson && (
        <PersonForm
          person={editPerson}
          onClose={() => setEditPerson(null)}
          onSave={async () => { setEditPerson(null); await refreshPeople() }}
        />
      )}
    </div>
  )
}

function PersonForm({ person, onClose, onSave }) {
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({
    name: person.name || '',
    email: person.email || '',
    role: person.role || '',
    role_id: person.role_id || '',
    is_active: person.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePerson(person.id, {
        name: form.name,
        email: form.email,
        role: form.role || null,
        role_id: form.role_id ? parseInt(form.role_id) : null,
        is_active: form.is_active,
      })
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit Member" onClose={onClose}>
      {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
        <div className="form-group"><label>Email</label><input type="email" value={form.email} disabled /></div>
        <div className="form-group">
          <label>Permission Role *</label>
          <select value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}>
            <option value="">Select permission role...</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Job Title</label>
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="">Select...</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 'auto' }} />
            Active
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>Save Changes</button>
        </div>
      </form>
    </Modal>
  )
}
