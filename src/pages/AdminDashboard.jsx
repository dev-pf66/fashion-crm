import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { getRangeProgress, getTeamTaskWorkload, getOverdueTasks, getStaleTasks, flagStaleTasks, getTaskMetrics, getTasks } from '../lib/supabase'
import { useApp } from '../App'
import StatusBadge from '../components/StatusBadge'
import {
  Shield, Layers, CheckSquare, AlertTriangle, Clock,
  Users, BarChart3, Target, Truck, ArrowRight, Timer, Bell,
  UserPlus, KeyRound, Eye, EyeOff, Settings, Plus, Pencil, Trash2, Mail, MailX, Activity as ActivityIcon, Filter, X as XIcon
} from 'lucide-react'
import { adminCreateUser, adminResetPassword, adminListAuthUsers, getRoles, getSilhouettes, createSilhouette, updateSilhouette, deleteSilhouette, getPriceBrackets, createPriceBracket, updatePriceBracket, deletePriceBracket, getProductionStages, createProductionStage, updateProductionStage, deleteProductionStage, getStyleStatuses, createStyleStatus, updateStyleStatus, deleteStyleStatus, updateEmailNotifications, getAuditLog, getLastActivityPerPerson } from '../lib/supabase'
import Modal from '../components/Modal'
import { DashboardSkeleton, ListSkeleton } from '../components/PageSkeleton'

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
      <DashboardSkeleton />
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
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/emails')}>
            <Mail size={14} /> Email Log
          </button>
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
        <button
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Config
        </button>
        <button
          className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <ActivityIcon size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
          Activity
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
      ) : activeTab === 'users' ? (
        <UsersTab people={people} toast={toast} refreshPeople={refreshPeople} />
      ) : activeTab === 'config' ? (
        <ConfigTab toast={toast} />
      ) : (
        <ActivityTab people={people} toast={toast} />
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
              <th>Emails</th>
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
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      const newVal = user.email_notifications_enabled === false
                      try {
                        await updateEmailNotifications(user.id, newVal)
                        refreshPeople()
                        toast.success(`Email notifications ${newVal ? 'enabled' : 'disabled'} for ${user.name}`)
                      } catch (err) {
                        toast.error('Failed to update')
                      }
                    }}
                    title={user.email_notifications_enabled !== false ? 'Disable email notifications' : 'Enable email notifications'}
                  >
                    {user.email_notifications_enabled !== false ? (
                      <Mail size={14} style={{ color: 'var(--success)' }} />
                    ) : (
                      <MailX size={14} style={{ color: 'var(--gray-400)' }} />
                    )}
                  </button>
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

// ── Config Tab ──────────────────────────────────────────────

function ConfigTab({ toast }) {
  const [subTab, setSubTab] = useState('statuses')

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${subTab === 'statuses' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('statuses')}
        >
          Statuses
        </button>
        <button
          className={`btn btn-sm ${subTab === 'price_brackets' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('price_brackets')}
        >
          Price Brackets
        </button>
        <button
          className={`btn btn-sm ${subTab === 'silhouettes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('silhouettes')}
        >
          Silhouettes
        </button>
        <button
          className={`btn btn-sm ${subTab === 'stages' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('stages')}
        >
          Production Stages
        </button>
      </div>
      {subTab === 'statuses' ? <StatusesManager toast={toast} />
        : subTab === 'silhouettes' ? <SilhouettesManager toast={toast} />
        : subTab === 'price_brackets' ? <PriceBracketsManager toast={toast} />
        : <ProductionStagesManager toast={toast} />}
    </>
  )
}

function StatusesManager({ toast }) {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ value: '', label: '', color: '#9ca3af', sort_order: 0, is_active: true })
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ value: '', label: '', color: '#9ca3af', sort_order: 0 })

  useEffect(() => { loadStatuses() }, [])

  async function loadStatuses() {
    setLoading(true)
    try {
      const data = await getStyleStatuses()
      setStatuses(data)
    } catch (err) {
      toast.error('Failed to load statuses')
    } finally {
      setLoading(false)
    }
  }

  function slugify(s) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.label.trim()) return
    const value = addForm.value.trim() || slugify(addForm.label)
    try {
      await createStyleStatus({
        value,
        label: addForm.label.trim(),
        color: addForm.color,
        sort_order: addForm.sort_order || 0,
      })
      toast.success('Status added')
      setAdding(false)
      setAddForm({ value: '', label: '', color: '#9ca3af', sort_order: 0 })
      loadStatuses()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'A status with this value already exists' : 'Failed to add')
    }
  }

  async function handleUpdate(id) {
    try {
      await updateStyleStatus(id, {
        value: editForm.value.trim(),
        label: editForm.label.trim(),
        color: editForm.color,
        sort_order: editForm.sort_order || 0,
        is_active: editForm.is_active,
      })
      toast.success('Status updated')
      setEditingId(null)
      loadStatuses()
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  async function handleDelete(id, label) {
    if (!confirm(`Delete status "${label}"?\n\nExisting pieces with this status will keep the value but it won't appear in the dropdown anymore.`)) return
    try {
      await deleteStyleStatus(id)
      toast.success('Status deleted')
      loadStatuses()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  if (loading) return <ListSkeleton rows={5} />

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Range Plan Statuses</h3>
          <p className="text-muted text-sm" style={{ margin: 0 }}>Edit the status dropdown shown on every range plan piece.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setAddForm({ value: '', label: '', color: '#9ca3af', sort_order: (statuses[statuses.length - 1]?.sort_order || 0) + 1 }) }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Label</label>
            <input type="text" value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. In Review" required autoFocus />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Value <span className="text-muted">(auto from label)</span></label>
            <input type="text" value={addForm.value} onChange={e => setAddForm(p => ({ ...p, value: e.target.value }))} placeholder="auto" />
          </div>
          <div className="form-group" style={{ width: 60, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Color</label>
            <input type="color" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} style={{ height: 32, padding: 2 }} />
          </div>
          <div className="form-group" style={{ width: 70, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Order</label>
            <input type="number" value={addForm.sort_order} onChange={e => setAddForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}

      <table className="data-table" style={{ fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
            <th>Color</th>
            <th>Order</th>
            <th>Active</th>
            <th style={{ width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map(s => (
            <tr key={s.id}>
              {editingId === s.id ? (
                <>
                  <td><input type="text" value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} style={{ fontSize: '0.8125rem' }} /></td>
                  <td><input type="text" value={editForm.value} onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))} style={{ fontSize: '0.8125rem' }} /></td>
                  <td><input type="color" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} style={{ height: 28, padding: 2, width: 50 }} /></td>
                  <td><input type="number" value={editForm.sort_order} onChange={e => setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ fontSize: '0.8125rem', width: 60 }} /></td>
                  <td><input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(s.id)} style={{ padding: '0.25rem 0.5rem' }}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ padding: '0.25rem 0.5rem' }}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td>
                    <span className="tag" style={{ background: s.color, color: '#fff', fontWeight: 500 }}>{s.label}</span>
                  </td>
                  <td className="text-muted"><code style={{ fontSize: '0.75rem' }}>{s.value}</code></td>
                  <td><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 3, background: s.color, border: '1px solid var(--gray-200)', verticalAlign: 'middle' }} /></td>
                  <td className="text-muted">{s.sort_order}</td>
                  <td>{s.is_active ? <span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>Yes</span> : <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>No</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(s.id); setEditForm({ value: s.value, label: s.label, color: s.color || '#9ca3af', sort_order: s.sort_order, is_active: s.is_active !== false }) }} style={{ padding: '0.25rem' }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id, s.label)} style={{ padding: '0.25rem', color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {statuses.length === 0 && (
            <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No statuses found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SilhouettesManager({ toast }) {
  const [silhouettes, setSilhouettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', category: '', sort_order: 0 })
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: '', sort_order: 0 })

  useEffect(() => { loadSilhouettes() }, [])

  async function loadSilhouettes() {
    setLoading(true)
    try {
      const data = await getSilhouettes()
      setSilhouettes(data)
    } catch (err) {
      toast.error('Failed to load silhouettes')
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(silhouettes.map(s => s.category))].sort()
  const filtered = filterCategory ? silhouettes.filter(s => s.category === filterCategory) : silhouettes

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.category.trim()) return
    try {
      await createSilhouette({
        name: addForm.name.trim(),
        category: addForm.category.trim(),
        sort_order: addForm.sort_order || 0,
      })
      toast.success('Silhouette added')
      setAdding(false)
      setAddForm({ name: '', category: '', sort_order: 0 })
      loadSilhouettes()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'This silhouette already exists for that category' : 'Failed to add')
    }
  }

  async function handleUpdate(id) {
    try {
      await updateSilhouette(id, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        sort_order: editForm.sort_order || 0,
      })
      toast.success('Silhouette updated')
      setEditingId(null)
      loadSilhouettes()
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete silhouette "${name}"?`)) return
    try {
      await deleteSilhouette(id)
      toast.success('Silhouette deleted')
      loadSilhouettes()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  if (loading) return <ListSkeleton rows={5} />

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Silhouettes</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ width: 'auto', fontSize: '0.8125rem' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setAddForm({ name: '', category: filterCategory || '', sort_order: 0 }) }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Name</label>
            <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Lehenga" required autoFocus />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Category</label>
            <input type="text" value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Bridal" required list="cat-list" />
            <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="form-group" style={{ width: 70, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Order</label>
            <input type="number" value={addForm.sort_order} onChange={e => setAddForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}

      <table className="data-table" style={{ fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Order</th>
            <th style={{ width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(s => (
            <tr key={s.id}>
              {editingId === s.id ? (
                <>
                  <td><input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '0.8125rem' }} /></td>
                  <td><input type="text" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ fontSize: '0.8125rem' }} list="cat-list" /></td>
                  <td><input type="number" value={editForm.sort_order} onChange={e => setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ fontSize: '0.8125rem', width: 60 }} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(s.id)} style={{ padding: '0.25rem 0.5rem' }}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ padding: '0.25rem 0.5rem' }}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td><span className="tag">{s.category}</span></td>
                  <td className="text-muted">{s.sort_order}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(s.id); setEditForm({ name: s.name, category: s.category, sort_order: s.sort_order }) }} style={{ padding: '0.25rem' }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id, s.name)} style={{ padding: '0.25rem', color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No silhouettes found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function PriceBracketsManager({ toast }) {
  const [brackets, setBrackets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ label: '', min_price: '', max_price: '', sort_order: 0 })
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ label: '', min_price: '', max_price: '', sort_order: 0 })

  useEffect(() => { loadBrackets() }, [])

  async function loadBrackets() {
    setLoading(true)
    try {
      const data = await getPriceBrackets()
      setBrackets(data)
    } catch (err) {
      toast.error('Failed to load price brackets')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.label.trim()) return
    try {
      await createPriceBracket({
        label: addForm.label.trim(),
        min_price: addForm.min_price ? parseFloat(addForm.min_price) : null,
        max_price: addForm.max_price ? parseFloat(addForm.max_price) : null,
        sort_order: addForm.sort_order || 0,
      })
      toast.success('Price bracket added')
      setAdding(false)
      setAddForm({ label: '', min_price: '', max_price: '', sort_order: 0 })
      loadBrackets()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'This label already exists' : 'Failed to add')
    }
  }

  async function handleUpdate(id) {
    try {
      await updatePriceBracket(id, {
        label: editForm.label.trim(),
        min_price: editForm.min_price ? parseFloat(editForm.min_price) : null,
        max_price: editForm.max_price ? parseFloat(editForm.max_price) : null,
        sort_order: editForm.sort_order || 0,
      })
      toast.success('Price bracket updated')
      setEditingId(null)
      loadBrackets()
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  async function handleDelete(id, label) {
    if (!confirm(`Delete price bracket "${label}"?`)) return
    try {
      await deletePriceBracket(id)
      toast.success('Price bracket deleted')
      loadBrackets()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  if (loading) return <ListSkeleton rows={5} />

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Price Brackets</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setAddForm({ label: '', min_price: '', max_price: '', sort_order: brackets.length + 1 }) }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Label</label>
            <input type="text" value={addForm.label} onChange={e => setAddForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. 15L - 18L" required autoFocus />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Min Price</label>
            <input type="number" value={addForm.min_price} onChange={e => setAddForm(p => ({ ...p, min_price: e.target.value }))} placeholder="e.g. 1500000" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Max Price</label>
            <input type="number" value={addForm.max_price} onChange={e => setAddForm(p => ({ ...p, max_price: e.target.value }))} placeholder="e.g. 1800000" />
          </div>
          <div className="form-group" style={{ width: 70, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Order</label>
            <input type="number" value={addForm.sort_order} onChange={e => setAddForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}

      <table className="data-table" style={{ fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Min Price</th>
            <th>Max Price</th>
            <th>Order</th>
            <th style={{ width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map(b => (
            <tr key={b.id}>
              {editingId === b.id ? (
                <>
                  <td><input type="text" value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} style={{ fontSize: '0.8125rem' }} /></td>
                  <td><input type="number" value={editForm.min_price} onChange={e => setEditForm(p => ({ ...p, min_price: e.target.value }))} style={{ fontSize: '0.8125rem', width: 100 }} /></td>
                  <td><input type="number" value={editForm.max_price} onChange={e => setEditForm(p => ({ ...p, max_price: e.target.value }))} style={{ fontSize: '0.8125rem', width: 100 }} /></td>
                  <td><input type="number" value={editForm.sort_order} onChange={e => setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ fontSize: '0.8125rem', width: 60 }} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(b.id)} style={{ padding: '0.25rem 0.5rem' }}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ padding: '0.25rem 0.5rem' }}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ fontWeight: 500 }}>{b.label}</td>
                  <td className="text-muted">{b.min_price ? `₹${Number(b.min_price).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="text-muted">{b.max_price ? `₹${Number(b.max_price).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="text-muted">{b.sort_order}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(b.id); setEditForm({ label: b.label, min_price: b.min_price || '', max_price: b.max_price || '', sort_order: b.sort_order }) }} style={{ padding: '0.25rem' }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(b.id, b.label)} style={{ padding: '0.25rem', color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {brackets.length === 0 && (
            <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No price brackets found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ProductionStagesManager({ toast }) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', color: '', sort_order: 0 })
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', color: '#9ca3af', sort_order: 0 })

  useEffect(() => { loadStages() }, [])

  async function loadStages() {
    setLoading(true)
    try {
      const data = await getProductionStages()
      setStages(data)
    } catch (err) {
      toast.error('Failed to load production stages')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    try {
      await createProductionStage({ name: addForm.name.trim(), color: addForm.color || '#9ca3af', sort_order: addForm.sort_order || 0 })
      toast.success('Stage added')
      setAdding(false)
      setAddForm({ name: '', color: '#9ca3af', sort_order: 0 })
      loadStages()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'Stage name already exists' : 'Failed to add')
    }
  }

  async function handleUpdate(id) {
    try {
      await updateProductionStage(id, { name: editForm.name.trim(), color: editForm.color, sort_order: editForm.sort_order || 0 })
      toast.success('Stage updated')
      setEditingId(null)
      loadStages()
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete stage "${name}"? Pieces in this stage will lose their status.`)) return
    try {
      await deleteProductionStage(id)
      toast.success('Stage deleted')
      loadStages()
    } catch (err) {
      toast.error('Cannot delete — pieces may still reference this stage')
    }
  }

  if (loading) return <ListSkeleton rows={5} />

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Production Stages</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setAddForm({ name: '', color: '#9ca3af', sort_order: stages.length + 1 }) }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ padding: '0.75rem 1rem', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Name</label>
            <input type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. QC Check" required autoFocus />
          </div>
          <div className="form-group" style={{ width: 60, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Color</label>
            <input type="color" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} style={{ height: 36, padding: 2 }} />
          </div>
          <div className="form-group" style={{ width: 70, marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Order</label>
            <input type="number" value={addForm.sort_order} onChange={e => setAddForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
        </form>
      )}

      <table className="data-table" style={{ fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            <th style={{ width: 30 }}>Color</th>
            <th>Name</th>
            <th>Order</th>
            <th style={{ width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stages.map(s => (
            <tr key={s.id}>
              {editingId === s.id ? (
                <>
                  <td><input type="color" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} style={{ width: 30, height: 24, padding: 0, border: 'none' }} /></td>
                  <td><input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '0.8125rem' }} /></td>
                  <td><input type="number" value={editForm.sort_order} onChange={e => setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ fontSize: '0.8125rem', width: 60 }} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(s.id)} style={{ padding: '0.25rem 0.5rem' }}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ padding: '0.25rem 0.5rem' }}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: s.color }} /></td>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td className="text-muted">{s.sort_order}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(s.id); setEditForm({ name: s.name, color: s.color, sort_order: s.sort_order }) }} style={{ padding: '0.25rem' }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id, s.name)} style={{ padding: '0.25rem', color: 'var(--danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {stages.length === 0 && (
            <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No production stages found</td></tr>
          )}
        </tbody>
      </table>
    </div>
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

// ============================================================
// ACTIVITY TAB — audit log for admins
// ============================================================

const ENTITY_TYPES = ['ranges', 'range_styles', 'styles', 'samples', 'tasks', 'orders', 'order_items', 'suppliers', 'people', 'production_stages', 'silhouettes', 'price_brackets', 'dashboard_targets', 'roles']
const ACTION_TYPES = ['created', 'updated', 'deleted']

function formatRelative(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function entityLabel(type) {
  return type?.replace(/_/g, ' ')
}

function actionColor(action) {
  if (action === 'deleted') return { bg: '#fef2f2', fg: '#991b1b', border: '#fecaca' }
  if (action === 'created') return { bg: '#f0fdf4', fg: '#166534', border: '#bbf7d0' }
  if (action === 'updated') return { bg: '#eff6ff', fg: '#1e40af', border: '#bfdbfe' }
  return { bg: '#f8fafc', fg: '#334155', border: '#e2e8f0' }
}

function ActivityTab({ people, toast }) {
  const [entries, setEntries] = useState([])
  const [lastSeen, setLastSeen] = useState({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ personId: '', action: '', entityType: '' })
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    loadActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.personId, filters.action, filters.entityType])

  async function loadActivity() {
    setLoading(true)
    try {
      const [audit, last] = await Promise.all([
        getAuditLog({
          personId: filters.personId ? parseInt(filters.personId) : undefined,
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          limit: 300,
        }),
        getLastActivityPerPerson(),
      ])
      setEntries(audit)
      setLastSeen(last)
    } catch (err) {
      console.error('Failed to load activity:', err)
      toast.error('Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }

  const activePeople = people.filter(p => p.is_active !== false)
  const dormantThresholdMs = 7 * 86400000

  return (
    <div>
      {/* Last activity per user */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Last activity per member</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
          {activePeople.map(p => {
            const entry = lastSeen[p.id]
            const isDormant = !entry || (Date.now() - new Date(entry.created_at).getTime()) > dormantThresholdMs
            return (
              <div
                key={p.id}
                onClick={() => setFilters(f => ({ ...f, personId: String(p.id) }))}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--gray-200)',
                  cursor: 'pointer',
                  background: isDormant ? 'var(--gray-50)' : 'var(--bg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '0.875rem' }}>{p.name}</strong>
                  {isDormant && <span style={{ fontSize: '0.65rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Dormant</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                  {entry ? `${entry.action} ${entityLabel(entry.entity_type)} · ${formatRelative(entry.created_at)}` : 'No activity yet'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--gray-500)' }} />
          <select value={filters.personId} onChange={e => setFilters(f => ({ ...f, personId: e.target.value }))} style={{ padding: '0.5rem', minWidth: '160px' }}>
            <option value="">All members</option>
            {activePeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} style={{ padding: '0.5rem', minWidth: '140px' }}>
            <option value="">All actions</option>
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filters.entityType} onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))} style={{ padding: '0.5rem', minWidth: '160px' }}>
            <option value="">All entities</option>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{entityLabel(t)}</option>)}
          </select>
          {(filters.personId || filters.action || filters.entityType) && (
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setFilters({ personId: '', action: '', entityType: '' })}>
              <XIcon size={14} /> Clear
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Log */}
      {loading ? (
        <ListSkeleton />
      ) : entries.length === 0 ? (
        <div className="card"><div className="empty-state" style={{ padding: '2rem' }}>
          <ActivityIcon size={40} />
          <h3 style={{ marginTop: '0.5rem' }}>No activity yet</h3>
          <p>Once database triggers are enabled, all create/update/delete actions will appear here.</p>
        </div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>When</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>Who</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>Action</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>Entity</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const c = actionColor(e.action)
                const isOpen = expanded === e.id
                const name = e.details?.name || `#${e.entity_id || '—'}`
                const diffFields = e.after_data ? Object.keys(e.after_data).filter(k => k !== 'updated_at') : []
                return (
                  <>
                    <tr key={e.id} onClick={() => setExpanded(isOpen ? null : e.id)} style={{ borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', background: e.action === 'deleted' ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--gray-500)', fontSize: '0.8rem' }} title={new Date(e.created_at).toLocaleString()}>{formatRelative(e.created_at)}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>{e.people?.name || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>system</span>}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                          {e.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <div style={{ fontWeight: 500 }}>{name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{entityLabel(e.entity_type)}</div>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                        {e.action === 'updated' && diffFields.length > 0 ? `${diffFields.length} field${diffFields.length > 1 ? 's' : ''} changed` : e.action === 'deleted' ? 'record removed' : 'new record'}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${e.id}-expanded`}>
                        <td colSpan={5} style={{ background: 'var(--gray-50)', padding: '1rem 1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
                          {e.action === 'updated' && e.before_data && e.after_data ? (
                            <table style={{ width: '100%', fontSize: '0.8rem' }}>
                              <thead>
                                <tr><th style={{ textAlign: 'left', padding: '0.25rem 0.5rem', color: 'var(--gray-500)' }}>Field</th><th style={{ textAlign: 'left', padding: '0.25rem 0.5rem', color: 'var(--gray-500)' }}>Before</th><th style={{ textAlign: 'left', padding: '0.25rem 0.5rem', color: 'var(--gray-500)' }}>After</th></tr>
                              </thead>
                              <tbody>
                                {diffFields.map(k => (
                                  <tr key={k}>
                                    <td style={{ padding: '0.25rem 0.5rem', fontWeight: 500 }}>{k}</td>
                                    <td style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', color: '#991b1b' }}>{JSON.stringify(e.before_data[k])}</td>
                                    <td style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', color: '#166534' }}>{JSON.stringify(e.after_data[k])}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto' }}>
                              {JSON.stringify(e.before_data || e.after_data || e.details, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
