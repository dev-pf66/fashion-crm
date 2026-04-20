import { useState, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { PackageCheck, Search, User, Clock, Filter, GripVertical } from 'lucide-react'

const PROD_STATUSES = [
  { value: 'pending', label: 'Pending', bg: '#fef3c7', color: '#b45309' },
  { value: 'in_progress', label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'completed', label: 'Completed', bg: '#dcfce7', color: '#15803d' },
]

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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLead, setFilterLead] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { loadData() }, [currentDivision])

  async function loadData() {
    try {
      let query = supabase
        .from('range_styles')
        .select('*, ranges!inner(id, name, division_id)')
        .eq('status', 'production')
        .order('pushed_to_production_at', { ascending: false })

      if (currentDivision) {
        query = query.eq('ranges.division_id', currentDivision.id)
      }

      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Failed to load production items:', err)
      toast.error('Failed to load production board')
    } finally {
      setLoading(false)
    }
  }

  async function updateProdStatus(itemId, newStatus) {
    try {
      const { error } = await supabase
        .from('range_styles')
        .update({ production_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', itemId)
      if (error) throw error
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, production_status: newStatus } : i))
      toast.success(`Status updated to ${newStatus}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const { draggableId, source, destination } = result
    if (source.droppableId === destination.droppableId) return
    const itemId = parseInt(draggableId)
    updateProdStatus(itemId, destination.droppableId)
  }

  const peopleMap = useMemo(() => {
    const map = {}
    for (const p of people) map[p.id] = p.name
    return map
  }, [people])

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) &&
          !item.production_client?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterLead && item.production_lead !== parseInt(filterLead)) return false
      if (filterStatus && item.production_status !== filterStatus) return false
      return true
    })
  }, [items, search, filterLead, filterStatus])

  // Group by production status
  const grouped = useMemo(() => {
    const groups = {}
    for (const status of PROD_STATUSES) {
      groups[status.value] = filtered.filter(i => (i.production_status || 'pending') === status.value)
    }
    return groups
  }, [filtered])

  const totalQty = filtered.reduce((sum, i) => sum + (i.production_qty || 0), 0)

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Production Board</h1>
          <p className="page-subtitle">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} &middot; {totalQty.toLocaleString()} total units
          </p>
        </div>
      </div>

      <div className="prod-filters">
        <div className="prod-search">
          <Search size={14} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pieces or clients..."
          />
        </div>
        <select value={filterLead} onChange={e => setFilterLead(e.target.value)}>
          <option value="">All leads</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PROD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <PackageCheck size={48} />
            <h3>No production items yet</h3>
            <p>Push pieces to production from your range plans to see them here.</p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="prod-board">
            {PROD_STATUSES.map(status => (
              <div key={status.value} className="prod-column">
                <div className="prod-column-header" style={{ background: status.bg, color: status.color }}>
                  <span>{status.label}</span>
                  <span className="prod-column-count">{grouped[status.value].length}</span>
                </div>
                <Droppable droppableId={status.value}>
                  {(provided, snapshot) => (
                    <div
                      className="prod-column-body"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={snapshot.isDraggingOver ? { background: 'rgba(99, 102, 241, 0.05)' } : undefined}
                    >
                      {grouped[status.value].map((item, index) => (
                        <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`prod-card card ${dragSnapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className="prod-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <span {...dragProvided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--gray-400)', display: 'flex' }}>
                                    <GripVertical size={14} />
                                  </span>
                                  <h4>{item.name}</h4>
                                </div>
                                <select
                                  className="prod-status-select"
                                  value={item.production_status || 'pending'}
                                  onChange={e => updateProdStatus(item.id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                >
                                  {PROD_STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="prod-card-range">{item.ranges?.name}</div>
                              <div className="prod-card-stats">
                                <span className="prod-card-qty">{(item.production_qty || 0).toLocaleString()} units</span>
                                {item.production_client && (
                                  <span className="prod-card-client">{item.production_client}</span>
                                )}
                              </div>
                              {item.production_lead && (
                                <div className="prod-card-lead">
                                  <User size={12} />
                                  <span>{peopleMap[item.production_lead] || 'Unknown'}</span>
                                </div>
                              )}
                              {item.production_collaborators?.length > 0 && (
                                <div className="prod-card-collabs">
                                  {item.production_collaborators.map(id => (
                                    <span key={id} className="prod-card-collab-chip">{peopleMap[id] || '?'}</span>
                                  ))}
                                </div>
                              )}
                              {item.production_notes && (
                                <div className="prod-card-notes">{item.production_notes}</div>
                              )}
                              <div className="prod-card-footer">
                                <Clock size={11} />
                                <span>{timeAgo(item.pushed_to_production_at)}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {grouped[status.value].length === 0 && (
                        <div className="prod-column-empty">No items</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  )
}
