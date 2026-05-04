import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { supabase } from '../lib/supabase'
import { ChevronDown, ChevronRight, Layers, Image as ImageIcon } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { GridSkeleton } from '../components/PageSkeleton'
import { thumbUrl } from '../lib/imgUrl'

export default function ByEmbroidery() {
  const { currentPerson } = useApp()
  const { currentDivision } = useDivision()
  const [styles, setStyles] = useState([])
  const [ranges, setRanges] = useState({})
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState({})

  useEffect(() => { loadData() }, [currentDivision])

  async function loadData() {
    setLoading(true)
    try {
      // Fetch all range styles with their range info
      let query = supabase
        .from('range_styles')
        .select('*, ranges!inner(id, name, division_id)')
        .order('name')
      if (currentDivision?.id) {
        query = query.eq('ranges.division_id', currentDivision.id)
      }
      const { data, error } = await query
      if (error) throw error
      setStyles(data || [])
      // Build range lookup
      const rangeMap = {}
      ;(data || []).forEach(s => {
        if (s.ranges) rangeMap[s.ranges.id] = s.ranges
      })
      setRanges(rangeMap)
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(() => {
    const groups = {}
    styles.forEach(s => {
      const key = s.embroidery || 'Unassigned'
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    // Sort: named groups first alphabetically, Unassigned last
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === 'Unassigned') return 1
        if (b === 'Unassigned') return -1
        return a.localeCompare(b)
      })
      .map(([name, items]) => ({ name, styles: items }))
  }, [styles])

  const totalWithEmbroidery = styles.filter(s => s.embroidery).length

  function toggleGroup(name) {
    setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))
  }

  if (loading) return <GridSkeleton />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>By Embroidery</h1>
          <p className="subtitle">
            {totalWithEmbroidery} piece{totalWithEmbroidery !== 1 ? 's' : ''} with embroidery assigned
            {' '}&middot; {grouped.length} group{grouped.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {styles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Layers size={48} />
            <h3>No range styles yet</h3>
            <p>Add styles to your range plans and assign embroidery types to see them here.</p>
          </div>
        </div>
      ) : (
        <div className="emb-groups">
          {grouped.map(group => {
            const isCollapsed = collapsed[group.name]
            const approvedCount = group.styles.filter(s => s.status === 'approved').length
            return (
              <div key={group.name} className="emb-group">
                <button className="emb-group-header" onClick={() => toggleGroup(group.name)}>
                  <div className="emb-group-header-left">
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <span className="emb-group-name">
                      {group.name}
                    </span>
                    <span className="emb-group-count">{group.styles.length}</span>
                  </div>
                  <div className="emb-group-meta">
                    {approvedCount > 0 && (
                      <span className="emb-group-approved">{approvedCount} approved</span>
                    )}
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="emb-grid">
                    {group.styles.map(s => (
                      <Link
                        key={s.id}
                        to={`/range-planning/${s.range_id}`}
                        className="emb-card"
                      >
                        <div className="emb-card-thumb">
                          {s.thumbnail_url ? (
                            <img src={thumbUrl(s.thumbnail_url, { w: 200 })} alt={s.name} loading="lazy" />
                          ) : (
                            <div className="emb-card-placeholder">
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </div>
                        <div className="emb-card-body">
                          <div className="emb-card-name">{s.name}</div>
                          <div className="emb-card-details">
                            {s.category && <span className="tag">{s.category}</span>}
                            <StatusBadge status={s.status} />
                          </div>
                          {s.silhouette && (
                            <div className="emb-card-silhouette">Silhouette: {s.silhouette}</div>
                          )}
                          <div className="emb-card-range">
                            {ranges[s.range_id]?.name || 'Unknown range'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
