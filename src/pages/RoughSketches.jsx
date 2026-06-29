import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { getRoughSketches, setSketchStatus } from '../lib/supabase'
import { PenLine, Image as ImageIcon, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { KanbanSkeleton } from '../components/PageSkeleton'
import { thumbUrl } from '../lib/imgUrl'

const COLUMNS = [
  { id: 'in_review', label: 'In Review', color: '#f59e0b' },
  { id: 'approved',  label: 'Approved',  color: '#10b981' },
]

export default function RoughSketches() {
  const { currentDivision } = useDivision()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    loadData()
  }, [currentDivision])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getRoughSketches(currentDivision?.id)
      setItems(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load rough sketches')
    } finally {
      setLoading(false)
    }
  }

  async function moveItem(id, newStatus) {
    const prev = items.find(i => i.id === id)
    if (!prev || prev.sketch_status === newStatus) return
    setItems(all => all.map(i => i.id === id ? { ...i, sketch_status: newStatus } : i))
    try {
      await setSketchStatus(id, newStatus)
    } catch (err) {
      toast.error('Failed to update status')
      loadData()
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const id = result.draggableId
    const newStatus = result.destination.droppableId
    moveItem(id, newStatus)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.ranges?.name?.toLowerCase().includes(q)
    )
  }, [items, search])

  const thumbItems = useMemo(() => filtered.filter(i => i.thumbnail_url), [filtered])

  function lightboxNav(dir) {
    if (!lightbox) return
    const idx = thumbItems.findIndex(i => i.id === lightbox.id)
    if (idx < 0) return
    const next = idx + dir
    if (next >= 0 && next < thumbItems.length) setLightbox(thumbItems[next])
  }

  if (loading) return <KanbanSkeleton />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PenLine size={24} /> Rough Sketches
          </h1>
          <p className="page-subtitle">{items.length} sketch{items.length !== 1 ? 'es' : ''} in review</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <PenLine size={48} />
            <h3>No rough sketches yet</h3>
            <p>Open a style in any range plan and use "Send to Sketch Review" to add it here.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <div className="rp-search" style={{ maxWidth: 320 }}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search sketches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {COLUMNS.map(col => {
                const colItems = filtered.filter(i => i.sketch_status === col.id)
                return (
                  <div key={col.id} className="kanban-column">
                    <div className="kanban-column-header" style={{ borderTopColor: col.color }}>
                      <span className="kanban-column-dot" style={{ background: col.color }} />
                      <span className="kanban-column-title">{col.label}</span>
                      <span className="kanban-column-count">{colItems.length}</span>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`kanban-column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                        >
                          {colItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`kanban-card ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                                >
                                  {item.thumbnail_url ? (
                                    <div
                                      className="kanban-card-thumb"
                                      onClick={() => setLightbox(item)}
                                    >
                                      <img src={thumbUrl(item.thumbnail_url, { w: 240 })} alt={item.name} loading="lazy" />
                                    </div>
                                  ) : (
                                    <div className="kanban-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-100)', minHeight: 80 }}>
                                      <ImageIcon size={24} style={{ color: 'var(--gray-400)' }} />
                                    </div>
                                  )}
                                  <div className="kanban-card-body">
                                    <div className="kanban-card-name">{item.name}</div>
                                    <div className="kanban-card-meta">
                                      {item.category && (
                                        <span className="tag" style={{ fontSize: '0.625rem' }}>{item.category}</span>
                                      )}
                                      {item.ranges?.name && (
                                        <span className="tag" style={{ fontSize: '0.625rem', background: 'var(--gray-100)' }}>{item.ranges.name}</span>
                                      )}
                                    </div>
                                    {item.assignee?.name && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                                        {item.assignee.name}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                                      {COLUMNS.filter(c => c.id !== item.sketch_status).map(c => (
                                        <button
                                          key={c.id}
                                          className="btn btn-sm btn-secondary"
                                          style={{ fontSize: '0.625rem', padding: '0.2rem 0.5rem' }}
                                          onMouseDown={e => e.stopPropagation()}
                                          onClick={e => { e.stopPropagation(); moveItem(item.id, c.id) }}
                                        >
                                          → {c.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {colItems.length === 0 && (
                            <div className="kanban-empty">No sketches</div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        </>
      )}

      {lightbox && (
        <div className="rp-lightbox" onClick={() => setLightbox(null)}>
          <button className="rp-lightbox-close" onClick={() => setLightbox(null)}><X size={24} /></button>
          {thumbItems.findIndex(i => i.id === lightbox.id) > 0 && (
            <button className="rp-lightbox-nav rp-lightbox-prev" onClick={e => { e.stopPropagation(); lightboxNav(-1) }}>
              <ChevronLeft size={32} />
            </button>
          )}
          <div className="rp-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={lightbox.thumbnail_url} alt={lightbox.name || ''} />
            {lightbox.name && <div className="rp-lightbox-caption">{lightbox.name}</div>}
          </div>
          {thumbItems.findIndex(i => i.id === lightbox.id) < thumbItems.length - 1 && (
            <button className="rp-lightbox-nav rp-lightbox-next" onClick={e => { e.stopPropagation(); lightboxNav(1) }}>
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
