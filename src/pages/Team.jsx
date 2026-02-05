import { useState } from 'react'
import { useApp } from '../App'
import { createPerson, updatePerson } from '../lib/supabase'
import { ROLES } from '../lib/constants'
import Modal from '../components/Modal'
import { Plus, Users } from 'lucide-react'

export default function Team() {
  const { people, refreshPeople } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editPerson, setEditPerson] = useState(null)

  async function handleSave() {
    setShowForm(false)
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
        <button className="btn btn-primary" onClick={() => { setEditPerson(null); setShowForm(true) }}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {people.length === 0 ? (
        <div className="card"><div className="empty-state">
          <Users size={48} />
          <h3>No team members</h3>
          <p>Team members are automatically created when they sign in.</p>
        </div></div>
      ) : (
        <div className="team-grid">
          {people.map(p => (
            <div key={p.id} className="team-card" onClick={() => { setEditPerson(p); setShowForm(true) }} style={{ cursor: 'pointer' }}>
              <div className="team-card-avatar">
                {p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="team-card-name">{p.name}</div>
              <div className="team-card-role">
                {ROLES.find(r => r.value === p.role)?.label || p.role || 'No role'}
              </div>
              <div className="team-card-email">{p.email}</div>
              {!p.is_active && <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)', marginTop: '0.5rem' }}>Inactive</span>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PersonForm
          person={editPerson}
          onClose={() => { setShowForm(false); setEditPerson(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function PersonForm({ person, onClose, onSave }) {
  const isEdit = !!person
  const [form, setForm] = useState({
    name: person?.name || '',
    email: person?.email || '',
    role: person?.role || '',
    is_active: person?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await updatePerson(person.id, form)
      } else {
        await createPerson(form)
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Member' : 'Add Member'} onClose={onClose}>
      {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
        <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={isEdit} /></div>
        <div className="form-group">
          <label>Role</label>
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="">Select...</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {isEdit && (
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 'auto' }} />
              Active
            </label>
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Member'}</button>
        </div>
      </form>
    </Modal>
  )
}
