import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { getRangeProgress, getTeamTaskWorkload, getOverdueTasks, getTaskMetrics, getTasks } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import {
  Shield, Layers, CheckSquare, AlertTriangle, Clock,
  Users, BarChart3, Target, Truck, ArrowRight
} from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState('ranges')
  const [loading, setLoading] = useState(true)

  // Range data
  const [rangeData, setRangeData] = useState([])

  // Task data
  const [taskMetrics, setTaskMetrics] = useState(null)
  const [workload, setWorkload] = useState([])
  const [overdueTasks, setOverdueTasks] = useState([])
  const [pipeline, setPipeline] = useState({ todo: 0, in_progress: 0, review: 0, done: 0 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [ranges, metrics, team, overdue, allTasks] = await Promise.all([
        getRangeProgress(),
        getTaskMetrics(),
        getTeamTaskWorkload(),
        getOverdueTasks(),
        getTasks(),
      ])
      setRangeData(ranges || [])
      setTaskMetrics(metrics)
      setWorkload(team || [])
      setOverdueTasks(overdue || [])

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
      ) : (
        <TaskTab
          metrics={taskMetrics}
          activeTasks={activeTasks}
          workload={workload}
          overdueTasks={overdueTasks}
          pipeline={pipeline}
        />
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

function TaskTab({ metrics, activeTasks, workload, overdueTasks, pipeline }) {
  const today = new Date().toISOString().slice(0, 10)
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
