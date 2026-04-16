import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { updatePerson, getRoles } from '../lib/supabase'
import { ROLES } from '../lib/constants'
import Modal from '../components/Modal'
import { Users } from 'lucide-react'

export default function Team() {
  const { people, refreshPeople } = useApp()
  const [editPerson, setEditPerson] = useState(null)

  async function handleSave() {
    setEditPerson(null)
    await refreshPeople()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="subtitle">{people.length} members</p>
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
          {people.map(p => (
            <div key={p.id} className="team-card" onClick={() => setEditPerson(p)} style={{ cursor: 'pointer' }}>
              <div className="team-card-avatar">
                {p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
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
              {!p.is_active && <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', marginTop: '0.5rem' }}>Inactive</span>}
            </div>
          ))}
        </div>
      )}

      {editPerson && (
        <PersonForm
          person={editPerson}
          onClose={() => setEditPerson(null)}
          onSave={handleSave}
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
        role: form.role,
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
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Save Changes' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  )
}
