import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeason } from '../contexts/SeasonContext'
import { getDashboardStats, getStyles } from '../lib/supabase'
import { LayoutDashboard, Scissors, FlaskConical, ClipboardList, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const { currentSeason } = useSeason()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentStyles, setRecentStyles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentSeason) loadData()
  }, [currentSeason])

  async function loadData() {
    setLoading(true)
    try {
      const [statsData, stylesData] = await Promise.all([
        getDashboardStats(currentSeason.id),
        getStyles(currentSeason.id),
      ])
      setStats(statsData)
      setRecentStyles(stylesData.slice(0, 5))
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">{currentSeason?.name || 'No season selected'}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Styles</div>
          <div className="stat-value">{stats?.totalStyles || 0}</div>
          <div className="stat-sub">This season</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Development</div>
          <div className="stat-value">{stats?.inDevelopment || 0}</div>
          <div className="stat-sub">Concept through costing</div>
        </div>
        <div className={`stat-card ${stats?.samplesForReview > 0 ? 'alert' : ''}`}>
          <div className="stat-label">Samples for Review</div>
          <div className="stat-value">{stats?.samplesForReview || 0}</div>
          <div className="stat-sub">Awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open POs</div>
          <div className="stat-value">{stats?.openPos || 0}</div>
          <div className="stat-sub">Issued or in production</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h2>Recent Styles</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/styles')}>
              View All
            </button>
          </div>
          {recentStyles.length === 0 ? (
            <div className="empty-state">
              <Scissors />
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

        <div className="card">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/styles')} style={{ justifyContent: 'flex-start' }}>
              <Scissors size={16} /> View All Styles
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/suppliers')} style={{ justifyContent: 'flex-start' }}>
              <LayoutDashboard size={16} /> Manage Suppliers
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/materials')} style={{ justifyContent: 'flex-start' }}>
              <FlaskConical size={16} /> Materials Library
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    concept: { label: 'Concept', bg: '#e0e7ff', color: '#4338ca' },
    development: { label: 'Development', bg: '#dbeafe', color: '#1d4ed8' },
    sampling: { label: 'Sampling', bg: '#fef3c7', color: '#b45309' },
    costing: { label: 'Costing', bg: '#fce7f3', color: '#be185d' },
    approved: { label: 'Approved', bg: '#dcfce7', color: '#15803d' },
    production: { label: 'Production', bg: '#cffafe', color: '#0e7490' },
    shipped: { label: 'Shipped', bg: '#e0e7ff', color: '#4338ca' },
    cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' },
  }
  const c = config[status] || { label: status, bg: '#f3f4f6', color: '#4b5563' }
  return (
    <span className="badge" style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}
