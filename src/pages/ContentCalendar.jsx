import { useState, useEffect, useMemo } from 'react'
import { useDivision } from '../contexts/DivisionContext'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import {
  Camera, Image as ImageIcon, Edit3, CheckCircle, Send, Eye,
  Search, Filter, Calendar, Clock, ChevronDown, ChevronRight, Sparkles
} from 'lucide-react'
import { GridSkeleton } from '../components/PageSkeleton'

const CONTENT_STATUSES = [
  { value: 'needs_shoot', label: 'Needs Shoot', icon: Camera, bg: '#fef3c7', color: '#b45309' },
  { value: 'shoot_scheduled', label: 'Shoot Scheduled', icon: Calendar, bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'shot', label: 'Shot', icon: ImageIcon, bg: '#ede9fe', color: '#6d28d9' },
  { value: 'editing', label: 'Editing', icon: Edit3, bg: '#fce7f3', color: '#be185d' },
  { value: 'ready', label: 'Content Ready', icon: CheckCircle, bg: '#dcfce7', color: '#15803d' },
  { value: 'scheduled', label: 'Scheduled', icon: Clock, bg: '#d1fae5', color: '#065f46' },
  { value: 'posted', label: 'Posted', icon: Send, bg: '#f0fdf4', color: '#166534' },
]

const NO_STATUS = { value: '', label: 'No Content Status', icon: Eye, bg: '#f3f4f6', color: '#6b7280' }

export default function ContentCalendar() {
  const { currentDivision } = useDivision()
  const { currentPerson } = useApp()
  const toast = useToast()
  const [styles, setStyles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('board') // board | list
  const [filterRange, setFilterRange] = useState('')
  const [ranges, setRanges] = useState([])
  const [collapsedCols, setCollapsedCols] = useState(new Set())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Content Hub pulls pieces from ALL divisions so social team sees everything
      const { data: rangeData } = await supabase
        .from('ranges')
        .select('id, name, divisions(name)')
        .order('name')
      setRanges(rangeData || [])

      const { data: styleData } = await supabase
        .from('range_styles')
        .select('*, ranges!inner(id, name, divisions(name))')
        .order('name')
      setStyles(styleData || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load content data')
    } finally {
      setLoading(false)
    }
  }

  async function updateContentStatus(styleId, newStatus) {
    try {
      await supabase
        .from('range_styles')
        .update({ content_status: newStatus || null })
        .eq('id', styleId)
      setStyles(prev => prev.map(s => s.id === styleId ? { ...s, content_status: newStatus || null } : s))
      toast.success('Content status updated')
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  const filtered = useMemo(() => {
    let result = styles
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.ranges?.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      )
    }
    if (filterRange) {
      result = result.filter(s => s.range_id === parseInt(filterRange))
    }
    return result
  }, [styles, search, filterRange])

  const grouped = useMemo(() => {
    const map = {}
    // Initialize with "no status" first, then all statuses
    map[''] = []
    CONTENT_STATUSES.forEach(s => { map[s.value] = [] })
    filtered.forEach(s => {
      const key = s.content_status || ''
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [filtered])

  const stats = useMemo(() => {
    const total = styles.length
    const withContent = styles.filter(s => s.content_status).length
    const posted = styles.filter(s => s.content_status === 'posted').length
    const needsShoot = styles.filter(s => !s.content_status || s.content_status === 'needs_shoot').length
    return { total, withContent, posted, needsShoot }
  }, [styles])

  function toggleCollapse(val) {
    setCollapsedCols(prev => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }

  if (loading) {
    return <GridSkeleton />
  }

  return (
    <div className="content-cal">
      <div className="content-cal-header">
        <div>
          <h2><Sparkles size={20} /> Content Hub</h2>
          <p className="text-muted">Track content creation across all range pieces</p>
        </div>
        <div className="content-cal-actions">
          <div className="content-cal-toggle">
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>Board</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="content-cal-stats">
        <div className="content-stat">
          <div className="content-stat-num">{stats.total}</div>
          <div className="content-stat-label">Total Pieces</div>
        </div>
        <div className="content-stat">
          <div className="content-stat-num">{stats.needsShoot}</div>
          <div className="content-stat-label">Need Content</div>
        </div>
        <div className="content-stat">
          <div className="content-stat-num">{stats.withContent}</div>
          <div className="content-stat-label">In Pipeline</div>
        </div>
        <div className="content-stat">
          <div className="content-stat-num">{stats.posted}</div>
          <div className="content-stat-label">Posted</div>
        </div>
      </div>

      {/* Filters */}
      <div className="content-cal-filters">
        <div className="content-cal-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search pieces..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={filterRange} onChange={e => setFilterRange(e.target.value)}>
          <option value="">All Ranges</option>
          {ranges.map(r => (
            <option key={r.id} value={r.id}>{r.name}{r.divisions?.name ? ` (${r.divisions.name})` : ''}</option>
          ))}
        </select>
      </div>

      {viewMode === 'board' ? (
        <div className="content-board">
          {[NO_STATUS, ...CONTENT_STATUSES].map(status => {
            const items = grouped[status.value] || []
            const collapsed = collapsedCols.has(status.value)
            const Icon = status.icon
            return (
              <div key={status.value} className="content-col">
                <div
                  className="content-col-header"
                  style={{ borderTopColor: status.color }}
                  onClick={() => toggleCollapse(status.value)}
                >
                  <div className="content-col-title">
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <Icon size={14} style={{ color: status.color }} />
                    <span>{status.label}</span>
                  </div>
                  <span className="content-col-count" style={{ background: status.bg, color: status.color }}>
                    {items.length}
                  </span>
                </div>
                {!collapsed && (
                  <div className="content-col-body">
                    {items.length === 0 ? (
                      <div className="content-col-empty">No pieces</div>
                    ) : (
                      items.map(item => (
                        <ContentCard
                          key={item.id}
                          item={item}
                          onStatusChange={updateContentStatus}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="content-list">
          <table>
            <thead>
              <tr>
                <th>Piece</th>
                <th>Range</th>
                <th>Division</th>
                <th>Category</th>
                <th>Design Status</th>
                <th>Content Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="content-list-name">
                      {item.thumbnail_url && <img src={item.thumbnail_url} alt="" />}
                      {item.name}
                    </div>
                  </td>
                  <td>{item.ranges?.name}</td>
                  <td>{item.ranges?.divisions?.name || '-'}</td>
                  <td>{item.category || '-'}</td>
                  <td>
                    <span className="tag">{item.status || 'concept'}</span>
                  </td>
                  <td>
                    <select
                      className="content-status-select"
                      value={item.content_status || ''}
                      onChange={e => updateContentStatus(item.id, e.target.value)}
                    >
                      <option value="">Not set</option>
                      {CONTENT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>No pieces found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ContentCard({ item, onStatusChange }) {
  const [showMenu, setShowMenu] = useState(false)
  const statusObj = CONTENT_STATUSES.find(s => s.value === item.content_status) || NO_STATUS

  return (
    <div className="content-card">
      {item.thumbnail_url && (
        <div className="content-card-thumb">
          <img src={item.thumbnail_url} alt={item.name} />
        </div>
      )}
      <div className="content-card-body">
        <div className="content-card-name">{item.name}</div>
        <div className="content-card-range">{item.ranges?.name} {item.ranges?.divisions?.name ? `· ${item.ranges.divisions.name}` : ''}</div>
        {item.category && <span className="tag" style={{ fontSize: '0.625rem' }}>{item.category}</span>}
      </div>
      <div className="content-card-status" style={{ position: 'relative' }}>
        <button
          className="content-card-status-btn"
          style={{ background: statusObj.bg, color: statusObj.color }}
          onClick={() => setShowMenu(!showMenu)}
        >
          <statusObj.icon size={12} />
        </button>
        {showMenu && (
          <>
            <div className="content-card-backdrop" onClick={() => setShowMenu(false)} />
            <div className="content-card-menu">
              <button onClick={() => { onStatusChange(item.id, ''); setShowMenu(false) }}>
                <Eye size={12} /> Clear status
              </button>
              {CONTENT_STATUSES.map(s => (
                <button
                  key={s.value}
                  className={item.content_status === s.value ? 'active' : ''}
                  onClick={() => { onStatusChange(item.id, s.value); setShowMenu(false) }}
                >
                  <s.icon size={12} /> {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
