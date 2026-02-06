import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeason } from '../contexts/SeasonContext'
import { getDashboardStats, getStyles, getUpcomingDeadlines, getOverdueItems } from '../lib/supabase'
import { STYLE_STATUSES, SAMPLE_ROUNDS } from '../lib/constants'
import ActivityFeed from '../components/ActivityFeed'
import StatusBadge from '../components/StatusBadge'
import {
  LayoutDashboard, Scissors, FlaskConical, ClipboardList,
  AlertTriangle, Calendar, Clock
} from 'lucide-react'

export default function Dashboard() {
  const { currentSeason } = useSeason()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentStyles, setRecentStyles] = useState([])
  const [deadlines, setDeadlines] = useState([])
  const [overdue, setOverdue] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentSeason) loadData()
  }, [currentSeason])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, stylesData, deadlinesData, overdueData] = await Promise.all([
        getDashboardStats(currentSeason.id),
        getStyles(currentSeason.id),
        getUpcomingDeadlines(currentSeason.id),
        getOverdueItems(currentSeason.id),
      ])
      setStats(statsData)
      setRecentStyles(stylesData.slice(0, 5))
      setDeadlines(deadlinesData || [])
      setOverdue(overdueData)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
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

  const maxStyleCount = Math.max(1, ...Object.values(stats?.stylesByStatus || {}))
  const maxRoundCount = Math.max(1, ...Object.values(stats?.samplesByRound || {}))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">{currentSeason?.name || 'No season selected'}</p>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdue && overdue.total > 0 && (
        <div className="alert-box">
          <AlertTriangle size={16} />
          <span>
            <strong>{overdue.total} overdue item{overdue.total > 1 ? 's' : ''}:</strong>{' '}
            {overdue.overdueSamples.length > 0 && `${overdue.overdueSamples.length} sample${overdue.overdueSamples.length > 1 ? 's' : ''}`}
            {overdue.overdueSamples.length > 0 && overdue.overduePOs.length > 0 && ', '}
            {overdue.overduePOs.length > 0 && `${overdue.overduePOs.length} PO${overdue.overduePOs.length > 1 ? 's' : ''}`}
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/styles')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Total Styles</div>
          <div className="stat-value">{stats?.totalStyles || 0}</div>
          <div className="stat-sub">This season</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/styles')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">In Development</div>
          <div className="stat-value">{stats?.inDevelopment || 0}</div>
          <div className="stat-sub">Concept through costing</div>
        </div>
        <div className={`stat-card ${stats?.samplesForReview > 0 ? 'alert' : ''}`} onClick={() => navigate('/samples')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Samples for Review</div>
          <div className="stat-value">{stats?.samplesForReview || 0}</div>
          <div className="stat-sub">Awaiting review</div>
        </div>
        <div className="stat-card" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-label">Open POs</div>
          <div className="stat-value">{stats?.openPos || 0}</div>
          <div className="stat-sub">Issued or in production</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-grid">
        {/* Styles by Status Chart */}
        <div className="card">
          <div className="card-header">
            <h3>Styles by Status</h3>
          </div>
          <div className="chart-bars">
            {STYLE_STATUSES.map(s => {
              const count = stats?.stylesByStatus?.[s.value] || 0
              if (count === 0) return null
              return (
                <div key={s.value} className="chart-bar-row">
                  <div className="chart-bar-label">{s.label}</div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${(count / maxStyleCount) * 100}%`, background: s.color }}
                    />
                  </div>
                  <div className="chart-bar-value">{count}</div>
                </div>
              )
            })}
            {Object.keys(stats?.stylesByStatus || {}).length === 0 && (
              <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>No styles yet</div>
            )}
          </div>
        </div>

        {/* Samples by Round Chart */}
        <div className="card">
          <div className="card-header">
            <h3>Samples by Round</h3>
          </div>
          <div className="chart-bars">
            {SAMPLE_ROUNDS.map(r => {
              const count = stats?.samplesByRound?.[r.value] || 0
              if (count === 0) return null
              return (
                <div key={r.value} className="chart-bar-row">
                  <div className="chart-bar-label">{r.label}</div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill"
                      style={{ width: `${(count / maxRoundCount) * 100}%`, background: r.color }}
                    />
                  </div>
                  <div className="chart-bar-value">{count}</div>
                </div>
              )
            })}
            {Object.keys(stats?.samplesByRound || {}).length === 0 && (
              <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>No samples yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Deadlines + Activity */}
      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <h3>Upcoming Deadlines</h3>
            <span className="text-sm text-muted">Next 7 days</span>
          </div>
          {deadlines.length === 0 ? (
            <div className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>
              No upcoming deadlines
            </div>
          ) : (
            <div className="deadline-list">
              {deadlines.slice(0, 8).map((d, i) => (
                <div
                  key={`${d.type}-${d.id}-${i}`}
                  className="deadline-item"
                  onClick={() => navigate(d.type === 'po' ? `/orders/${d.id}` : '/samples')}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {d.type === 'sample' ? <FlaskConical size={14} style={{ color: 'var(--info)' }} /> : <ClipboardList size={14} style={{ color: 'var(--primary)' }} />}
                    <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{d.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Calendar size={12} style={{ color: 'var(--gray-400)' }} />
                    <span className="text-sm text-muted">
                      {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/activity')}>
              View All
            </button>
          </div>
          <ActivityFeed seasonId={currentSeason?.id} limit={8} compact />
        </div>
      </div>

      {/* Recent Styles Table */}
      <div style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Recent Styles</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/styles')}>
              View All
            </button>
          </div>
          {recentStyles.length === 0 ? (
            <div className="empty-state">
              <Scissors size={32} />
              <h3>No styles yet</h3>
              <p>Create your first style to get started.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/styles')}>
                Go to Styles
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Style #</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentStyles.map(style => (
                  <tr
                    key={style.id}
                    className="clickable"
                    onClick={() => navigate(`/styles/${style.id}`)}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {style.style_number}
                    </td>
                    <td>{style.name}</td>
                    <td>
                      <StatusBadge status={style.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
