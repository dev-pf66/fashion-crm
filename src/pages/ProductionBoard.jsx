import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { supabase, getProductionStages, updateRangeStyle, logProductionStatusChange } from '../lib/supabase'
import {
  PackageCheck, Search, User, Clock, GripVertical,
  Image as ImageIcon, X, ChevronLeft, ChevronRight, Maximize2,
  LayoutGrid, List, SlidersHorizontal,
} from 'lucide-react'
import { KanbanSkeleton } from '../components/PageSkeleton'
import Modal from '../components/Modal'

function unitStagesFor(item) {
  if (Array.isArray(item.unit_stages) && item.unit_stages.length > 0) return item.unit_stages
  const qty = item.production_qty || 0
  const sid = item.production_stage_id || null
  return qty > 0 && sid ? Array.from({ length: qty }, () => sid) : []
}

function stageCounts(unitStages) {
  const counts = new Map()
  for (const sid of unitStages) {
    if (sid == null) continue
    counts.set(sid, (counts.get(sid) || 0) + 1)
  }
  return counts
}

// Where the card lives on the kanban: the earliest (lowest sort_order) stage
// that still has at least one unit. Falls back to production_stage_id when
// unit_stages isn't populated.
function placementStage(item, stages) {
  const us = unitStagesFor(item)
  if (us.length === 0) return item.production_stage_id || null
  const present = new Set(us)
  const ordered = stages
    .filter(s => present.has(s.id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  return ordered[0]?.id || item.production_stage_id || null
}

function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

export default function ProductionBoard() {
  const { currentPerson, people } = useApp()
  const { currentDivision } = useDivision()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [search, setSearch] = useState('')
  const [filterLead, setFilterLead] = useState('')
  const [filterRange, setFilterRange] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [editUnitsItem, setEditUnitsItem] = useState(null)

  useEffect(() => { loadData() }, [currentDivision])

  async function loadData() {
    setLoading(true)
    try {
      let query = supabase
        .from('range_styles')
        .select('*, ranges!inner(id, name, division_id), stage:production_stage_id(id, name, color, sort_order)')
        .eq('status', 'production')
        .order('pushed_to_production_at', { ascending: false })

      if (currentDivision) {
        query = query.eq('ranges.division_id', currentDivision.id)
      }

      const [{ data, error }, stageData] = await Promise.all([
        query,
        getProductionStages(),
      ])
      if (error) throw error
      setItems(data || [])
      setStages(stageData || [])
    } catch (err) {
      console.error('Failed to load production items:', err)
      toast.error('Failed to load production board')
    } finally {
      setLoading(false)
    }
  }

  async function handleStageChange(itemId, newStageId) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const oldStage = item.stage
    const newStage = stages.find(s => s.id === newStageId)
    if (!newStage) return

    const qty = item.production_qty || 0
    const newUnitStages = qty > 0 ? Array.from({ length: qty }, () => newStageId) : null

    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, production_stage_id: newStageId, stage: newStage, unit_stages: newUnitStages, status_updated_at: new Date().toISOString() }
      : i
    ))

    try {
      await updateRangeStyle(itemId, { production_stage_id: newStageId, unit_stages: newUnitStages, status_updated_at: new Date().toISOString() })
      await logProductionStatusChange({
        style_id: itemId,
        changed_by: currentPerson?.id || null,
        old_stage_id: oldStage?.id || null,
        new_stage_id: newStageId,
        old_stage_name: oldStage?.name || 'None',
        new_stage_name: newStage.name,
      })
    } catch (err) {
      toast.error('Failed to update stage')
      loadData()
    }
  }

  async function saveUnitStages(itemId, newUnitStages) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const cleaned = newUnitStages.filter(v => v != null)
    // Keep production_stage_id pointing at the most-common (mode) stage so
    // any other view that reads it keeps showing something sensible.
    const counts = stageCounts(cleaned)
    let primary = null
    let max = 0
    for (const [sid, n] of counts) {
      if (n > max) { max = n; primary = sid }
    }
    const primaryStage = stages.find(s => s.id === primary) || null

    setItems(prev => prev.map(i => i.id === itemId
      ? {
          ...i,
          unit_stages: cleaned.length ? cleaned : null,
          production_stage_id: primary || i.production_stage_id,
          stage: primaryStage || i.stage,
          status_updated_at: new Date().toISOString(),
        }
      : i
    ))

    try {
      await updateRangeStyle(itemId, {
        unit_stages: cleaned.length ? cleaned : null,
        production_stage_id: primary,
        status_updated_at: new Date().toISOString(),
      })
    } catch (err) {
      toast.error('Failed to update units')
      loadData()
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const itemId = result.draggableId
    const newStageId = parseInt(result.destination.droppableId)
    handleStageChange(itemId, newStageId)
  }

  const peopleMap = useMemo(() => {
    const map = {}
    for (const p of people) map[p.id] = p.name
    return map
  }, [people])

  const ranges = useMemo(() => {
    return [...new Set(items.map(i => i.ranges?.name).filter(Boolean))].sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) &&
          !item.production_client?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterLead && item.production_lead !== parseInt(filterLead)) return false
      if (filterRange && item.ranges?.name !== filterRange) return false
      return true
    })
  }, [items, search, filterLead, filterRange])

  const kanbanColumns = useMemo(() => {
    return stages.map(stage => ({
      ...stage,
      items: filtered.filter(i => placementStage(i, stages) === stage.id),
    }))
  }, [stages, filtered])

  const grouped = useMemo(() => {
    const byRange = {}
    filtered.forEach(i => {
      const rangeName = i.ranges?.name || 'Unknown Range'
      if (!byRange[rangeName]) byRange[rangeName] = []
      byRange[rangeName].push(i)
    })
    return Object.entries(byRange).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const totalQty = filtered.reduce((sum, i) => sum + (i.production_qty || 0), 0)

  const thumbItems = useMemo(() => filtered.filter(i => i.thumbnail_url), [filtered])
  function lightboxNav(dir) {
    if (!lightbox) return
    const idx = thumbItems.findIndex(i => i.id === lightbox.itemId)
    if (idx < 0) return
    const next = idx + dir
    if (next >= 0 && next < thumbItems.length) {
      setLightbox({ url: thumbItems[next].thumbnail_url, itemId: thumbItems[next].id, name: thumbItems[next].name })
    }
  }

  if (loading) return <KanbanSkeleton />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackageCheck size={24} /> Production Board
          </h1>
          <p className="page-subtitle">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} &middot; {totalQty.toLocaleString()} total units
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <PackageCheck size={48} />
            <h3>No production items yet</h3>
            <p>Push pieces to production from your range plans to see them here.</p>
          </div>
        </div>
      ) : (
        <>
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
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search pieces or clients..."
              />
            </div>
            {ranges.length > 1 && (
              <select value={filterRange} onChange={e => setFilterRange(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
                <option value="">All Ranges</option>
                {ranges.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <select value={filterLead} onChange={e => setFilterLead(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
              <option value="">All Leads</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {view === 'kanban' && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="kanban-board">
                {kanbanColumns.map(col => (
                  <div key={col.id} className="kanban-column">
                    <div className="kanban-column-header" style={{ borderTopColor: col.color }}>
                      <span className="kanban-column-dot" style={{ background: col.color }} />
                      <span className="kanban-column-title">{col.name}</span>
                      <span className="kanban-column-count">{col.items.length}</span>
                    </div>
                    <Droppable droppableId={String(col.id)}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`kanban-column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                        >
                          {col.items.map((item, index) => {
                            const us = unitStagesFor(item)
                            const counts = stageCounts(us)
                            const isSplit = counts.size > 1
                            return (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`kanban-card ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                                >
                                  {item.thumbnail_url && (
                                    <div className="kanban-card-thumb" onClick={() => setLightbox({ url: item.thumbnail_url, itemId: item.id, name: item.name })}>
                                      <img src={item.thumbnail_url} alt={item.name} loading="lazy" />
                                    </div>
                                  )}
                                  <div className="kanban-card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'flex-start' }}>
                                      <div className="kanban-card-name">{item.name}</div>
                                      {(item.production_qty || 0) > 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setEditUnitsItem(item) }}
                                          title="Edit per-unit stages"
                                          style={{ background: 'transparent', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: 2, display: 'flex' }}
                                        >
                                          <SlidersHorizontal size={12} />
                                        </button>
                                      )}
                                    </div>
                                    <div className="kanban-card-meta">
                                      <span className="tag" style={{ fontSize: '0.625rem' }}>{(item.production_qty || 0).toLocaleString()} units</span>
                                      {item.production_client && <span className="tag" style={{ fontSize: '0.625rem', background: 'var(--gray-100)' }}>{item.production_client}</span>}
                                    </div>
                                    {isSplit && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                                        {[...counts.entries()]
                                          .sort((a, b) => {
                                            const sa = stages.find(s => s.id === a[0])?.sort_order || 0
                                            const sb = stages.find(s => s.id === b[0])?.sort_order || 0
                                            return sa - sb
                                          })
                                          .map(([sid, n]) => {
                                            const stage = stages.find(s => s.id === sid)
                                            return (
                                              <span
                                                key={sid}
                                                className="tag"
                                                style={{ fontSize: '0.5625rem', background: stage?.color ? `${stage.color}20` : '#f3f4f6', color: stage?.color || '#4b5563' }}
                                              >
                                                {n} · {stage?.name || '?'}
                                              </span>
                                            )
                                          })}
                                      </div>
                                    )}
                                    {item.production_lead && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <User size={11} /> {peopleMap[item.production_lead] || 'Unknown'}
                                      </div>
                                    )}
                                    {item.pushed_to_production_at && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={10} /> {timeAgo(item.pushed_to_production_at)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                            )
                          })}
                          {provided.placeholder}
                          {col.items.length === 0 && (
                            <div className="kanban-empty">No items</div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}

          {view === 'list' && (
            <>
              {grouped.map(([rangeName, rangeItems]) => (
                <div key={rangeName} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {rangeName}
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 400 }}>{rangeItems.length} item{rangeItems.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <div className="mywork-grid">
                    {rangeItems.map(item => (
                      <div key={item.id} className="mywork-card">
                        <div className="mywork-card-image" onClick={() => {
                          if (item.thumbnail_url) setLightbox({ url: item.thumbnail_url, itemId: item.id, name: item.name })
                        }}>
                          {item.thumbnail_url ? (
                            <>
                              <img src={item.thumbnail_url} alt={item.name} loading="lazy" />
                              <button className="rp-thumb-zoom" onClick={(e) => {
                                e.stopPropagation()
                                setLightbox({ url: item.thumbnail_url, itemId: item.id, name: item.name })
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
                          <div className="mywork-card-name">{item.name}</div>
                          <div className="mywork-card-meta">
                            <span className="tag">{(item.production_qty || 0).toLocaleString()} units</span>
                            {item.production_client && (
                              <span className="tag" style={{ background: 'var(--primary-light, #e0e7ff)', color: 'var(--primary)' }}>{item.production_client}</span>
                            )}
                          </div>
                          {item.production_lead && (
                            <div className="mywork-card-detail">
                              <span className="mywork-detail-label">Lead</span>
                              <span>{peopleMap[item.production_lead] || 'Unknown'}</span>
                            </div>
                          )}
                          {item.production_collaborators?.length > 0 && (
                            <div className="mywork-card-detail">
                              <span className="mywork-detail-label">Collaborators</span>
                              <span>{item.production_collaborators.map(id => peopleMap[id] || '?').join(', ')}</span>
                            </div>
                          )}
                          {item.production_notes && (
                            <div className="mywork-card-detail">
                              <span className="mywork-detail-label">Notes</span>
                              <span>{item.production_notes}</span>
                            </div>
                          )}
                          {(() => {
                            const us = unitStagesFor(item)
                            const counts = stageCounts(us)
                            if (counts.size > 1) {
                              return (
                                <div className="mywork-card-detail">
                                  <span className="mywork-detail-label">Per unit</span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {[...counts.entries()]
                                      .sort((a, b) => {
                                        const sa = stages.find(s => s.id === a[0])?.sort_order || 0
                                        const sb = stages.find(s => s.id === b[0])?.sort_order || 0
                                        return sa - sb
                                      })
                                      .map(([sid, n]) => {
                                        const stage = stages.find(s => s.id === sid)
                                        return (
                                          <span
                                            key={sid}
                                            className="tag"
                                            style={{ fontSize: '0.6875rem', background: stage?.color ? `${stage.color}20` : '#f3f4f6', color: stage?.color || '#4b5563' }}
                                          >
                                            {n} · {stage?.name || '?'}
                                          </span>
                                        )
                                      })}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}
                          <div className="mywork-card-status">
                            <span className="mywork-detail-label">Stage</span>
                            <select
                              value={item.production_stage_id || stages[0]?.id || ''}
                              onChange={e => handleStageChange(item.id, parseInt(e.target.value))}
                              className="mywork-status-select"
                              style={{
                                background: item.stage?.color ? `${item.stage.color}20` : '#f3f4f6',
                                color: item.stage?.color || '#4b5563',
                                borderColor: item.stage?.color ? `${item.stage.color}40` : 'var(--gray-200)',
                                border: '1px solid',
                              }}
                            >
                              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          {(item.production_qty || 0) > 1 && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ marginTop: 6 }}
                              onClick={() => setEditUnitsItem(item)}
                            >
                              <SlidersHorizontal size={12} /> Edit per unit
                            </button>
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
                    <PackageCheck size={48} />
                    <h3>No items match your filters</h3>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {lightbox && (
        <div className="rp-lightbox" onClick={() => setLightbox(null)}>
          <button className="rp-lightbox-close" onClick={() => setLightbox(null)}><X size={24} /></button>
          {thumbItems.findIndex(i => i.id === lightbox.itemId) > 0 && (
            <button className="rp-lightbox-nav rp-lightbox-prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>
              <ChevronLeft size={32} />
            </button>
          )}
          <div className="rp-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name || ''} />
            {lightbox.name && <div className="rp-lightbox-caption">{lightbox.name}</div>}
          </div>
          {thumbItems.findIndex(i => i.id === lightbox.itemId) < thumbItems.length - 1 && (
            <button className="rp-lightbox-nav rp-lightbox-next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      )}

      {editUnitsItem && (
        <PerUnitModal
          item={editUnitsItem}
          stages={stages}
          onClose={() => setEditUnitsItem(null)}
          onSave={async (newUnitStages) => {
            await saveUnitStages(editUnitsItem.id, newUnitStages)
            setEditUnitsItem(null)
            toast.success('Units updated')
          }}
        />
      )}
    </div>
  )
}

function PerUnitModal({ item, stages, onClose, onSave }) {
  const initial = useMemo(() => {
    const arr = Array.isArray(item.unit_stages) && item.unit_stages.length > 0
      ? [...item.unit_stages]
      : Array.from({ length: item.production_qty || 0 }, () => item.production_stage_id || stages[0]?.id || null)
    return arr
  }, [item, stages])

  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)

  function setUnit(i, value) {
    setDraft(prev => prev.map((v, idx) => idx === i ? value : v))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Per-unit progress: ${item.name}`} onClose={onClose}>
      <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
        Each unit can sit at its own stage. Dragging the card on the board still moves all units together.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
        {draft.map((sid, i) => {
          const stage = stages.find(s => s.id === sid)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', minWidth: 60 }}>Unit {i + 1}</span>
              <select
                value={sid || ''}
                onChange={e => setUnit(i, parseInt(e.target.value))}
                style={{
                  flex: 1,
                  fontSize: '0.8125rem',
                  background: stage?.color ? `${stage.color}20` : '#f3f4f6',
                  color: stage?.color || '#4b5563',
                  borderColor: stage?.color ? `${stage.color}40` : 'var(--gray-200)',
                  border: '1px solid',
                  borderRadius: 4,
                  padding: '4px 8px',
                }}
              >
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
