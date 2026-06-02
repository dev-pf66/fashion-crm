import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../App'
import { getNotificationLogs, getTeamTaskWorkload } from '../lib/supabase'
import NoAccessScreen from '../components/NoAccessScreen'
import { Bell, CheckCircle, XCircle, Users, Sun, Moon, TrendingUp } from 'lucide-react'

const ALLOWED_EMAILS = ['dev@pocket-fund.com', 'dheeralb@jadecouture.com']

function StatCard({ icon: Icon, label, value, sub, color = '#60a5fa' }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ background: color + '22', borderRadius: 10, padding: 10, flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SlotBadge({ slot }) {
  const isMorning = slot === 'morning'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 500,
      background: isMorning ? '#fbbf2422' : '#818cf822',
      color: isMorning ? '#fbbf24' : '#818cf8',
    }}>
      {isMorning ? <Sun size={11} /> : <Moon size={11} />}
      {isMorning ? 'Morning' : 'Evening'}
    </span>
  )
}

export default function NotificationAnalytics() {
  const { currentPerson } = useApp()
  const [logs, setLogs] = useState([])
  const [workload, setWorkload] = useState([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(14)

  if (!ALLOWED_EMAILS.includes(currentPerson?.email)) {
    return <NoAccessScreen message="This section is restricted to admins only." />
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([getNotificationLogs({ days }), getTeamTaskWorkload()])
      .then(([l, w]) => { setLogs(l); setWorkload(w) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days])

  const stats = useMemo(() => {
    const total = logs.length
    const sent = logs.filter(l => l.status === 'sent').length
    const failed = total - sent
    const successRate = total ? Math.round((sent / total) * 100) : 0
    const morningRuns = new Set(logs.filter(l => l.slot === 'morning').map(l => l.sent_at?.slice(0, 10))).size
    const eveningRuns = new Set(logs.filter(l => l.slot === 'evening').map(l => l.sent_at?.slice(0, 10))).size
    return { total, sent, failed, successRate, morningRuns, eveningRuns }
  }, [logs])

  const perPerson = useMemo(() => {
    const map = {}
    logs.forEach(l => {
      const key = l.person_email || l.person_name
      if (!key) return
      if (!map[key]) map[key] = { name: l.person_name, email: l.person_email, sent: 0, failed: 0, lastSent: null, overdue: 0 }
      if (l.status === 'sent') map[key].sent++
      else map[key].failed++
      if (!map[key].lastSent || l.sent_at > map[key].lastSent) map[key].lastSent = l.sent_at
      map[key].overdue = Math.max(map[key].overdue, l.overdue_count || 0)
    })
    return Object.values(map).sort((a, b) => (b.sent + b.failed) - (a.sent + a.failed))
  }, [logs])

  const recentRuns = useMemo(() => {
    const byDay = {}
    logs.forEach(l => {
      const date = l.sent_at?.slice(0, 10)
      const key = `${date}__${l.slot}`
      if (!byDay[key]) byDay[key] = { date, slot: l.slot, sent: 0, failed: 0 }
      if (l.status === 'sent') byDay[key].sent++
      else byDay[key].failed++
    })
    return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
  }, [logs])

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell size={22} color="#60a5fa" />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Notification Analytics</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Daily cron job runs — what the team is working on</p>
          </div>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon={Bell} label="Total sends" value={stats.total} color="#60a5fa" />
            <StatCard icon={CheckCircle} label="Delivered" value={stats.sent} sub={`${stats.successRate}% success`} color="#34d399" />
            <StatCard icon={XCircle} label="Failed" value={stats.failed} color="#f87171" />
            <StatCard icon={Sun} label="Morning runs" value={stats.morningRuns} sub="9am IST" color="#fbbf24" />
            <StatCard icon={Moon} label="Evening runs" value={stats.eveningRuns} sub="6pm IST" color="#818cf8" />
          </div>

          {/* Team task workload */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 28 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="#60a5fa" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>What the team is working on</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>live from CRM</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Person', 'Total tasks', 'In progress', 'Review', 'Overdue', 'High priority'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workload.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 16px' }}>{p.total}</td>
                      <td style={{ padding: '10px 16px', color: '#60a5fa' }}>{p.inProgress}</td>
                      <td style={{ padding: '10px 16px', color: '#fbbf24' }}>{p.review}</td>
                      <td style={{ padding: '10px 16px', color: p.overdue > 0 ? '#f87171' : 'var(--text-secondary)' }}>{p.overdue}</td>
                      <td style={{ padding: '10px 16px', color: p.highPriority > 0 ? '#f97316' : 'var(--text-secondary)' }}>{p.highPriority}</td>
                    </tr>
                  ))}
                  {workload.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>No active tasks</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Per-person notification stats */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#34d399" />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Per-person delivery</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      {['Name', 'Sent', 'Failed', 'Last notified'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perPerson.map(p => (
                      <tr key={p.email} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 16px', fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: '9px 16px', color: '#34d399' }}>{p.sent}</td>
                        <td style={{ padding: '9px 16px', color: p.failed > 0 ? '#f87171' : 'var(--text-secondary)' }}>{p.failed}</td>
                        <td style={{ padding: '9px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                          {p.lastSent ? new Date(p.lastSent).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                    {perPerson.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>No data for this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent cron runs */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="#818cf8" />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Cron run history</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-hover)' }}>
                      {['Date', 'Slot', 'Sent', 'Failed'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map(r => (
                      <tr key={`${r.date}-${r.slot}`} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 16px' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td style={{ padding: '9px 16px' }}><SlotBadge slot={r.slot} /></td>
                        <td style={{ padding: '9px 16px', color: '#34d399' }}>{r.sent}</td>
                        <td style={{ padding: '9px 16px', color: r.failed > 0 ? '#f87171' : 'var(--text-secondary)' }}>{r.failed}</td>
                      </tr>
                    ))}
                    {recentRuns.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>No runs logged yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
