import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import {
  supabase, getProductionStages,
  getProductionUnitsForRanges, createProductionUnits, updateProductionUnit,
} from '../lib/supabase'
import {
  PackageCheck, Search, User, Clock,
  Image as ImageIcon, X, ChevronLeft, ChevronRight, Maximize2,
  LayoutGrid, List, UserPlus, Pencil,
} from 'lucide-react'
import { KanbanSkeleton } from '../components/PageSkeleton'
import Modal from '../components/Modal'

const RS_PREFIX = 'rs:'
const UN_PREFIX = 'u:'

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
  const { people } = useApp()
  const { currentDivision } = useDivision()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [units, setUnits] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [search, setSearch] = useState('')
  const [filterLead, setFilterLead] = useState('')
  const [filterRange, setFilterRange] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [splitModal, setSplitModal] = useState(null)
  const [assigneeModal, setAssigneeModal] = useState(null)

  useEffect(() => { loadData() }, [currentDivision])

  async function loadData() {
    setLoading(true)
    try {
      let query = supabase
        .from('range_styles')
        .select('*, ranges!inner(id, name, division_id), stage:production_floor_stage_id(id, name, color, sort_order)')
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
      const rangeStyles = data || []
      setItems(rangeStyles)
      setStages(stageData || [])

      if (rangeStyles.length > 0) {
        const unitsData = await getProductionUnitsForRanges(rangeStyles.map(r => r.id))
        setUnits(unitsData)
      } else {
        setUnits([])
      }
    } catch (err) {
      console.error('Failed to load production items:', err)
      toast.error('Failed to load production board')
    } finally {
      setLoading(false)
    }
  }

  // Map of range_style_id -> units, used to hide range_styles that have been split.
  const unitsByRangeId = useMemo(() => {
    const m = new Map()
    for (const u of units) {
      const arr = m.get(u.range_style_id) || []
      arr.push(u)
      m.set(u.range_style_id, arr)
    }
    return m
  }, [units])

  async function splitIntoUnits(rangeStyleId, stageId, assignments) {
    const rows = assignments.map((a, i) => ({
      range_style_id: rangeStyleId,
      unit_number: i + 1,
      assigned_to: a.assignee || null,
      production_floor_stage_id: stageId,
    }))
    try {
      const created = await createProductionUnits(rows)
      setUnits(prev => [...prev, ...created])
      toast.success(`${rows.length} unit${rows.length > 1 ? 's' : ''} started`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to start production')
    }
  }

  function handleRangeStyleDrop(rangeStyleId, newStageId) {
    const rs = items.find(i => i.id === rangeStyleId)
    if (!rs) return
    if (unitsByRangeId.has(rangeStyleId)) {
      // Already split — shouldn't be draggable as a range_style anymore. Ignore.
      return
    }
    const qty = rs.production_qty || 0
    if (qty <= 0) {
      toast.error('Set a production quantity before starting production')
      return
    }
    if (qty === 1) {
      // Skip the modal for single-unit pieces.
      splitIntoUnits(rangeStyleId, newStageId, [{ assignee: null }])
      return
    }
    setSplitModal({ rangeStyle: rs, destStageId: newStageId })
  }

  async function updateUnitStage(unitId, newStageId) {
    const newStage = stages.find(s => s.id === newStageId)
    if (!newStage) return
    setUnits(prev => prev.map(u => u.id === unitId
      ? { ...u, production_floor_stage_id: newStageId, stage: newStage, updated_at: new Date().toISOString() }
      : u
    ))
    try {
      await updateProductionUnit(unitId, { production_floor_stage_id: newStageId })
    } catch (err) {
      toast.error('Failed to update unit stage')
      loadData()
    }
  }

  async function updateUnitAssignee(unitId, personId) {
    const person = people.find(p => p.id === personId) || null
    setUnits(prev => prev.map(u => u.id === unitId
      ? { ...u, assigned_to: personId, assignee: person ? { id: person.id, name: person.name } : null }
      : u
    ))
    try {
      await updateProductionUnit(unitId, { assigned_to: personId })
    } catch (err) {
      toast.error('Failed to update unit assignee')
      loadData()
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const draggableId = result.draggableId
    const newStageId = parseInt(result.destination.droppableId)
    if (!Number.isFinite(newStageId)) return

    if (draggableId.startsWith(RS_PREFIX)) {
      const rangeStyleId = draggableId.slice(RS_PREFIX.length)
      handleRangeStyleDrop(rangeStyleId, newStageId)
    } else if (draggableId.startsWith(UN_PREFIX)) {
      const unitId = parseInt(draggableId.slice(UN_PREFIX.length))
      updateUnitStage(unitId, newStageId)
    }
  }

  const peopleMap = useMemo(() => {
    const map = {}
    for (const p of people) map[p.id] = p.name
    return map
  }, [people])

  const ranges = useMemo(() => {
    return [...new Set(items.map(i => i.ranges?.name).filter(Boolean))].sort()
  }, [items])

  // Range styles still shown as cards: anything that hasn't been split into units yet.
  const visibleRangeStyles = useMemo(() => {
    return items.filter(item => {
      if (unitsByRangeId.has(item.id)) return false
      if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) &&
          !item.production_client?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterLead && item.production_lead !== parseInt(filterLead)) return false
      if (filterRange && item.ranges?.name !== filterRange) return false
      return true
    })
  }, [items, search, filterLead, filterRange, unitsByRangeId])

  // Joined: each unit augmented with its parent range_style for display.
  const itemsById = useMemo(() => {
    const m = new Map()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])

  const visibleUnits = useMemo(() => {
    return units
      .map(u => ({ ...u, parent: itemsById.get(u.range_style_id) || null }))
      .filter(u => {
        if (!u.parent) return false
        if (search && !u.parent.name?.toLowerCase().includes(search.toLowerCase()) &&
            !u.parent.production_client?.toLowerCase().includes(search.toLowerCase())) return false
        if (filterLead && u.assigned_to !== parseInt(filterLead) && u.parent.production_lead !== parseInt(filterLead)) return false
        if (filterRange && u.parent.ranges?.name !== filterRange) return false
        return true
      })
  }, [units, itemsById, search, filterLead, filterRange])

  const kanbanColumns = useMemo(() => {
    return stages.map(stage => {
      const rangeStylesHere = visibleRangeStyles.filter(i =>
        (i.production_floor_stage_id || i.stage?.id) === stage.id
      )
      const unitsHere = visibleUnits.filter(u =>
        (u.production_floor_stage_id || u.stage?.id) === stage.id
      )
      return { ...stage, rangeStyles: rangeStylesHere, units: unitsHere }
    })
  }, [stages, visibleRangeStyles, visibleUnits])

  const grouped = useMemo(() => {
    const byRange = {}
    visibleRangeStyles.forEach(i => {
      const rangeName = i.ranges?.name || 'Unknown Range'
      if (!byRange[rangeName]) byRange[rangeName] = []
      byRange[rangeName].push(i)
    })
    return Object.entries(byRange).sort(([a], [b]) => a.localeCompare(b))
  }, [visibleRangeStyles])

  const totalCardCount = visibleRangeStyles.length + visibleUnits.length
  const totalQty = visibleRangeStyles.reduce((sum, i) => sum + (i.production_qty || 0), 0) + visibleUnits.length

  const thumbItems = useMemo(
    () => visibleRangeStyles.filter(i => i.thumbnail_url),
    [visibleRangeStyles]
  )
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
            {totalCardCount} card{totalCardCount !== 1 ? 's' : ''} &middot; {totalQty.toLocaleString()} total units
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
              <option value="">All Assignees</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {view === 'kanban' && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="kanban-board">
                {kanbanColumns.map(col => {
                  const cardCount = col.rangeStyles.length + col.units.length
                  return (
                    <div key={col.id} className="kanban-column">
                      <div className="kanban-column-header" style={{ borderTopColor: col.color }}>
                        <span className="kanban-column-dot" style={{ background: col.color }} />
                        <span className="kanban-column-title">{col.name}</span>
                        <span className="kanban-column-count">{cardCount}</span>
                      </div>
                      <Droppable droppableId={String(col.id)}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`kanban-column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                          >
                            {col.rangeStyles.map((item, index) => (
                              <Draggable key={`rs-${item.id}`} draggableId={`${RS_PREFIX}${item.id}`} index={index}>
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
                                      <div className="kanban-card-name">{item.name}</div>
                                      <div className="kanban-card-meta">
                                        <span className="tag" style={{ fontSize: '0.625rem' }}>{(item.production_qty || 0).toLocaleString()} units</span>
                                        {item.production_client && <span className="tag" style={{ fontSize: '0.625rem', background: 'var(--gray-100)' }}>{item.production_client}</span>}
                                      </div>
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
                            ))}
                            {col.units.map((unit, index) => {
                              const total = unit.parent?.production_qty || 0
                              return (
                                <Draggable
                                  key={`u-${unit.id}`}
                                  draggableId={`${UN_PREFIX}${unit.id}`}
                                  index={col.rangeStyles.length + index}
                                >
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={`kanban-card ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                                    >
                                      <div className="kanban-card-body">
                                        <div className="kanban-card-name">
                                          {unit.parent?.name || 'Unit'}
                                        </div>
                                        <div className="kanban-card-meta">
                                          <span className="tag" style={{ fontSize: '0.625rem' }}>Unit {unit.unit_number} of {total}</span>
                                          {unit.parent?.production_client && <span className="tag" style={{ fontSize: '0.625rem', background: 'var(--gray-100)' }}>{unit.parent.production_client}</span>}
                                        </div>
                                        <div
                                          style={{ fontSize: '0.6875rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                                          onClick={(e) => { e.stopPropagation(); setAssigneeModal(unit) }}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          title="Click to change assignee"
                                        >
                                          <User size={11} />
                                          <span>{unit.assignee?.name || 'Unassigned'}</span>
                                          <Pencil size={10} style={{ opacity: 0.5, marginLeft: 2 }} />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                            {provided.placeholder}
                            {cardCount === 0 && (
                              <div className="kanban-empty">No items</div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )
                })}
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
                          <div className="mywork-card-status">
                            <span className="mywork-detail-label">Stage</span>
                            <select
                              value={item.production_floor_stage_id || stages[0]?.id || ''}
                              onChange={e => handleRangeStyleDrop(item.id, parseInt(e.target.value))}
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
                    <p className="text-muted text-sm">Pieces split into units only show on the Kanban view.</p>
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

      {splitModal && (
        <SplitUnitsModal
          rangeStyle={splitModal.rangeStyle}
          destStage={stages.find(s => s.id === splitModal.destStageId)}
          people={people}
          onClose={() => setSplitModal(null)}
          onSubmit={async (assignments) => {
            await splitIntoUnits(splitModal.rangeStyle.id, splitModal.destStageId, assignments)
            setSplitModal(null)
          }}
        />
      )}

      {assigneeModal && (
        <ChangeAssigneeModal
          unit={assigneeModal}
          parent={itemsById.get(assigneeModal.range_style_id)}
          people={people}
          onClose={() => setAssigneeModal(null)}
          onSave={async (personId) => {
            await updateUnitAssignee(assigneeModal.id, personId)
            setAssigneeModal(null)
          }}
        />
      )}
    </div>
  )
}

function SplitUnitsModal({ rangeStyle, destStage, people, onClose, onSubmit }) {
  const qty = rangeStyle.production_qty || 0
  const [assignments, setAssignments] = useState(() => Array.from({ length: qty }, () => ({ assignee: null })))
  const [bulkAssignee, setBulkAssignee] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function setRow(i, value) {
    setAssignments(prev => prev.map((row, idx) => idx === i ? { assignee: value || null } : row))
  }

  function applyBulk() {
    const id = bulkAssignee ? parseInt(bulkAssignee) : null
    setAssignments(prev => prev.map(() => ({ assignee: id })))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await onSubmit(assignments)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Start production: ${rangeStyle.name}`} onClose={onClose}>
      <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
        Splitting {qty} unit{qty === 1 ? '' : 's'} into <strong>{destStage?.name || 'next stage'}</strong>. Pick who is making each one. You can leave any blank for now.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Assign all to:</span>
        <select
          value={bulkAssignee}
          onChange={e => setBulkAssignee(e.target.value)}
          style={{ fontSize: '0.8125rem', flex: 1 }}
        >
          <option value="">— pick someone —</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" className="btn btn-sm btn-secondary" onClick={applyBulk} disabled={!bulkAssignee}>
          <UserPlus size={12} /> Apply
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
        {assignments.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', minWidth: 70 }}>Unit {i + 1}</span>
            <select
              value={row.assignee || ''}
              onChange={e => setRow(i, e.target.value ? parseInt(e.target.value) : null)}
              style={{ flex: 1, fontSize: '0.8125rem' }}
            >
              <option value="">Unassigned</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Starting...' : 'Start production'}
        </button>
      </div>
    </Modal>
  )
}

function ChangeAssigneeModal({ unit, parent, people, onClose, onSave }) {
  const total = parent?.production_qty || 0
  const [picked, setPicked] = useState(unit.assigned_to || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(picked ? parseInt(picked) : null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Reassign Unit ${unit.unit_number} of ${total}`} onClose={onClose}>
      <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
        {parent?.name ? <><strong>{parent.name}</strong> · </> : null}
        Pick who's making this unit.
      </p>
      <div className="form-group">
        <label>Assignee</label>
        <select value={picked} onChange={e => setPicked(e.target.value)} style={{ width: '100%' }}>
          <option value="">Unassigned</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
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
