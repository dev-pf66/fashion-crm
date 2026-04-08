import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { getRangeProgress, getTeamTaskWorkload, getOverdueTasks, getStaleTasks, flagStaleTasks, getTaskMetrics, getTasks } from '../lib/supabase'
import { useApp } from '../App'
import StatusBadge from '../components/StatusBadge'
import {
  Shield, Layers, CheckSquare, AlertTriangle, Clock,
  Users, BarChart3, Target, Truck, ArrowRight, Timer, Bell,
  UserPlus, KeyRound, Eye, EyeOff
} from 'lucide-react'
import { adminCreateUser, adminResetPassword, adminListAuthUsers, getRoles } from '../lib/supabase'
import Modal from '../components/Modal'

const STATUS_COLORS = {
  concept: '#818cf8',
  development: '#60a5fa',
  sampling: '#fbbf24',
  costing: '#f472b6',
  approved: '#34d399',
  production: '#06b6d4',
  shipped: '#818cf8',
  cancelled: '#f87171',
  planning: '#9ca3af',
  active: '#34d399',
  locked: '#16a34a',
}

const TASK_STATUS_COLORS = {
  todo: '#9ca3af',
  in_progress: '#60a5fa',
  review: '#fbbf24',
  done: '#34d399',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { currentPerson, people, refreshPeople } = useApp()
  const [activeTab, setActiveTab] = useState('ranges')
  const [loading, setLoading] = useState(true)

  // Range data
  const [rangeData, setRangeData] = useState([])

  // Task data
  const [taskMetrics, setTaskMetrics] = useState(null)
  const [workload, setWorkload] = useState([])
  const [overdueTasks, setOverdueTasks] = useState([])
  const [staleTasks, setStaleTasks] = useState([])
  const [pipeline, setPipeline] = useState({ todo: 0, in_progress: 0, review: 0, done: 0 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [ranges, metrics, team, overdue, stale, allTasks] = await Promise.all([
        getRangeProgress(),
        getTaskMetrics(),
        getTeamTaskWorkload(),
        getOverdueTasks(),
        getStaleTasks(),
        getTasks(),
      ])
      setRangeData(ranges || [])
      setTaskMetrics(metrics)
      setWorkload(team || [])
      setOverdueTasks(overdue || [])
      setStaleTasks(stale || [])

      // Compute pipeline from all tasks
      const p = { todo: 0, in_progress: 0, review: 0, done: 0 }
      ;(allTasks || []).forEach(t => {
        if (p[t.status] !== undefined) p[t.status]++
      })
      setPipeline(p)
    } catch (err) {
      console.error('Failed to load admin data:', err)
      toast.error('Failed to load command center data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    )
  }

  // Range aggregates
  const totalRanges = rangeData.length
  const totalStyles = rangeData.reduce((s, r) => s + r.totalStyles, 0)
  const totalApproved = rangeData.reduce((s, r) => s + (r.byStatus.approved || 0), 0)
  const overallApprovedPct = totalStyles > 0 ? Math.round((totalApproved / totalStyles) * 100) : 0
  const allDrops = rangeData.flatMap(r => r.deliveryDrops || [])
  const uniqueDrops = [...new Set(allDrops.map(d => d.name))].length

  // Low-completion ranges alert
  const lowRanges = rangeData.filter(r => r.approvedPct < 30 && r.totalStyles > 0)

  // Active (non-done) tasks
  const activeTasks = (taskMetrics?.total || 0) - (taskMetrics?.done || 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={24} /> Command Center
          </h1>
          <p className="subtitle">Range planning progress & task management overview</p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'ranges' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranges')}
        >
          <Layers size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Range Planning
        </button>
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Tasks
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Users
        </button>
      </div>

      {activeTab === 'ranges' ? (
        <RangeTab
          rangeData={rangeData}
          totalRanges={totalRanges}
          totalStyles={totalStyles}
          overallApprovedPct={overallApprovedPct}
          uniqueDrops={uniqueDrops}
          lowRanges={lowRanges}
          navigate={navigate}
        />
      ) : activeTab === 'tasks' ? (
        <TaskTab
          metrics={taskMetrics}
          activeTasks={activeTasks}
          workload={workload}
          overdueTasks={overdueTasks}
          staleTasks={staleTasks}
          pipeline={pipeline}
          currentPerson={currentPerson}
          toast={toast}
        />
      ) : (
        <UsersTab people={people} toast={toast} refreshPeople={refreshPeople} />
      )}
    </div>
  )
}

// ── Range Planning Tab ──────────────────────────────────────

function RangeTab({ rangeData, totalRanges, totalStyles, overallApprovedPct, uniqueDrops, lowRanges, navigate }) {
  // Collect all delivery drops across ranges
  const dropMap = {}
  rangeData.forEach(r => {
    ;(r.deliveryDrops || []).forEach(d => {
      if (!dropMap[d.name]) dropMap[d.name] = { name: d.name, styles: [] }
      dropMap[d.name].styles.push(...d.styles)
    })
  })
  const drops = Object.values(dropMap)

  return (
    <>
      {lowRanges.length > 0 && (
        <div className="alert-box" style={{ background: 'var(--warning-light)', color: 'var(--warning)', borderColor: 'var(--warning)' }}>
          <AlertTriangle size={16} />
          <span>
            <strong>{lowRanges.length} range{lowRanges.length > 1 ? 's' : ''} below 30% approved:</strong>{' '}
            {lowRanges.map(r => r.name).join(', ')}
          </span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Ranges</div>
          <div className="stat-card-value">{totalRanges}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Styles</div>
          <div className="stat-card-value">{totalStyles}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Overall Approved</div>
          <div className="stat-card-value">{overallApprovedPct}%</div>
          <div className="stat-card-change" style={{ color: overallApprovedPct >= 70 ? 'var(--success)' : overallApprovedPct >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
            {overallApprovedPct >= 70 ? 'On Track' : overallApprovedPct >= 40 ? 'Needs Attention' : 'Behind'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Delivery Drops</div>
          <div className="stat-card-value">{uniqueDrops}</div>
        </div>
      </div>

      {/* Range Progress Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Range Progress</h3>
        </div>
        {rangeData.length === 0 ? (
          <p style={{ color: 'var(--gray-400)', fontSize: '0.8125rem' }}>No ranges found</p>
        ) : (
          <div className="admin-range-table">
            <table>
              <thead>
                <tr>
                  <th>Range</th>
                  <th>Status</th>
                  <th>Styles</th>
                  <th style={{ minWidth: 200 }}>Progress</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {rangeData.map(r => {
                  const maxVal = Math.max(r.totalStyles, 1)
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/range-planning/${r.id}`)}
                      style={{ cursor: 'pointer' }}
                      className="admin-range-row"
                    >
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.totalStyles}</td>
                      <td>
                        <div className="admin-stacked-bar">
                          {Object.entries(r.byStatus).map(([status, count]) => (
                            <div
                              key={status}
                              className="admin-stacked-segment"
                              style={{
                                width: `${(count / maxVal) * 100}%`,
                                background: STATUS_COLORS[status] || '#9ca3af',
                              }}
                              title={`${status}: ${count}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: r.approvedPct >= 70 ? 'var(--success)' : r.approvedPct >= 40 ? 'var(--warning)' : 'var(--danger)',
                        }}>
                          {r.approvedPct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery Drops */}
      {drops.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3><Truck size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Delivery Drops</h3>
          </div>
          <div className="admin-drops-grid">
            {drops.map(drop => {
              const statusCounts = {}
              drop.styles.forEach(s => {
                statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
              })
              return (
                <div key={drop.name} className="admin-drop-card">
                  <div className="admin-drop-header">
                    <strong>{drop.name}</strong>
                    <span className="admin-drop-count">{drop.styles.length} style{drop.styles.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="admin-drop-statuses">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <span key={status} className="admin-drop-status-chip">
                        <span className="admin-drop-dot" style={{ background: STATUS_COLORS[status] || '#9ca3af' }} />
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ── Tasks Tab ───────────────────────────────────────────────

function TaskTab({ metrics, activeTasks, workload, overdueTasks, staleTasks, pipeline, currentPerson, toast }) {
  const [flagging, setFlagging] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  async function handleFlagStale() {
    setFlagging(true)
    try {
      const count = await flagStaleTasks(currentPerson?.id)
      toast.success(`Sent ${count} stale task notification${count !== 1 ? 's' : ''}`)
    } catch (err) {
      console.error('Failed to flag stale tasks:', err)
      toast.error('Failed to send notifications')
    } finally {
      setFlagging(false)
    }
  }
  const pipelineTotal = Math.max(pipeline.todo + pipeline.in_progress + pipeline.review + pipeline.done, 1)

  return (
    <>
      {overdueTasks.length > 0 && (
        <div className="alert-box">
          <AlertTriangle size={16} />
          <span>
            <strong>{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</strong> require attention
          </span>
        </div>
      )}

      {staleTasks.length > 0 && (
        <div className="alert-box" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--warning)' }}>
          <Timer size={16} />
          <span>
            <strong>{staleTasks.length} task{staleTasks.length > 1 ? 's' : ''} not started</strong> for 7+ days
          </span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Active Tasks</div>
          <div className="stat-card-value">{activeTasks}</div>
        </div>
        <div className={`stat-card ${metrics?.overdue > 0 ? 'alert' : ''}`}>
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value" style={{ color: metrics?.overdue > 0 ? 'var(--danger)' : undefined }}>
            {metrics?.overdue || 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value">{metrics?.inProgress || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Due Today</div>
          <div className="stat-card-value">{metrics?.dueToday || 0}</div>
        </div>
        <div className={`stat-card ${staleTasks.length > 0 ? 'alert' : ''}`}>
          <div className="stat-card-label">Stale (7d+)</div>
          <div className="stat-card-value" style={{ color: staleTasks.length > 0 ? 'var(--warning)' : undefined }}>
            {staleTasks.length}
          </div>
        </div>
      </div>

      {/* Team Workload */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3><Users size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Team Workload</h3>
        </div>
        {workload.length === 0 ? (
          <p style={{ color: 'var(--gray-400)', fontSize: '0.8125rem' }}>No task assignments found</p>
        ) : (
          <div className="admin-workload-grid">
            {workload.map(person => {
              const barColor = person.overdue > 0 ? 'var(--danger)' : person.total > 8 ? 'var(--warning)' : 'var(--success)'
              const maxTasks = Math.max(...workload.map(p => p.total), 1)
              return (
                <div key={person.id} className="admin-workload-card">
                  <div className="admin-workload-header">
                    <div className="admin-workload-avatar">
                      {person.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{person.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        {person.total} task{person.total !== 1 ? 's' : ''}
                        {person.overdue > 0 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>{person.overdue} overdue</span>}
                      </div>
                    </div>
                  </div>
                  <div className="chart-bar-track" style={{ height: 10, marginTop: 8 }}>
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: `${(person.total / maxTasks) * 100}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  <div className="admin-workload-breakdown">
                    {person.todo > 0 && <span>To Do: {person.todo}</span>}
                    {person.inProgress > 0 && <span>In Progress: {person.inProgress}</span>}
                    {person.review > 0 && <span>Review: {person.review}</span>}
                    {person.highPriority > 0 && <span style={{ color: 'var(--danger)' }}>High/Urgent: {person.highPriority}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Overdue & Blockers */}
      {overdueTasks.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3><Clock size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Overdue & Blockers</h3>
          </div>
          <div className="admin-overdue-list">
            {overdueTasks.map(task => {
              const daysOverdue = Math.floor((new Date(today) - new Date(task.due_date)) / 86400000)
              return (
                <div key={task.id} className="admin-overdue-item">
                  <div className="admin-overdue-info">
                    <span className="admin-overdue-title">{task.title}</span>
                    <span className="admin-overdue-meta">
                      {task.people?.name || 'Unassigned'}
                      {' · '}
                      <StatusBadge status={task.status} />
                    </span>
                  </div>
                  <div className="admin-overdue-days">
                    {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stale Tasks */}
      {staleTasks.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><Timer size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Not Started (7+ days)</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleFlagStale}
              disabled={flagging}
            >
              <Bell size={14} /> {flagging ? 'Sending...' : 'Notify Assignees'}
            </button>
          </div>
          <div className="admin-overdue-list">
            {staleTasks.map(task => {
              const age = Math.floor((new Date(today) - new Date(task.created_at)) / 86400000)
              return (
                <div key={task.id} className="admin-overdue-item">
                  <div className="admin-overdue-info">
                    <span className="admin-overdue-title">{task.title}</span>
                    <span className="admin-overdue-meta">
                      {task.people?.name || 'Unassigned'}
                      {' · '}
                      <span style={{ color: 'var(--warning)', fontWeight: 600 }}>todo</span>
                    </span>
                  </div>
                  <div className="admin-overdue-days" style={{ color: 'var(--warning)' }}>
                    {age} day{age !== 1 ? 's' : ''} idle
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Task Pipeline */}
      <div className="card">
        <div className="card-header">
          <h3><BarChart3 size={16} style={{ marginRight: 6, verticalAlign: -2 }} /> Task Pipeline</h3>
        </div>
        <div className="admin-pipeline">
          <div className="admin-pipeline-bar">
            {['todo', 'in_progress', 'review', 'done'].map(status => {
              const count = pipeline[status]
              const pct = (count / pipelineTotal) * 100
              if (count === 0) return null
              return (
                <div
                  key={status}
                  className="admin-pipeline-segment"
                  style={{
                    width: `${pct}%`,
                    background: TASK_STATUS_COLORS[status],
                  }}
                  title={`${status}: ${count}`}
                />
              )
            })}
          </div>
          <div className="admin-pipeline-legend">
            {[
              { key: 'todo', label: 'To Do' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'review', label: 'Review' },
              { key: 'done', label: 'Done' },
            ].map(item => (
              <div key={item.key} className="admin-pipeline-legend-item">
                <span className="admin-drop-dot" style={{ background: TASK_STATUS_COLORS[item.key] }} />
                {item.label}: {pipeline[item.key]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Users Tab ───────────────────────────────────────────────

function UsersTab({ people, toast, refreshPeople }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [resetModal, setResetModal] = useState(null)
  const [authUsers, setAuthUsers] = useState([])
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    loadAuthUsers()
  }, [])

  async function loadAuthUsers() {
    setLoadingAuth(true)
    try {
      const { users } = await adminListAuthUsers()
      setAuthUsers(users || [])
    } catch (err) {
      console.error('Failed to load auth users:', err)
    } finally {
      setLoadingAuth(false)
    }
  }

  // Merge people records with auth user data
  const mergedUsers = people.map(p => {
    const authUser = authUsers.find(u => u.id === p.user_id || u.email === p.email)
    return {
      ...p,
      lastSignIn: authUser?.last_sign_in_at,
      authId: authUser?.id,
      confirmed: !!authUser?.email_confirmed_at,
    }
  })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <span className="text-muted text-sm">{people.length} team members</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mergedUsers.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td className="text-muted">{user.email}</td>
                <td>
                  {user.roles?.name ? (
                    <span className={`role-badge role-${user.roles.name}`}>{user.roles.name}</span>
                  ) : (
                    <span className="text-muted">No role</span>
                  )}
                </td>
                <td className="text-muted text-sm">
                  {user.lastSignIn
                    ? new Date(user.lastSignIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Never'
                  }
                </td>
                <td>
                  {user.is_active !== false ? (
                    <span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>Active</span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>Inactive</span>
                  )}
                </td>
                <td>
                  {user.authId && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setResetModal(user)}
                      title="Reset password"
                    >
                      <KeyRound size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            refreshPeople()
            loadAuthUsers()
            toast.success('User created successfully')
          }}
          toast={toast}
        />
      )}

      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
          toast={toast}
        />
      )}
    </>
  )
}

function CreateUserModal({ onClose, onCreated, toast }) {
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '' })
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    getRoles().then(setRoles).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    setSaving(true)
    try {
      await adminCreateUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role_id: form.role_id || null,
      })
      onCreated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Team Member" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name *</label>
          <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label>Temporary Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '0.25rem' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Permission Role *</label>
          <select value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))} required>
            <option value="">Select role...</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose, toast }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password || password.length < 6) return
    setSaving(true)
    try {
      await adminResetPassword(user.authId, password)
      toast.success(`Password reset for ${user.name}`)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Reset Password: ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '0.25rem' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
