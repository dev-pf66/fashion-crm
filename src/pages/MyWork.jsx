import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getMyAssignedStyles, updateRangeStyle } from '../lib/supabase'
import {
  Briefcase, Image as ImageIcon, X, ChevronLeft, ChevronRight,
  Maximize2, Filter, Search,
} from 'lucide-react'

const PRODUCTION_STATUSES = [
  { value: 'pending', label: 'Pending', bg: '#f3f4f6', color: '#4b5563' },
  { value: 'in_progress', label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'sampling', label: 'Sampling', bg: '#fce7f3', color: '#be185d' },
  { value: 'ready', label: 'Ready', bg: '#dcfce7', color: '#15803d' },
  { value: 'shipped', label: 'Shipped', bg: '#d1fae5', color: '#065f46' },
]

export default function MyWork() {
  const { currentPerson } = useApp()
  const toast = useToast()
  const [styles, setStyles] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterRange, setFilterRange] = useState('')

  useEffect(() => {
    if (currentPerson?.id) loadStyles()
  }, [currentPerson?.id])

  async function loadStyles() {
    setLoading(true)
    try {
      const data = await getMyAssignedStyles(currentPerson.id)
      setStyles(data || [])
    } catch (err) {
      console.error('Failed to load assigned styles:', err)
      toast.error('Failed to load your assigned pieces')
    } finally {
      setLoading(false)
    }
  }

  async function handleProductionStatusChange(styleId, status) {
    try {
      await updateRangeStyle(styleId, { production_status: status })
      setStyles(prev => prev.map(s => s.id === styleId ? { ...s, production_status: status } : s))
      toast.success('Status updated')
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const ranges = useMemo(() => {
    return [...new Set(styles.map(s => s.ranges?.name).filter(Boolean))].sort()
  }, [styles])

  const filtered = useMemo(() => {
    return styles.filter(s => {
      if (filterSearch && !s.name.toLowerCase().includes(filterSearch.toLowerCase())) return false
      if (filterRange && s.ranges?.name !== filterRange) return false
      return true
    })
  }, [styles, filterSearch, filterRange])

  // Group by range
  const grouped = useMemo(() => {
    const byRange = {}
    filtered.forEach(s => {
      const rangeName = s.ranges?.name || 'Unknown Range'
      if (!byRange[rangeName]) byRange[rangeName] = []
      byRange[rangeName].push(s)
    })
    return Object.entries(byRange).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Lightbox navigation
  const thumbStyles = useMemo(() => filtered.filter(s => s.thumbnail_url), [filtered])

  function lightboxNav(dir) {
    if (!lightbox) return
    const idx = thumbStyles.findIndex(s => s.id === lightbox.styleId)
    if (idx < 0) return
    const next = idx + dir
    if (next >= 0 && next < thumbStyles.length) {
      setLightbox({ url: thumbStyles[next].thumbnail_url, styleId: thumbStyles[next].id, name: thumbStyles[next].name })
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={24} /> My Work
          </h1>
          <p className="subtitle">{styles.length} piece{styles.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      {styles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Briefcase size={48} />
            <h3>No pieces assigned yet</h3>
            <p>When an admin assigns pieces to you, they'll show up here.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="rp-search" style={{ flex: 1, minWidth: 200 }}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search pieces..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
            </div>
            {ranges.length > 1 && (
              <select value={filterRange} onChange={e => setFilterRange(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
                <option value="">All Ranges</option>
                {ranges.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
          </div>

          {/* Piece Cards grouped by range */}
          {grouped.map(([rangeName, rangeStyles]) => (
            <div key={rangeName} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {rangeName}
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 400 }}>{rangeStyles.length} piece{rangeStyles.length !== 1 ? 's' : ''}</span>
              </h3>
              <div className="mywork-grid">
                {rangeStyles.map(style => (
                  <div key={style.id} className="mywork-card">
                    {/* Image */}
                    <div className="mywork-card-image" onClick={() => {
                      if (style.thumbnail_url) setLightbox({ url: style.thumbnail_url, styleId: style.id, name: style.name })
                    }}>
                      {style.thumbnail_url ? (
                        <>
                          <img src={style.thumbnail_url} alt={style.name} loading="lazy" />
                          <button className="rp-thumb-zoom" onClick={(e) => {
                            e.stopPropagation()
                            setLightbox({ url: style.thumbnail_url, styleId: style.id, name: style.name })
                          }}>
                            <Maximize2 size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="mywork-card-placeholder">
                          <ImageIcon size={32} />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="mywork-card-body">
                      <div className="mywork-card-name">{style.name}</div>
                      <div className="mywork-card-meta">
                        <span className="tag">{style.category}</span>
                        {style.silhouette && <span className="tag" style={{ background: 'var(--primary-light, #e0e7ff)', color: 'var(--primary)' }}>{style.silhouette}</span>}
                      </div>

                      {style.colorways?.length > 0 && (
                        <div className="mywork-card-colors">
                          {style.colorways.map((c, i) => (
                            <span key={i} className="mywork-color-chip">{c}</span>
                          ))}
                        </div>
                      )}

                      {style.embroidery && (
                        <div className="mywork-card-detail">
                          <span className="mywork-detail-label">Embroidery</span>
                          <span>{style.embroidery}</span>
                        </div>
                      )}

                      {style.price_category && (
                        <div className="mywork-card-detail">
                          <span className="mywork-detail-label">Price</span>
                          <span>{style.price_category}</span>
                        </div>
                      )}

                      {style.production_qty > 0 && (
                        <div className="mywork-card-detail">
                          <span className="mywork-detail-label">Qty</span>
                          <span>{style.production_qty.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Production Status — EDITABLE */}
                      <div className="mywork-card-status">
                        <span className="mywork-detail-label">Production Status</span>
                        <select
                          value={style.production_status || 'pending'}
                          onChange={e => handleProductionStatusChange(style.id, e.target.value)}
                          className="mywork-status-select"
                          style={{
                            background: (PRODUCTION_STATUSES.find(s => s.value === (style.production_status || 'pending'))?.bg),
                            color: (PRODUCTION_STATUSES.find(s => s.value === (style.production_status || 'pending'))?.color),
                          }}
                        >
                          {PRODUCTION_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="rp-lightbox" onClick={() => setLightbox(null)}>
          <button className="rp-lightbox-close" onClick={() => setLightbox(null)}><X size={24} /></button>
          {thumbStyles.findIndex(s => s.id === lightbox.styleId) > 0 && (
            <button className="rp-lightbox-nav rp-lightbox-prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>
              <ChevronLeft size={32} />
            </button>
          )}
          <div className="rp-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name || ''} />
            {lightbox.name && <div className="rp-lightbox-caption">{lightbox.name}</div>}
          </div>
          {thumbStyles.findIndex(s => s.id === lightbox.styleId) < thumbStyles.length - 1 && (
            <button className="rp-lightbox-nav rp-lightbox-next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
