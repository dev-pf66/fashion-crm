import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../App'
import { usePermissions } from '../hooks/usePermissions'
import NoAccessScreen from '../components/NoAccessScreen'
import {
  getTeamTaskWorkload, getLastActivityPerPerson, getPersonActuals,
  getOverdueTasks, getStaleTasks, getAllAssignedStyles, getTasks,
  getAuditLog, getPersonTargets,
} from '../lib/supabase'
import {
  Activity, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, X, BookOpen, Zap, Users,
  AlertCircle, Package, ListChecks, Timer, Star, Eye,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────

function relTime(ts) {
  if (!ts) return '—'
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60000) return 'just now'
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
  return `${Math.floor(d / 86400000)}d ago`
}

function daysOverdue(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function fmtEntity(t) {
  return (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_COLOR = { todo: '#94a3b8', in_progress: '#60a5fa', review: '#fbbf24', done: '#34d399' }
const PRIORITY_COLOR = { low: '#94a3b8', medium: '#60a5fa', high: '#f97316', urgent: '#ef4444' }

// ─── guide ───────────────────────────────────────────────────────────────────

function Guide({ onDismiss }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, color: '#e0e7ff', position: 'relative' }}>
      <button onClick={onDismiss} title="Dismiss guide" style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
        <X size={14} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <BookOpen size={18} color="#a5b4fc" />
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>How to read Team Pulse</span>
        <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.15)', borderRadius: 99, color: '#c7d2fe' }}>Guide · dismiss when ready</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: 12.5, lineHeight: 1.5 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>Status dots</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span><span style={{ color: '#34d399' }}>●</span> <b>Green</b> — active in the last 24h</span>
            <span><span style={{ color: '#fbbf24' }}>●</span> <b>Yellow</b> — active this week</span>
            <span><span style={{ color: '#f87171' }}>●</span> <b>Red</b> — dormant 3+ days or has overdue tasks</span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>Velocity badge</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span><b>↑ 5 done</b> — completed 5 tasks this week (up from last week)</span>
            <span><b>↓ 1 done</b> — slower than last week</span>
            <span><b>→ 0 done</b> — nothing completed yet this week</span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>Overdue vs Stale</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span><b>Overdue</b> — task past its due date, not done yet</span>
            <span><b>Stale</b> — task sitting as "To Do" for 7+ days without being started</span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>How to use it</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Sort by <b>Risk</b> to see who needs attention first</span>
            <span>Click any person row to expand their full breakdown</span>
            <span>Use <b>Sort by Overdue</b> when chasing deadlines</span>
            <span>Use <b>Slowest</b> to find people losing momentum</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── per-person expanded detail ───────────────────────────────────────────────

function PersonDetail({ person, overdue, stale, activeTasks, collabTasks, pieces, weekActivity, actuals }) {
  const doneThisWeek = actuals?.tasksWeek?.[person.id] || 0
  const doneLastWeek = actuals?.tasksPrevWeek?.[person.id] || 0
  const doneThisMonth = actuals?.tasksMonth?.[person.id] || 0

  const inProgress = activeTasks.filter(t => t.status === 'in_progress')
  const inReview = activeTasks.filter(t => t.status === 'review')
  const todo = activeTasks.filter(t => t.status === 'todo')

  const Section = ({ icon: Icon, title, count, color = '#60a5fa', children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        <Icon size={13} color={color} />
        <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)' }}>{title}</span>
        {count !== undefined && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: color + '22', color }}>{count}</span>}
      </div>
      {children}
    </div>
  )

  const TaskRow = ({ task, showDue = true }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0', fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[task.priority] || '#94a3b8', flexShrink: 0, marginTop: 3 }} />
      <span style={{ flex: 1, color: 'var(--text-primary)' }}>{task.title}</span>
      {showDue && task.due_date && (
        <span style={{ color: new Date(task.due_date) < new Date() ? '#ef4444' : 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 11 }}>
          {new Date(task.due_date) < new Date() ? `${daysOverdue(task.due_date)}d overdue` : new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  )

  return (
    <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>

      {/* Velocity & stats */}
      <Section icon={Zap} title="This week" color="#818cf8">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          {[
            { label: 'Done this week', val: doneThisWeek, color: '#34d399' },
            { label: 'Done this month', val: doneThisMonth, color: '#60a5fa' },
            { label: 'vs last week', val: doneThisWeek - doneLastWeek, color: doneThisWeek >= doneLastWeek ? '#34d399' : '#f87171', prefix: doneThisWeek > doneLastWeek ? '+' : '' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '8px 4px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.prefix}{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Overdue */}
      <Section icon={AlertTriangle} title="Overdue tasks" count={overdue.length} color="#ef4444">
        {overdue.length === 0
          ? <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Nothing overdue ✓</p>
          : overdue.map(t => <TaskRow key={t.id} task={t} />)
        }
      </Section>

      {/* Stale */}
      <Section icon={Timer} title="Stale (not started 7d+)" count={stale.length} color="#f97316">
        {stale.length === 0
          ? <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>No stale tasks ✓</p>
          : stale.map(t => <TaskRow key={t.id} task={t} showDue={false} />)
        }
      </Section>

      {/* In progress */}
      {inProgress.length > 0 && (
        <Section icon={Activity} title="In progress" count={inProgress.length} color="#60a5fa">
          {inProgress.map(t => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}

      {/* In review */}
      {inReview.length > 0 && (
        <Section icon={Eye} title="Awaiting review" count={inReview.length} color="#fbbf24">
          {inReview.map(t => <TaskRow key={t.id} task={t} />)}
        </Section>
      )}

      {/* To do */}
      {todo.length > 0 && (
        <Section icon={ListChecks} title="To do" count={todo.length} color="#94a3b8">
          {todo.slice(0, 8).map(t => <TaskRow key={t.id} task={t} />)}
          {todo.length > 8 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>+ {todo.length - 8} more</div>}
        </Section>
      )}

      {/* Collaborating on */}
      {collabTasks.length > 0 && (
        <Section icon={Users} title="Collaborating on" count={collabTasks.length} color="#a78bfa">
          {collabTasks.slice(0, 6).map(t => <TaskRow key={t.id} task={t} />)}
          {collabTasks.length > 6 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>+ {collabTasks.length - 6} more</div>}
        </Section>
      )}

      {/* Production pieces */}
      {pieces.length > 0 && (
        <Section icon={Package} title="Production pieces" count={pieces.length} color="#34d399">
          {pieces.slice(0, 6).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 }}>
              <span style={{ flex: 1 }}>{p.name || `#${p.id}`}</span>
              {p.stage?.name && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: (p.stage.color || '#94a3b8') + '33', color: p.stage.color || '#94a3b8', fontWeight: 500 }}>{p.stage.name}</span>}
              {p.status_updated_at && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{relTime(p.status_updated_at)}</span>}
            </div>
          ))}
          {pieces.length > 6 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>+ {pieces.length - 6} more</div>}
        </Section>
      )}

      {/* Activity this week */}
      <Section icon={Clock} title="Activity this week" count={weekActivity.length} color="#38bdf8">
        {weekActivity.length === 0
          ? <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>No recorded activity this week</p>
          : weekActivity.slice(0, 8).map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{relTime(e.created_at)}</span>
              <span style={{ color: 'var(--text-primary)' }}>{e.action} <span style={{ color: 'var(--text-secondary)' }}>{fmtEntity(e.entity_type)}</span>{e.details?.name ? ` — ${e.details.name}` : ''}</span>
            </div>
          ))
        }
        {weekActivity.length > 8 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>+ {weekActivity.length - 8} more this week</div>}
      </Section>
    </div>
  )
}

// ─── person row ───────────────────────────────────────────────────────────────

function PersonRow({ person, workload, actuals, lastAct, overdue, stale, activeTasks, collabTasks, pieces, weekActivity, expanded, onToggle }) {
  const doneThisWeek = actuals?.tasksWeek?.[person.id] || 0
  const doneLastWeek = actuals?.tasksPrevWeek?.[person.id] || 0
  const velocityDelta = doneThisWeek - doneLastWeek
  const lastActAge = lastAct ? Date.now() - new Date(lastAct.created_at).getTime() : Infinity
  const isDormant = lastActAge > 3 * 86400000
  const isActiveToday = lastActAge < 86400000
  const dot = isDormant || overdue.length > 0 ? '#f87171' : isActiveToday ? '#34d399' : '#fbbf24'
  const wl = workload || {}

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'var(--bg-card)' }}>
      {/* Collapsed row */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Avatar + dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {initials(person.name)}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: dot, border: '2px solid var(--bg-card)' }} />
        </div>

        {/* Name + role */}
        <div style={{ minWidth: 140, flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{person.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{person.roles?.name || '—'}</div>
        </div>

        {/* Metrics strip */}
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {/* Task load */}
          {wl.total > 0 && (
            <Chip color="#60a5fa" bg="#dbeafe">{wl.total} active</Chip>
          )}
          {wl.inProgress > 0 && (
            <Chip color="#6366f1" bg="#e0e7ff">{wl.inProgress} in progress</Chip>
          )}
          {wl.review > 0 && (
            <Chip color="#d97706" bg="#fef3c7">{wl.review} in review</Chip>
          )}
          {overdue.length > 0 && (
            <Chip color="#dc2626" bg="#fee2e2">{overdue.length} overdue</Chip>
          )}
          {stale.length > 0 && (
            <Chip color="#ea580c" bg="#ffedd5">{stale.length} stale</Chip>
          )}
          {pieces.length > 0 && (
            <Chip color="#059669" bg="#d1fae5">{pieces.length} piece{pieces.length !== 1 ? 's' : ''}</Chip>
          )}
          {collabTasks.length > 0 && (
            <Chip color="#7c3aed" bg="#ede9fe">{collabTasks.length} collab</Chip>
          )}
        </div>

        {/* Velocity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, minWidth: 80, justifyContent: 'flex-end' }}>
          {velocityDelta > 0
            ? <TrendingUp size={14} color="#34d399" />
            : velocityDelta < 0
            ? <TrendingDown size={14} color="#f87171" />
            : <Minus size={14} color="#94a3b8" />
          }
          <span style={{ fontSize: 12, fontWeight: 600, color: velocityDelta > 0 ? '#34d399' : velocityDelta < 0 ? '#f87171' : '#94a3b8' }}>
            {doneThisWeek} done
          </span>
        </div>

        {/* Last active */}
        <div style={{ flexShrink: 0, minWidth: 72, textAlign: 'right', fontSize: 11, color: isDormant ? '#f87171' : 'var(--text-secondary)' }}>
          {lastAct ? relTime(lastAct.created_at) : 'No activity'}
        </div>

        {/* Expand toggle */}
        <div style={{ flexShrink: 0, color: 'var(--text-secondary)' }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <PersonDetail
          person={person}
          overdue={overdue}
          stale={stale}
          activeTasks={activeTasks}
          collabTasks={collabTasks}
          pieces={pieces}
          weekActivity={weekActivity}
          actuals={actuals}
        />
      )}
    </div>
  )
}

function Chip({ color, bg, children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: bg, color }}>{children}</span>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function TeamPulse() {
  const { people } = useApp()
  const { can } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(() => !localStorage.getItem('teamPulseGuideDismissed'))
  const [expandedId, setExpandedId] = useState(null)
  const [sort, setSort] = useState('risk')
  const [filterRole, setFilterRole] = useState('')

  // Data
  const [workloadMap, setWorkloadMap] = useState({})
  const [actuals, setActuals] = useState(null)
  const [lastActivity, setLastActivity] = useState({})
  const [overdueByPerson, setOverdueByPerson] = useState({})
  const [staleByPerson, setStaleByPerson] = useState({})
  const [piecesByPerson, setPiecesByPerson] = useState({})
  const [tasksByPerson, setTasksByPerson] = useState({})
  const [collabByPerson, setCollabByPerson] = useState({})
  const [activityByPerson, setActivityByPerson] = useState({})

  if (!can('admin.access')) return <NoAccessScreen />

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0)
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0)

    try {
      const [wl, acts, lastAct, overdue, stale, allPieces, allTasks, weekLog] = await Promise.all([
        getTeamTaskWorkload(),
        getPersonActuals(weekStart.toISOString(), monthStart.toISOString()),
        getLastActivityPerPerson(),
        getOverdueTasks(),
        getStaleTasks(),
        getAllAssignedStyles(),
        getTasks(),
        getAuditLog({ since: weekStart.toISOString(), limit: 1000 }),
      ])

      // workload map
      const wlMap = {}
      ;(wl || []).forEach(p => { wlMap[p.id] = p })
      setWorkloadMap(wlMap)
      setActuals(acts)
      setLastActivity(lastAct || {})

      // overdue grouped by person
      const odMap = {}
      ;(overdue || []).forEach(t => {
        if (!t.people?.id) return
        if (!odMap[t.people.id]) odMap[t.people.id] = []
        odMap[t.people.id].push(t)
      })
      setOverdueByPerson(odMap)

      // stale grouped by person
      const staleMap = {}
      ;(stale || []).forEach(t => {
        if (!t.people?.id) return
        if (!staleMap[t.people.id]) staleMap[t.people.id] = []
        staleMap[t.people.id].push(t)
      })
      setStaleByPerson(staleMap)

      // pieces grouped by person with stage info
      const piecesMap = {}
      ;(allPieces || []).forEach(p => {
        if (!p.assigned_to) return
        if (!piecesMap[p.assigned_to]) piecesMap[p.assigned_to] = []
        piecesMap[p.assigned_to].push(p)
      })
      setPiecesByPerson(piecesMap)

      // tasks by person (active only) + collaborations
      const tasksMap = {}
      const collabMap = {}
      ;(allTasks || []).filter(t => t.status !== 'done').forEach(t => {
        if (t.assigned_to) {
          if (!tasksMap[t.assigned_to]) tasksMap[t.assigned_to] = []
          tasksMap[t.assigned_to].push(t)
        }
        ;(t.collaborators || []).forEach(cid => {
          if (cid !== t.assigned_to) {
            if (!collabMap[cid]) collabMap[cid] = []
            collabMap[cid].push(t)
          }
        })
      })
      setTasksByPerson(tasksMap)
      setCollabByPerson(collabMap)

      // activity this week by person
      const actMap = {}
      ;(weekLog || []).filter(e => e.person_id && e.entity_type !== 'whatsapp_notification' && e.entity_type !== 'task_attachment').forEach(e => {
        if (!actMap[e.person_id]) actMap[e.person_id] = []
        actMap[e.person_id].push(e)
      })
      setActivityByPerson(actMap)

    } catch (err) {
      console.error('TeamPulse load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  function riskScore(person) {
    const overdue = (overdueByPerson[person.id] || []).length
    const stale = (staleByPerson[person.id] || []).length
    const lastAct = lastActivity[person.id]
    const age = lastAct ? Date.now() - new Date(lastAct.created_at).getTime() : Infinity
    const doneThisWeek = actuals?.tasksWeek?.[person.id] || 0
    const doneLastWeek = actuals?.tasksPrevWeek?.[person.id] || 0
    let score = 0
    if (overdue > 0) score += overdue * 10
    if (age > 3 * 86400000) score += 20
    if (stale > 0) score += stale * 5
    if (doneThisWeek < doneLastWeek) score += 5
    return score
  }

  const activePeople = useMemo(() =>
    people.filter(p => p.is_active !== false && (!filterRole || p.roles?.name === filterRole)),
    [people, filterRole]
  )

  const sortedPeople = useMemo(() => {
    return [...activePeople].sort((a, b) => {
      if (sort === 'risk') return riskScore(b) - riskScore(a)
      if (sort === 'overdue') return (overdueByPerson[b.id]?.length || 0) - (overdueByPerson[a.id]?.length || 0)
      if (sort === 'slowest') return (actuals?.tasksWeek?.[a.id] || 0) - (actuals?.tasksWeek?.[b.id] || 0)
      if (sort === 'load') return (workloadMap[b.id]?.total || 0) - (workloadMap[a.id]?.total || 0)
      if (sort === 'lastActive') {
        const aa = lastActivity[a.id]?.created_at || '1970'
        const bb = lastActivity[b.id]?.created_at || '1970'
        return new Date(aa) - new Date(bb)
      }
      return a.name.localeCompare(b.name)
    })
  }, [activePeople, sort, workloadMap, actuals, lastActivity, overdueByPerson])

  // Summary counts
  const redCount = activePeople.filter(p => riskScore(p) >= 20).length
  const orangeCount = activePeople.filter(p => { const s = riskScore(p); return s > 0 && s < 20 }).length
  const greenCount = activePeople.filter(p => riskScore(p) === 0).length

  const uniqueRoles = [...new Set(people.map(p => p.roles?.name).filter(Boolean))]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={22} color="#f87171" /> Team Pulse
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Every person · every task · full picture — updated live
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!showGuide && (
            <button onClick={() => setShowGuide(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
              <BookOpen size={13} /> Guide
            </button>
          )}
          <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <Guide onDismiss={() => { setShowGuide(false); localStorage.setItem('teamPulseGuideDismissed', '1') }} />
      )}

      {/* Summary health bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'On track', count: greenCount, color: '#34d399', bg: '#d1fae5', icon: CheckCircle },
          { label: 'At risk', count: orangeCount, color: '#f97316', bg: '#ffedd5', icon: AlertCircle },
          { label: 'Needs attention', count: redCount, color: '#ef4444', bg: '#fee2e2', icon: AlertTriangle },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon size={18} color={color} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 12, color, opacity: 0.8, marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="risk">Sort: Highest risk first</option>
          <option value="overdue">Sort: Most overdue</option>
          <option value="slowest">Sort: Slowest velocity</option>
          <option value="load">Sort: Most loaded</option>
          <option value="lastActive">Sort: Least active</option>
          <option value="alpha">Sort: A → Z</option>
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="">All roles</option>
          {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>{sortedPeople.length} people</span>
        {expandedId && (
          <button onClick={() => setExpandedId(null)} style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Collapse all
          </button>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', gap: 12, padding: '0 16px', marginBottom: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <div style={{ width: 36 }} />
        <div style={{ minWidth: 140 }}>Person</div>
        <div style={{ flex: 1 }}>Work summary</div>
        <div style={{ minWidth: 80, textAlign: 'right' }}>Velocity</div>
        <div style={{ minWidth: 72, textAlign: 'right' }}>Last active</div>
        <div style={{ width: 16 }} />
      </div>

      {/* Person list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
          Loading team data…
        </div>
      ) : sortedPeople.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>No active team members found</div>
      ) : (
        sortedPeople.map(person => (
          <PersonRow
            key={person.id}
            person={person}
            workload={workloadMap[person.id]}
            actuals={actuals}
            lastAct={lastActivity[person.id]}
            overdue={overdueByPerson[person.id] || []}
            stale={staleByPerson[person.id] || []}
            activeTasks={tasksByPerson[person.id] || []}
            collabTasks={collabByPerson[person.id] || []}
            pieces={piecesByPerson[person.id] || []}
            weekActivity={activityByPerson[person.id] || []}
            expanded={expandedId === person.id}
            onToggle={() => setExpandedId(expandedId === person.id ? null : person.id)}
          />
        ))
      )}
    </div>
  )
}
