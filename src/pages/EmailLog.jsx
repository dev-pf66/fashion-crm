import { useState, useEffect, useMemo } from 'react'
import { Mail, MailOpen, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { getEmailLog } from '../lib/supabase'
import { useApp } from '../App'
import EmptyState from '../components/EmptyState'

const TEMPLATE_LABEL = {
  all_clear: 'All clear',
  low_overdue: 'Low overdue',
  high_overdue: 'High overdue',
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function statusPill(row) {
  if (row.status === 'failed' || row.bounced_at) {
    return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}><XCircle size={12} /> {row.bounced_at ? 'Bounced' : 'Failed'}</span>
  }
  if (row.opened_at) {
    return <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}><MailOpen size={12} /> Opened{row.open_count > 1 ? ` ×${row.open_count}` : ''}</span>
  }
  if (row.delivered_at) {
    return <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}><CheckCircle2 size={12} /> Delivered</span>
  }
  return <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}><Mail size={12} /> Sent</span>
}

export default function EmailLog() {
  const { people } = useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [personFilter, setPersonFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await getEmailLog({
        days,
        personId: personFilter || null,
        status: statusFilter || null,
      })
      setRows(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [days, personFilter, statusFilter])

  const stats = useMemo(() => {
    const total = rows.length
    const delivered = rows.filter(r => r.delivered_at).length
    const opened = rows.filter(r => r.opened_at).length
    const failed = rows.filter(r => r.status === 'failed' || r.bounced_at).length
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
    return { total, delivered, opened, failed, openRate }
  }, [rows])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Email Log</h1>
          <p className="subtitle">Daily digest delivery + open tracking</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card"><div className="stat-label">Sent</div><div className="stat-value">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Delivered</div><div className="stat-value">{stats.delivered}</div></div>
        <div className="stat-card"><div className="stat-label">Opened</div><div className="stat-value">{stats.opened}</div></div>
        <div className="stat-card"><div className="stat-label">Open rate</div><div className="stat-value">{stats.openRate}%</div></div>
        <div className="stat-card"><div className="stat-label">Failed / Bounced</div><div className="stat-value" style={{ color: stats.failed ? '#dc2626' : undefined }}>{stats.failed}</div></div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8125rem' }}>
          Last
          <select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8125rem' }}>
          Recipient
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)}>
            <option value="">All</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8125rem' }}>
          Status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No emails in this range"
          description="The daily digest hasn't sent anything matching these filters. Try widening the date range."
        />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Sent</th>
                <th>Recipient</th>
                <th>Template</th>
                <th>Overdue</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.sent_at)}</td>
                  <td>{r.people?.name || r.to_email}</td>
                  <td>{TEMPLATE_LABEL[r.template] || r.template}</td>
                  <td>{r.overdue_count || 0}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</td>
                  <td>{statusPill(r)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.opened_at ? formatDateTime(r.opened_at) : r.error_message ? <span style={{ color: '#991b1b', fontSize: '0.75rem' }}><AlertTriangle size={12} /> {r.error_message}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
