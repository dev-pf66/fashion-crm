import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import { getMyAssignedStyles, getAllAssignedStyles, getProductionStages, updateRangeStyle, logProductionStatusChange } from '../lib/supabase'
import {
  Briefcase, Image as ImageIcon, X, ChevronLeft, ChevronRight,
  Maximize2, Search, LayoutGrid, List, Clock, Users,
} from 'lucide-react'

export default function MyWork() {
  const { currentPerson, people } = useApp()
  const { isAllAccess, can } = usePermissions()
  const canEditKanban = can('my_work.edit')
  const toast = useToast()
  const [styles, setStyles] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [lightbox, setLightbox] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterRange, setFilterRange] = useState('')
  const [selectedPerson, setSelectedPerson] = useState('')

  useEffect(() => {
    loadData()
  }, [currentPerson?.id, selectedPerson])

  async function loadData() {
    if (!currentPerson?.id) return
    setLoading(true)
    try {
      const [stagesData, stylesData] = await Promise.all([
        getProductionStages(),
        isAllAccess && selectedPerson
          ? getAllAssignedStyles().then(s => s.filter(x => x.assigned_to === parseInt(selectedPerson)))
          : isAllAccess && !selectedPerson
          ? getAllAssignedStyles()
          : getMyAssignedStyles(currentPerson.id),
      ])
      setStages(stagesData || [])
      setStyles(stylesData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      toast.error('Failed to load pieces')
    } finally {
      setLoading(false)
    }
  }

  async function handleStageChange(styleId, newStageId) {
    const style = styles.find(s => s.id === styleId)
    if (!style) return
    const oldStage = style.stage
    const newStage = stages.find(s => s.id === newStageId)
    if (!newStage || oldStage?.id === newStageId) return

    // Optimistic update
    setStyles(prev => prev.map(s => s.id === styleId
      ? { ...s, production_stage_id: newStageId, stage: newStage, status_updated_at: new Date().toISOString() }
      : s
    ))

    try {
      await updateRangeStyle(styleId, { production_stage_id: newStageId, status_updated_at: new Date().toISOString() })
      await logProductionStatusChange({
        style_id: styleId,
        changed_by: currentPerson.id,
        old_stage_id: oldStage?.id || null,
        new_stage_id: newStageId,
        old_stage_name: oldStage?.name || 'None',
        new_stage_name: newStage.name,
      })
    } catch (err) {
      toast.error('Failed to update status')
      loadData()
    }
  }

  function handleDragEnd(result) {
    if (!canEditKanban) return
    if (!result.destination) return
    const styleId = result.draggableId
    const newStageId = parseInt(result.destination.droppableId)
    handleStageChange(styleId, newStageId)
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

  // Group by stage for Kanban
  const kanbanColumns = useMemo(() => {
    return stages.map(stage => ({
      ...stage,
      styles: filtered.filter(s => (s.production_stage_id || s.stage?.id) === stage.id),
    }))
  }, [stages, filtered])

  // Group by range for list view
  const grouped = useMemo(() => {
    const byRange = {}
    filtered.forEach(s => {
      const rangeName = s.ranges?.name || 'Unknown Range'
      if (!byRange[rangeName]) byRange[rangeName] = []
      byRange[rangeName].push(s)
    })
    return Object.entries(byRange).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Assignees for admin filter
  const assignees = useMemo(() => {
    const ids = [...new Set(styles.map(s => s.assigned_to).filter(Boolean))]
    return people.filter(p => ids.includes(p.id))
  }, [styles, people])

  // Lightbox
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
            <Briefcase size={24} /> {isAllAccess ? 'Production Board' : 'My Work'}
          </h1>
          <p className="subtitle">
            {isAllAccess
              ? `${styles.length} assigned piece${styles.length !== 1 ? 's' : ''} across team`
              : `${styles.length} piece${styles.length !== 1 ? 's' : ''} assigned to you`
            }
          </p>
        </div>
      </div>

      {styles.length === 0 && !isAllAccess ? (
        <div className="card">
          <div className="empty-state">
            <Briefcase size={48} />
            <h3>No pieces assigned yet</h3>
            <p>When an admin assigns pieces to you, they'll show up here.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="rp-view-toggle">
              <button className={`rp-view-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>
                <LayoutGrid size={16} /> Kanban
              </button>
              <button className={`rp-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
                <List size={16} /> List
              </button>
            </div>
            <div className="rp-search" style={{ flex: 1, minWidth: 160 }}>
              <Search size={14} />
              <input type="text" placeholder="Search pieces..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
            </div>
            {ranges.length > 1 && (
              <select value={filterRange} onChange={e => setFilterRange(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
                <option value="">All Ranges</option>
                {ranges.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {isAllAccess && assignees.length > 0 && (
              <select value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
                <option value="">All Assignees</option>
                {assignees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {/* Kanban View */}
          {view === 'kanban' && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="kanban-board">
                {kanbanColumns.map(col => (
                  <div key={col.id} className="kanban-column">
                    <div className="kanban-column-header" style={{ borderTopColor: col.color }}>
                      <span className="kanban-column-dot" style={{ background: col.color }} />
                      <span className="kanban-column-title">{col.name}</span>
                      <span className="kanban-column-count">{col.styles.length}</span>
                    </div>
                    <Droppable droppableId={String(col.id)}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`kanban-column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                        >
                          {col.styles.map((style, index) => (
                            <Draggable key={style.id} draggableId={style.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                >
                                  {style.thumbnail_url && (
                                    <div className="kanban-card-thumb" onClick={() => setLightbox({ url: style.thumbnail_url, styleId: style.id, name: style.name })}>
                                      <img src={style.thumbnail_url} alt={style.name} loading="lazy" />
                                    </div>
                                  )}
                                  <div className="kanban-card-body">
                                    <div className="kanban-card-name">{style.name}</div>
                                    <div className="kanban-card-meta">
                                      {style.silhouette && <span className="tag" style={{ fontSize: '0.625rem' }}>{style.silhouette}</span>}
                                      {style.price_category && <span className="tag" style={{ fontSize: '0.625rem', background: 'var(--gray-100)' }}>{style.price_category}</span>}
                                    </div>
                                    {isAllAccess && style.assignee?.name && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span className="rp-assignee-avatar" style={{ width: 14, height: 14, fontSize: '0.4rem' }}>{style.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                                        {style.assignee.name.split(' ')[0]}
                                      </div>
                                    )}
                                    {style.due_date && new Date(style.due_date) < new Date() && (
                                      <div className="kanban-card-overdue">
                                        <Clock size={10} /> Overdue
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {col.styles.length === 0 && (
                            <div className="kanban-empty">No pieces</div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}

          {/* List View */}
          {view === 'list' && (
            <>
              {grouped.map(([rangeName, rangeStyles]) => (
                <div key={rangeName} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {rangeName}
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 400 }}>{rangeStyles.length} piece{rangeStyles.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <div className="mywork-grid">
                    {rangeStyles.map(style => (
                      <div key={style.id} className="mywork-card">
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
                        <div className="mywork-card-body">
                          <div className="mywork-card-name">{style.name}</div>
                          <div className="mywork-card-meta">
                            <span className="tag">{style.category}</span>
                            {style.silhouette && <span className="tag" style={{ background: 'var(--primary-light, #e0e7ff)', color: 'var(--primary)' }}>{style.silhouette}</span>}
                          </div>
                          {style.colorways?.length > 0 && (
                            <div className="mywork-card-colors">
                              {style.colorways.map((c, i) => <span key={i} className="mywork-color-chip">{c}</span>)}
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
                          {isAllAccess && style.assignee?.name && (
                            <div className="mywork-card-detail">
                              <span className="mywork-detail-label">Assigned</span>
                              <span>{style.assignee.name}</span>
                            </div>
                          )}
                          {/* Production Stage — EDITABLE */}
                          <div className="mywork-card-status">
                            <span className="mywork-detail-label">Stage</span>
                            <select
                              value={style.production_stage_id || stages[0]?.id || ''}
                              onChange={e => handleStageChange(style.id, parseInt(e.target.value))}
                              className="mywork-status-select"
                              style={{
                                background: style.stage?.color ? `${style.stage.color}20` : '#f3f4f6',
                                color: style.stage?.color || '#4b5563',
                                borderColor: style.stage?.color ? `${style.stage.color}40` : 'var(--gray-200)',
                                border: '1px solid',
                              }}
                            >
                              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          {style.due_date && new Date(style.due_date) < new Date() && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 600 }}>
                              <Clock size={11} /> Overdue — due {new Date(style.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grouped.length === 0 && (
                <div className="card">
                  <div className="empty-state">
                    <Briefcase size={48} />
                    <h3>No pieces found</h3>
                  </div>
                </div>
              )}
            </>
          )}
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
