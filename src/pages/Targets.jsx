import { useState, useEffect } from 'react'
import { Target, Pencil, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import { getPersonTargets, upsertPersonTarget, getPersonActuals } from '../lib/supabase'
import Modal from '../components/Modal'

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
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getMonthStart() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getActual(metric, personId, actuals, period) {
  if (!actuals) return null
  switch (metric) {
    case 'pieces_assigned': return actuals.pieces[personId] || 0
    case 'tasks_completed': return period === 'week' ? (actuals.tasksWeek[personId] || 0) : (actuals.tasksMonth[personId] || 0)
    case 'styles_created': return period === 'week' ? (actuals.stylesWeek[personId] || 0) : (actuals.stylesMonth[personId] || 0)
    case 'samples_reviewed': return period === 'week' ? (actuals.samplesWeek[personId] || 0) : (actuals.samplesMonth[personId] || 0)
    case 'orders_processed': return period === 'week' ? (actuals.ordersWeek[personId] || 0) : (actuals.ordersMonth[personId] || 0)
    default: return null
  }
}

function CircleProgress({ pct, size = 80, stroke = 7 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct / 100, 1) * circ
  const color = pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

function StatusChip({ pct }) {
  if (pct === null) return null
  if (pct >= 100) return <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--success)', background: 'var(--success-light)', padding: '2px 8px', borderRadius: 99 }}>Goal Met</span>
  if (pct >= 60) return <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--warning)', background: 'var(--warning-light)', padding: '2px 8px', borderRadius: 99 }}>On Track</span>
  return <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-light)', padding: '2px 8px', borderRadius: 99 }}>Behind</span>
}

export default function Targets() {
  const { currentPerson, people } = useApp()
  const toast = useToast()
  const { isAdmin } = usePermissions()
  const [targets, setTargets] = useState([])
  const [actuals, setActuals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editPerson, setEditPerson] = useState(null)
  const [period, setPeriod] = useState('week')
  const [filter, setFilter] = useState('all')

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

  // Compute per-person stats
  const personStats = activePeople.map(person => {
    const t = targetMap[person.id]
    const metric = t?.metric || null
    const target = period === 'week' ? t?.weekly_target : t?.monthly_target
    const actual = metric ? getActual(metric, person.id, actuals, period) : null
    const pct = (target > 0 && actual !== null) ? Math.round((actual / target) * 100) : null
    return { person, t, metric, target: target || 0, actual, pct }
  })

  // Summary counts
  const withTargets = personStats.filter(s => s.t)
  const goalMet = withTargets.filter(s => s.pct !== null && s.pct >= 100).length
  const onTrack = withTargets.filter(s => s.pct !== null && s.pct >= 60 && s.pct < 100).length
  const behind = withTargets.filter(s => s.pct !== null && s.pct < 60).length

  // Filter
  const filtered = personStats.filter(s => {
    if (filter === 'goal_met') return s.pct !== null && s.pct >= 100
    if (filter === 'on_track') return s.pct !== null && s.pct >= 60 && s.pct < 100
    if (filter === 'behind') return s.pct !== null && s.pct < 60
    if (filter === 'no_target') return !s.t
    return true
  })

  const periodLabel = period === 'week' ? 'This Week' : 'This Month'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={24} /> Target Tracking
          </h1>
          <p className="subtitle">Team performance against weekly and monthly targets</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
            <button
              onClick={() => setPeriod('week')}
              style={{ padding: '4px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem', background: period === 'week' ? 'var(--card-bg)' : 'transparent', color: period === 'week' ? 'var(--gray-900)' : 'var(--gray-500)', boxShadow: period === 'week' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}
            >Weekly</button>
            <button
              onClick={() => setPeriod('month')}
              style={{ padding: '4px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem', background: period === 'month' ? 'var(--card-bg)' : 'transparent', color: period === 'month' ? 'var(--gray-900)' : 'var(--gray-500)', boxShadow: period === 'month' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}
            >Monthly</button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card" style={{ cursor: 'pointer', borderColor: filter === 'all' ? 'var(--primary)' : undefined }} onClick={() => setFilter('all')}>
          <div className="stat-card-label">Total Members</div>
          <div className="stat-card-value">{activePeople.length}</div>
          <div className="stat-card-change text-muted">{withTargets.length} with targets</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', borderColor: filter === 'goal_met' ? 'var(--success)' : undefined }} onClick={() => setFilter(filter === 'goal_met' ? 'all' : 'goal_met')}>
          <div className="stat-card-label">Goal Met</div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{goalMet}</div>
          <div className="stat-card-change" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> 100%+ of target</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', borderColor: filter === 'on_track' ? 'var(--warning)' : undefined }} onClick={() => setFilter(filter === 'on_track' ? 'all' : 'on_track')}>
          <div className="stat-card-label">On Track</div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{onTrack}</div>
          <div className="stat-card-change" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}><Minus size={12} /> 60–99% of target</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', borderColor: filter === 'behind' ? 'var(--danger)' : undefined }} onClick={() => setFilter(filter === 'behind' ? 'all' : 'behind')}>
          <div className="stat-card-label">Behind</div>
          <div className="stat-card-value" style={{ color: 'var(--danger)' }}>{behind}</div>
          <div className="stat-card-change" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={12} /> Under 60% of target</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ height: 220, background: 'var(--gray-50)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
          <Target size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
          <p>No members match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filtered.map(({ person, t, metric, target, actual, pct }) => {
            const initials = person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            const metricLabel = METRICS.find(m => m.value === metric)?.label
            const ringColor = pct === null ? 'var(--gray-200)' : pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
            return (
              <div key={person.id} className="card" style={{ padding: '1.5rem', position: 'relative', transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, boxShadow: `0 0 0 3px ${ringColor}` }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 1 }}>{ROLES_MAP[person.role] || person.roles?.name || 'No title'}</div>
                  </div>
                  {isAdmin && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditPerson(person)} style={{ marginLeft: 'auto', flexShrink: 0, padding: '4px 6px' }}>
                      <Pencil size={13} />
                    </button>
                  )}
                </div>

                {/* Progress ring + numbers */}
                {t ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <CircleProgress pct={pct ?? 0} size={80} stroke={7} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1 }}>{pct !== null ? `${Math.min(pct, 999)}%` : '—'}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: 4 }}>{periodLabel}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1 }}>
                        {actual !== null ? actual : '—'}
                        <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--gray-400)' }}> / {target}</span>
                      </div>
                      <div style={{ marginTop: 6 }}><StatusChip pct={pct} /></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: 'var(--gray-300)', fontSize: '0.85rem' }}>
                    No target set
                  </div>
                )}

                {/* Metric badge */}
                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '0.75rem' }}>
                  {metricLabel
                    ? <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.7rem' }}>{metricLabel}</span>
                    : <span style={{ fontSize: '0.75rem', color: 'var(--gray-300)' }}>No metric assigned</span>
                  }
                </div>
              </div>
            )
          })}
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
