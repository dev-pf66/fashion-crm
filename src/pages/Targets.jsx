import { useState, useEffect } from 'react'
import { Target, Pencil } from 'lucide-react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import { getPersonTargets, upsertPersonTarget, getPersonActuals } from '../lib/supabase'
import Modal from '../components/Modal'
import { ListSkeleton } from '../components/PageSkeleton'

const METRICS = [
  { value: 'pieces_assigned', label: 'Pieces Assigned', description: 'Range style pieces currently assigned' },
  { value: 'tasks_completed', label: 'Tasks Completed', description: 'Tasks marked done this period' },
  { value: 'styles_created', label: 'Styles Created', description: 'New styles added this period' },
  { value: 'samples_reviewed', label: 'Samples Reviewed', description: 'Samples updated/reviewed this period' },
  { value: 'orders_processed', label: 'Orders Processed', description: 'Purchase orders created this period' },
]

const ROLES_MAP = {
  sourcing_manager: 'Sourcing Manager',
  production_manager: 'Production Manager',
  merchandiser: 'Merchandiser',
  qc_manager: 'QC Manager',
  technical_designer: 'Technical Designer',
  admin: 'Admin',
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getMonthStart() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getActualForMetric(metric, personId, actuals) {
  if (!actuals) return { weekly: null, monthly: null }
  switch (metric) {
    case 'pieces_assigned':
      return { weekly: actuals.pieces[personId] || 0, monthly: actuals.pieces[personId] || 0 }
    case 'tasks_completed':
      return { weekly: actuals.tasksWeek[personId] || 0, monthly: actuals.tasksMonth[personId] || 0 }
    case 'styles_created':
      return { weekly: actuals.stylesWeek[personId] || 0, monthly: actuals.stylesMonth[personId] || 0 }
    case 'samples_reviewed':
      return { weekly: actuals.samplesWeek[personId] || 0, monthly: actuals.samplesMonth[personId] || 0 }
    case 'orders_processed':
      return { weekly: actuals.ordersWeek[personId] || 0, monthly: actuals.ordersMonth[personId] || 0 }
    default:
      return { weekly: null, monthly: null }
  }
}

function ProgressCell({ actual, target }) {
  if (actual === null) return <span className="text-muted text-sm">—</span>
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : null
  const color = pct === null ? 'var(--gray-300)' : pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
        {actual}{target > 0 ? <span className="text-muted" style={{ fontWeight: 400 }}> / {target}</span> : ''}
      </div>
      {target > 0 && (
        <div style={{ height: 4, background: 'var(--gray-100)', borderRadius: 2, marginTop: 3, width: 80 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  )
}

export default function Targets() {
  const { currentPerson, people } = useApp()
  const toast = useToast()
  const { isAdmin } = usePermissions()
  const [targets, setTargets] = useState([])
  const [actuals, setActuals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editPerson, setEditPerson] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [t, a] = await Promise.all([
        getPersonTargets(),
        getPersonActuals(getWeekStart(), getMonthStart()),
      ])
      setTargets(t)
      setActuals(a)
    } catch (err) {
      toast.error('Failed to load targets')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activePeople = people.filter(p => p.is_active)
  const targetMap = Object.fromEntries(targets.map(t => [t.person_id, t]))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={24} /> Target Tracking
          </h1>
          <p className="subtitle">Weekly and monthly targets per team member</p>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Job Title</th>
                <th>Responsible For</th>
                <th>Weekly Target</th>
                <th>Weekly Actual</th>
                <th>Monthly Target</th>
                <th>Monthly Actual</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {activePeople.map(person => {
                const t = targetMap[person.id]
                const metric = t?.metric || null
                const metricLabel = METRICS.find(m => m.value === metric)?.label || '—'
                const { weekly, monthly } = metric ? getActualForMetric(metric, person.id, actuals) : { weekly: null, monthly: null }
                return (
                  <tr key={person.id}>
                    <td style={{ fontWeight: 500 }}>{person.name}</td>
                    <td className="text-muted text-sm">{ROLES_MAP[person.role] || person.roles?.name || '—'}</td>
                    <td>
                      {metric
                        ? <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>{metricLabel}</span>
                        : <span className="text-muted text-sm">Not set</span>}
                    </td>
                    <td>{t ? t.weekly_target : <span className="text-muted">—</span>}</td>
                    <td><ProgressCell actual={weekly} target={t?.weekly_target || 0} /></td>
                    <td>{t ? t.monthly_target : <span className="text-muted">—</span>}</td>
                    <td><ProgressCell actual={monthly} target={t?.monthly_target || 0} /></td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditPerson(person)} style={{ padding: '4px 8px' }}>
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editPerson && (
        <EditTargetModal
          person={editPerson}
          existing={targetMap[editPerson.id]}
          currentPersonId={currentPerson?.id}
          onClose={() => setEditPerson(null)}
          onSaved={() => { setEditPerson(null); load(); toast.success('Target updated') }}
          toast={toast}
        />
      )}
    </div>
  )
}

function EditTargetModal({ person, existing, currentPersonId, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    metric: existing?.metric || 'tasks_completed',
    weekly_target: existing?.weekly_target ?? '',
    monthly_target: existing?.monthly_target ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await upsertPersonTarget(
        person.id,
        form.metric,
        parseInt(form.weekly_target) || 0,
        parseInt(form.monthly_target) || 0,
        currentPersonId,
      )
      onSaved()
    } catch (err) {
      toast.error('Failed to save target')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Set Target — ${person.name}`} onClose={onClose}>
      <div className="form-group">
        <label>Responsible For</label>
        <select value={form.metric} onChange={e => setForm(p => ({ ...p, metric: e.target.value }))}>
          {METRICS.map(m => (
            <option key={m.value} value={m.value}>{m.label} — {m.description}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Weekly Target</label>
          <input type="number" min="0" value={form.weekly_target} onChange={e => setForm(p => ({ ...p, weekly_target: e.target.value }))} placeholder="0" />
        </div>
        <div className="form-group">
          <label>Monthly Target</label>
          <input type="number" min="0" value={form.monthly_target} onChange={e => setForm(p => ({ ...p, monthly_target: e.target.value }))} placeholder="0" />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Target'}
        </button>
      </div>
    </Modal>
  )
}
