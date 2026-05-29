import { useState, useEffect } from 'react'
import { Target, Pencil, RefreshCw, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, LayoutList, LayoutGrid } from 'lucide-react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import { getPersonTargets, upsertPersonTarget, getPersonActuals, getPersonDrilldown } from '../lib/supabase'
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

function daysLeftInPeriod(period) {
  const now = new Date()
  if (period === 'week') {
    const day = now.getDay()
    return day === 0 ? 0 : 7 - day
  }
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return last.getDate() - now.getDate()
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

function getPrevActual(metric, personId, actuals, period) {
  if (!actuals) return null
  switch (metric) {
    case 'pieces_assigned': return actuals.pieces[personId] || 0
    case 'tasks_completed': return period === 'week' ? (actuals.tasksPrevWeek[personId] || 0) : (actuals.tasksPrevMonth[personId] || 0)
    case 'styles_created': return period === 'week' ? (actuals.stylesPrevWeek[personId] || 0) : (actuals.stylesPrevMonth[personId] || 0)
    case 'samples_reviewed': return period === 'week' ? (actuals.samplesPrevWeek[personId] || 0) : (actuals.samplesPrevMonth[personId] || 0)
    case 'orders_processed': return period === 'week' ? (actuals.ordersPrevWeek[personId] || 0) : (actuals.ordersPrevMonth[personId] || 0)
    default: return null
  }
}

function CircleProgress({ pct, size = 88, stroke = 8 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min((pct || 0) / 100, 1) * circ
  const color = pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
    </svg>
  )
}

function TrendBadge({ current, prev }) {
  if (prev === null || current === null) return null
  const diff = current - prev
  if (diff === 0) return <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 2 }}><Minus size={10} /> vs last period</span>
  const up = diff > 0
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: up ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 2 }}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{diff} vs last period
    </span>
  )
}

function StatusChip({ pct }) {
  if (pct === null) return null
  if (pct >= 100) return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--success)', background: 'var(--success-light)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.02em' }}>GOAL MET</span>
  if (pct >= 60) return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--warning)', background: 'var(--warning-light)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.02em' }}>ON TRACK</span>
  return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-light)', padding: '2px 8px', borderRadius: 99, letterSpacing: '0.02em' }}>BEHIND</span>
}

function DrilldownPanel({ personId, metric, periodStart, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPersonDrilldown(personId, metric, periodStart)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [personId, metric, periodStart])

  if (loading) return <div style={{ padding: '0.75rem 0', color: 'var(--gray-400)', fontSize: '0.8rem' }}>Loading items...</div>
  if (!items.length) return <div style={{ padding: '0.75rem 0', color: 'var(--gray-400)', fontSize: '0.8rem' }}>No items found for this period.</div>

  return (
    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--gray-100)', paddingTop: '0.75rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {items.length} item{items.length !== 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'var(--gray-50)', borderRadius: 6, fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 500, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{item.label}</span>
            <span style={{ color: 'var(--gray-400)', flexShrink: 0, fontSize: '0.72rem' }}>{item.sub}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PersonCard({ stat, period, periodStart, isAdmin, onEdit }) {
  const { person, t, metric, target, actual, pct, prevActual } = stat
  const [expanded, setExpanded] = useState(false)
  const initials = person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const metricLabel = METRICS.find(m => m.value === metric)?.label
  const ringColor = pct === null ? 'var(--gray-200)' : pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  const daysLeft = daysLeftInPeriod(period)

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, boxShadow: `0 0 0 3px ${ringColor}` }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 1 }}>{ROLES_MAP[person.role] || person.roles?.name || 'No title'}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(person)} style={{ flexShrink: 0, padding: '4px 6px' }}>
            <Pencil size={13} />
          </button>
        )}
      </div>

      {t ? (
        <>
          {/* Progress section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircleProgress pct={pct ?? 0} size={88} stroke={8} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-900)' }}>{pct !== null ? `${Math.min(pct, 999)}%` : '—'}</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: 3 }}>
                {period === 'week' ? 'This Week' : 'This Month'}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1, marginBottom: 4 }}>
                {actual !== null ? actual : '—'}
                <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--gray-400)' }}> / {target}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <StatusChip pct={pct} />
                <TrendBadge current={actual} prev={prevActual} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gray-800)', marginTop: 1 }}>{target}</div>
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Days Left</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: daysLeft <= 1 ? 'var(--danger)' : daysLeft <= 3 ? 'var(--warning)' : 'var(--gray-800)', marginTop: 1 }}>{daysLeft}d</div>
            </div>
          </div>

          {/* Metric + expand */}
          <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {metricLabel
              ? <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.68rem' }}>{metricLabel}</span>
              : <span style={{ fontSize: '0.72rem', color: 'var(--gray-300)' }}>No metric</span>
            }
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', padding: 0 }}
            >
              {expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
            </button>
          </div>

          {expanded && metric && (
            <DrilldownPanel
              personId={person.id}
              metric={metric}
              periodStart={periodStart}
            />
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0', gap: '0.5rem' }}>
          <Target size={28} style={{ color: 'var(--gray-200)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-300)' }}>No target set</span>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => onEdit(person)} style={{ marginTop: 4, fontSize: '0.75rem' }}>Set Target</button>}
        </div>
      )}
    </div>
  )
}

function TableRow({ stat, period, isAdmin, onEdit, onExpand, expanded, periodStart }) {
  const { person, t, metric, target, actual, pct, prevActual } = stat
  const metricLabel = METRICS.find(m => m.value === metric)?.label
  const diff = actual !== null && prevActual !== null ? actual - prevActual : null

  return (
    <>
      <tr style={{ background: expanded ? 'var(--gray-50)' : undefined }}>
        <td>
          <div style={{ fontWeight: 600 }}>{person.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{ROLES_MAP[person.role] || person.roles?.name || '—'}</div>
        </td>
        <td>
          {metricLabel
            ? <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.72rem' }}>{metricLabel}</span>
            : <span className="text-muted text-sm">—</span>}
        </td>
        <td style={{ fontWeight: 600 }}>{t ? target : '—'}</td>
        <td>
          {actual !== null ? (
            <div>
              <div style={{ fontWeight: 600 }}>{actual} <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: '0.85rem' }}>/ {target}</span></div>
              {t && target > 0 && (
                <div style={{ height: 4, background: 'var(--gray-100)', borderRadius: 2, marginTop: 4, width: 80 }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)', borderRadius: 2 }} />
                </div>
              )}
            </div>
          ) : <span className="text-muted">—</span>}
        </td>
        <td>{pct !== null ? <StatusChip pct={pct} /> : <span className="text-muted">—</span>}</td>
        <td>
          {diff !== null ? (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              {diff > 0 ? '+' : ''}{diff}
            </span>
          ) : <span className="text-muted">—</span>}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 4 }}>
            {metric && <button className="btn btn-ghost btn-sm" onClick={onExpand} style={{ padding: '3px 6px' }}>{expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>}
            {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => onEdit(person)} style={{ padding: '3px 6px' }}><Pencil size={13} /></button>}
          </div>
        </td>
      </tr>
      {expanded && metric && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--gray-50)', paddingTop: 0 }}>
            <DrilldownPanel personId={person.id} metric={metric} periodStart={periodStart} />
          </td>
        </tr>
      )}
    </>
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
  const [period, setPeriod] = useState('week')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [expandedRows, setExpandedRows] = useState(new Set())

  const weekStart = getWeekStart()
  const monthStart = getMonthStart()
  const periodStart = period === 'week' ? weekStart : monthStart

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [t, a] = await Promise.all([
        getPersonTargets(),
        getPersonActuals(weekStart, monthStart),
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

  const personStats = activePeople.map(person => {
    const t = targetMap[person.id]
    const metric = t?.metric || null
    const target = period === 'week' ? t?.weekly_target : t?.monthly_target
    const actual = metric ? getActual(metric, person.id, actuals, period) : null
    const prevActual = metric ? getPrevActual(metric, person.id, actuals, period) : null
    const pct = (target > 0 && actual !== null) ? Math.round((actual / target) * 100) : null
    return { person, t, metric, target: target || 0, actual, prevActual, pct }
  })

  const withTargets = personStats.filter(s => s.t)
  const goalMet = withTargets.filter(s => s.pct !== null && s.pct >= 100).length
  const onTrack = withTargets.filter(s => s.pct !== null && s.pct >= 60 && s.pct < 100).length
  const behind = withTargets.filter(s => s.pct !== null && s.pct < 60).length

  const filtered = personStats.filter(s => {
    if (filter === 'goal_met') return s.pct !== null && s.pct >= 100
    if (filter === 'on_track') return s.pct !== null && s.pct >= 60 && s.pct < 100
    if (filter === 'behind') return s.pct !== null && s.pct < 60
    if (filter === 'no_target') return !s.t
    return true
  })

  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
            {['week', 'month'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '4px 14px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem', background: period === p ? 'var(--card-bg)' : 'transparent', color: period === p ? 'var(--gray-900)' : 'var(--gray-500)', boxShadow: period === p ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
                {p === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? 'var(--card-bg)' : 'transparent', color: viewMode === 'grid' ? 'var(--gray-900)' : 'var(--gray-400)', boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none', display: 'flex', alignItems: 'center' }}><LayoutGrid size={14} /></button>
            <button onClick={() => setViewMode('table')} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: viewMode === 'table' ? 'var(--card-bg)' : 'transparent', color: viewMode === 'table' ? 'var(--gray-900)' : 'var(--gray-400)', boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none', display: 'flex', alignItems: 'center' }}><LayoutList size={14} /></button>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { key: 'all', label: 'Total Members', value: activePeople.length, sub: `${withTargets.length} with targets`, color: 'var(--primary)' },
          { key: 'goal_met', label: 'Goal Met', value: goalMet, sub: '100%+ of target', color: 'var(--success)', Icon: TrendingUp },
          { key: 'on_track', label: 'On Track', value: onTrack, sub: '60–99% of target', color: 'var(--warning)', Icon: Minus },
          { key: 'behind', label: 'Behind', value: behind, sub: 'Under 60%', color: 'var(--danger)', Icon: TrendingDown },
        ].map(({ key, label, value, sub, color, Icon }) => (
          <div key={key} className="stat-card" style={{ cursor: 'pointer', borderColor: filter === key ? color : undefined }} onClick={() => setFilter(filter === key && key !== 'all' ? 'all' : key)}>
            <div className="stat-card-label">{label}</div>
            <div className="stat-card-value" style={{ color }}>{value}</div>
            <div className="stat-card-change" style={{ color, display: 'flex', alignItems: 'center', gap: 3, opacity: 0.8 }}>
              {Icon && <Icon size={11} />}{sub}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => <div key={i} className="card" style={{ height: 260, background: 'var(--gray-50)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
          <Target size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
          <p>No members match this filter.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filtered.map(stat => (
            <PersonCard
              key={stat.person.id}
              stat={stat}
              period={period}
              periodStart={periodStart}
              isAdmin={isAdmin}
              onEdit={setEditPerson}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Metric</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Status</th>
                <th>vs Last Period</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(stat => (
                <TableRow
                  key={stat.person.id}
                  stat={stat}
                  period={period}
                  periodStart={periodStart}
                  isAdmin={isAdmin}
                  onEdit={setEditPerson}
                  expanded={expandedRows.has(stat.person.id)}
                  onExpand={() => toggleRow(stat.person.id)}
                />
              ))}
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
      await upsertPersonTarget(person.id, form.metric, parseInt(form.weekly_target) || 0, parseInt(form.monthly_target) || 0, currentPersonId)
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
          {METRICS.map(m => <option key={m.value} value={m.value}>{m.label} — {m.description}</option>)}
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
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Target'}</button>
      </div>
    </Modal>
  )
}
