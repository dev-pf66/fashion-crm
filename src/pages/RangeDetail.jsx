import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import {
  getRange, updateRange,
  getRangeStyles, createRangeStyle, updateRangeStyle, updateRangeStyleOrder,
} from '../lib/supabase'
import { STYLE_CATEGORIES } from '../lib/constants'
import Modal from '../components/Modal'
import Breadcrumbs from '../components/Breadcrumbs'
import RangeStylePanel from '../components/RangeStylePanel'
import {
  LayoutGrid, List, Plus, Search, Edit3, Filter,
  Image as ImageIcon, Lock, Play, GripVertical,
  Maximize2, Minimize2, Square, X, ChevronLeft, ChevronRight,
} from 'lucide-react'

const RANGE_STYLE_STATUSES = [
  { value: 'concept', label: 'Concept', bg: '#f3f4f6', color: '#4b5563' },
  { value: 'in_progress', label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'review', label: 'Review', bg: '#fef3c7', color: '#b45309' },
  { value: 'approved', label: 'Approved', bg: '#dcfce7', color: '#15803d' },
]

const GROUPINGS = [
  { value: 'category', label: 'Category' },
  { value: 'delivery_drop', label: 'Delivery Drop' },
  { value: 'status', label: 'Status' },
]

const CARD_SIZES = [
  { value: 'sm', label: 'S', icon: Minimize2 },
  { value: 'md', label: 'M', icon: Square },
  { value: 'lg', label: 'L', icon: Maximize2 },
]

const COLORWAY_MAP = {
  white: '#ffffff', black: '#1a1a1a', navy: '#1e3a5f', sage: '#b2ac88',
  red: '#e74c3c', blue: '#3498db', pink: '#f4c2c2', cream: '#fffdd0',
  olive: '#808000', khaki: '#c3b091', grey: '#9ca3af', gray: '#9ca3af',
  beige: '#f5f5dc', ivory: '#fffff0', tan: '#d2b48c', brown: '#8b4513',
  burgundy: '#800020', coral: '#ff7f50', teal: '#008080', mint: '#98ff98',
  lavender: '#e6e6fa', charcoal: '#36454f', stone: '#928e85', rust: '#b7410e',
  camel: '#c19a6b', sand: '#c2b280', blush: '#de5d83', green: '#2ecc71',
  yellow: '#f1c40f', orange: '#e67e22', purple: '#9b59b6', indigo: '#3f51b5',
  nude: '#e3bc9a', bone: '#e3dac9', oatmeal: '#d3c4a2', terracotta: '#cc5a3b',
  emerald: '#50c878', cobalt: '#0047ab', silver: '#c0c0c0', gold: '#ffd700',
  rose: '#ff007f', mauve: '#e0b0ff', pewter: '#8e8e8e', denim: '#1560bd',
}

function getColorDot(colorName) {
  const hex = COLORWAY_MAP[colorName.toLowerCase().trim()]
  return hex || '#d1d5db'
}

export default function RangeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentPerson } = useApp()
  const toast = useToast()

  const [range, setRange] = useState(null)
  const [styles, setStyles] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('board')
  const [groupBy, setGroupBy] = useState('category')
  const [cardSize, setCardSize] = useState('md')
  const [panelStyleId, setPanelStyleId] = useState(null)
  const [editingRange, setEditingRange] = useState(false)
  const [quickAddGroup, setQuickAddGroup] = useState(null)
  const [quickAddName, setQuickAddName] = useState('')
  const [lightbox, setLightbox] = useState(null) // { url, styleId }
  const [showFilters, setShowFilters] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Auto small cards on mobile
  useEffect(() => {
    if (isMobile) setCardSize('sm')
  }, [isMobile])

  const [groupOrder, setGroupOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`range-group-order-${id}`)) || {}
    } catch { return {} }
  })

  // Filters from URL params
  const filterCategory = searchParams.get('category') || ''
  const filterStatus = searchParams.get('status') || ''
  const filterDrop = searchParams.get('drop') || ''
  const filterSearch = searchParams.get('q') || ''

  function setFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    setSearchParams(params, { replace: true })
  }

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const rangeData = await getRange(id)
      setRange(rangeData)
      try {
        const stylesData = await getRangeStyles(id)
        setStyles(stylesData || [])
      } catch (err) {
        console.error('Failed to load styles:', err)
        setStyles([])
      }
    } catch (err) {
      console.error('Failed to load range:', err)
      toast.error('Failed to load range')
    } finally {
      setLoading(false)
    }
  }

  // Filtered styles
  const filtered = useMemo(() => {
    return styles.filter(s => {
      if (filterCategory && s.category !== filterCategory) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (filterDrop && s.delivery_drop !== filterDrop) return false
      if (filterSearch && !s.name.toLowerCase().includes(filterSearch.toLowerCase())) return false
      return true
    })
  }, [styles, filterCategory, filterStatus, filterDrop, filterSearch])

  // Unique delivery drops
  const allDrops = useMemo(() => {
    return [...new Set(styles.map(s => s.delivery_drop).filter(Boolean))].sort()
  }, [styles])

  // Grouped styles
  const groups = useMemo(() => {
    const grouped = {}
    filtered.forEach(s => {
      const key = groupBy === 'status' ? s.status :
                  groupBy === 'delivery_drop' ? (s.delivery_drop || 'Unassigned') :
                  s.category || 'Unassigned'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(s)
    })
    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.sort_order - b.sort_order))

    let result
    if (groupBy === 'category') {
      result = STYLE_CATEGORIES.filter(c => grouped[c]).map(c => ({ key: c, label: c, styles: grouped[c] }))
      if (grouped['Unassigned']) result.push({ key: 'Unassigned', label: 'Unassigned', styles: grouped['Unassigned'] })
    } else if (groupBy === 'status') {
      result = RANGE_STYLE_STATUSES.filter(s => grouped[s.value]).map(s => ({ key: s.value, label: s.label, styles: grouped[s.value] }))
    } else {
      result = Object.keys(grouped).sort().map(key => ({ key, label: key, styles: grouped[key] }))
    }

    // Apply custom group order if set
    const customOrder = groupOrder[groupBy]
    if (customOrder && customOrder.length > 0) {
      const orderMap = {}
      customOrder.forEach((key, idx) => { orderMap[key] = idx })
      result.sort((a, b) => {
        const aIdx = orderMap[a.key] ?? 999
        const bIdx = orderMap[b.key] ?? 999
        return aIdx - bIdx
      })
    }

    return result
  }, [filtered, groupBy, groupOrder])

  // Stats
  const stats = useMemo(() => {
    const byCategory = {}
    const byStatus = {}
    styles.forEach(s => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
    })
    return { total: styles.length, byCategory, byStatus }
  }, [styles])

  // All styles with thumbnails for lightbox navigation
  const thumbStyles = useMemo(() => filtered.filter(s => s.thumbnail_url), [filtered])

  // Lightbox navigation
  const lightboxNav = useCallback((dir) => {
    if (!lightbox) return
    const idx = thumbStyles.findIndex(s => s.id === lightbox.styleId)
    if (idx < 0) return
    const next = idx + dir
    if (next >= 0 && next < thumbStyles.length) {
      setLightbox({ url: thumbStyles[next].thumbnail_url, styleId: thumbStyles[next].id, name: thumbStyles[next].name })
    }
  }, [lightbox, thumbStyles])

  // Lightbox keyboard
  useEffect(() => {
    if (!lightbox) return
    function handleKey(e) {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft') lightboxNav(-1)
      if (e.key === 'ArrowRight') lightboxNav(1)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [lightbox, lightboxNav])

  // Drag and drop — supports group reorder, card reorder, and cross-group moves
  function handleDragEnd(result) {
    if (!result.destination) return

    // Group reordering
    if (result.type === 'GROUP') {
      if (result.source.index === result.destination.index) return
      const newOrder = groups.map(g => g.key)
      const [moved] = newOrder.splice(result.source.index, 1)
      newOrder.splice(result.destination.index, 0, moved)
      const updated = { ...groupOrder, [groupBy]: newOrder }
      setGroupOrder(updated)
      try { localStorage.setItem(`range-group-order-${id}`, JSON.stringify(updated)) } catch {}
      return
    }

    // Card dragging
    const srcGroupKey = result.source.droppableId
    const dstGroupKey = result.destination.droppableId
    const srcGroup = groups.find(g => g.key === srcGroupKey)
    if (!srcGroup) return

    const draggedStyle = srcGroup.styles[result.source.index]
    if (!draggedStyle) return

    // Moving between groups — update the grouping field
    if (srcGroupKey !== dstGroupKey) {
      const fieldUpdates = {}
      if (groupBy === 'category') fieldUpdates.category = dstGroupKey === 'Unassigned' ? null : dstGroupKey
      else if (groupBy === 'delivery_drop') fieldUpdates.delivery_drop = dstGroupKey === 'Unassigned' ? null : dstGroupKey
      else if (groupBy === 'status') fieldUpdates.status = dstGroupKey

      // Optimistic update
      setStyles(prev => prev.map(s => s.id === draggedStyle.id ? { ...s, ...fieldUpdates } : s))

      updateRangeStyle(draggedStyle.id, fieldUpdates).catch(() => {
        toast.error('Failed to move style')
        loadData()
      })
      return
    }

    // Reorder within same group
    if (result.source.index === result.destination.index) return

    const items = [...srcGroup.styles]
    const [moved] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, moved)

    const updates = items.map((item, idx) => ({ id: item.id, sort_order: idx }))

    setStyles(prev => prev.map(s => {
      const u = updates.find(x => x.id === s.id)
      return u ? { ...s, sort_order: u.sort_order } : s
    }))

    updateRangeStyleOrder(updates).catch(() => {
      toast.error('Failed to reorder')
      loadData()
    })
  }

  async function handleQuickAdd(groupKey) {
    if (!quickAddName.trim()) return
    try {
      const isTopLevel = groupKey === '_top'
      const newStyle = {
        range_id: id,
        name: quickAddName.trim(),
        category: isTopLevel ? 'Tops' : (groupBy === 'category' ? groupKey : 'Tops'),
        delivery_drop: (!isTopLevel && groupBy === 'delivery_drop' && groupKey !== 'Unassigned') ? groupKey : null,
        status: (!isTopLevel && groupBy === 'status') ? groupKey : 'concept',
        sort_order: isTopLevel ? styles.length : (groups.find(g => g.key === groupKey)?.styles.length || 0),
        created_by: currentPerson?.id || null,
      }
      await createRangeStyle(newStyle)
      toast.success('Style added')
      setQuickAddGroup(null)
      setQuickAddName('')
      loadData()
    } catch (err) {
      toast.error('Failed to add style')
    }
  }

  async function handleStatusChange(styleId, status) {
    try {
      await updateRangeStyle(styleId, { status })
      setStyles(prev => prev.map(s => s.id === styleId ? { ...s, status } : s))
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  async function handleInlineEdit(styleId, field, value) {
    try {
      const updates = {}
      if (field === 'colorways') {
        updates.colorways = value.split(',').map(c => c.trim()).filter(Boolean)
      } else {
        updates[field] = value || null
      }
      await updateRangeStyle(styleId, updates)
      setStyles(prev => prev.map(s => s.id === styleId ? {
        ...s,
        ...updates,
        ...(field === 'colorways' ? {} : { [field]: value }),
      } : s))
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  function openLightbox(style, e) {
    e.stopPropagation()
    if (style.thumbnail_url) {
      setLightbox({ url: style.thumbnail_url, styleId: style.id, name: style.name })
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>
  if (!range) return <div className="card"><div className="empty-state"><h3>Range not found</h3></div></div>

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Range Planning', to: '/range-planning' },
        { label: range.name },
      ]} />

      {/* Summary Bar */}
      <div className="rp-summary">
        <div className="rp-summary-left">
          <h1>{range.name}</h1>
          <div className="rp-summary-meta">
            {range.season && <span className="tag">{range.season}</span>}
            <RangeStatusDropdown
              status={range.status}
              onChange={async (status) => {
                await updateRange(id, { status })
                setRange(prev => ({ ...prev, status }))
                toast.success(`Range marked as ${status}`)
              }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingRange(true)}>
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
        <div className="rp-summary-stats">
          <div className="rp-summary-stat">
            <span className="rp-stat-big">{stats.total}</span>
            <span className="text-sm text-muted">Styles</span>
          </div>
          {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, count]) => (
            <div key={cat} className="rp-summary-stat">
              <span className="rp-stat-big">{count}</span>
              <span className="text-sm text-muted">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="rp-progress">
          <div className="rp-progress-bar">
            {RANGE_STYLE_STATUSES.map(s => {
              const count = stats.byStatus[s.value] || 0
              if (!count) return null
              const pct = (count / stats.total) * 100
              return (
                <div
                  key={s.value}
                  className="rp-progress-segment"
                  style={{ width: `${pct}%`, background: s.bg, borderLeft: `2px solid ${s.color}` }}
                  title={`${s.label}: ${count} (${Math.round(pct)}%)`}
                />
              )
            })}
          </div>
          <div className="rp-progress-legend">
            {RANGE_STYLE_STATUSES.map(s => {
              const count = stats.byStatus[s.value] || 0
              return (
                <span key={s.value} className="rp-progress-label">
                  <span className="rp-progress-dot" style={{ background: s.color }} />
                  {s.label} <strong>{count}</strong>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="rp-toolbar">
        <div className="rp-toolbar-left">
          <div className="rp-view-toggle">
            <button className={`rp-view-btn ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
              <LayoutGrid size={16} /> Board
            </button>
            <button className={`rp-view-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>
              <List size={16} /> Table
            </button>
          </div>
          {view === 'board' && (
            <>
              <div className="rp-group-toggle">
                <span className="text-sm text-muted">Group by:</span>
                {GROUPINGS.map(g => (
                  <button
                    key={g.value}
                    className={`rp-group-btn ${groupBy === g.value ? 'active' : ''}`}
                    onClick={() => setGroupBy(g.value)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="rp-size-toggle">
                {CARD_SIZES.map(s => (
                  <button
                    key={s.value}
                    className={`rp-size-btn ${cardSize === s.value ? 'active' : ''}`}
                    onClick={() => setCardSize(s.value)}
                    title={`${s.label} cards`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="rp-toolbar-right">
          <button className="btn btn-primary btn-sm" onClick={() => { setQuickAddGroup('_top'); setQuickAddName('') }}>
            <Plus size={14} /> <span className="hide-mobile-text">Add Style</span>
          </button>
          <button
            className={`btn btn-sm mobile-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} /> Filters
            {(filterCategory || filterStatus || filterDrop || filterSearch) && (
              <span className="filter-active-dot" />
            )}
          </button>
          <div className={`rp-filters-collapsible ${showFilters ? 'open' : ''}`}>
            <div className="rp-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search styles..."
                value={filterSearch}
                onChange={e => setFilter('q', e.target.value)}
              />
            </div>
            <select value={filterCategory} onChange={e => setFilter('category', e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
              <option value="">All Categories</option>
              {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilter('status', e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
              <option value="">All Statuses</option>
              {RANGE_STYLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {allDrops.length > 0 && (
              <select value={filterDrop} onChange={e => setFilter('drop', e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem' }}>
                <option value="">All Drops</option>
                {allDrops.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Top-level Quick Add */}
      {quickAddGroup === '_top' && (
        <div className="rp-quick-add card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div className="form-row" style={{ marginBottom: '0.5rem' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <input
                type="text"
                placeholder="Style name..."
                value={quickAddName}
                onChange={e => setQuickAddName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && quickAddName.trim()) handleQuickAdd('_top')
                  if (e.key === 'Escape') { setQuickAddGroup(null); setQuickAddName('') }
                }}
                autoFocus
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleQuickAdd('_top')}>Add Style</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setQuickAddGroup(null); setQuickAddName('') }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Board View */}
      {view === 'board' && (
        <>
          {groups.length === 0 ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="empty-state">
                <ImageIcon size={48} />
                <h3>No styles yet</h3>
                <p>Add styles to start building your range.</p>
                <button className="btn btn-primary" onClick={() => { setQuickAddGroup('_top'); setQuickAddName('') }}>
                  <Plus size={16} /> Add First Style
                </button>
              </div>
            </div>
          ) : isMobile ? (
            /* Mobile: no drag-and-drop */
            <div className="rp-board">
              {groups.map(group => (
                <div key={group.key} className="rp-group">
                  <div className="rp-group-header">
                    <h3>{group.label}</h3>
                    <span className="rp-group-count">{group.styles.length}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setQuickAddGroup(group.key); setQuickAddName('') }}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className={`rp-grid rp-grid-${cardSize}`}>
                    {group.styles.map(style => (
                      <StyleCard key={style.id} style={style} cardSize={cardSize} groupBy={groupBy}
                        onStatusChange={handleStatusChange} onOpenLightbox={openLightbox}
                        onClick={() => setPanelStyleId(style.id)} />
                    ))}
                  </div>
                  <QuickAddInline groupKey={group.key} quickAddGroup={quickAddGroup} quickAddName={quickAddName}
                    setQuickAddName={setQuickAddName} setQuickAddGroup={setQuickAddGroup} handleQuickAdd={handleQuickAdd} />
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: full drag-and-drop */
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="board" type="GROUP" direction="vertical">
                {(boardProvided) => (
                  <div ref={boardProvided.innerRef} {...boardProvided.droppableProps} className="rp-board">
                    {groups.map((group, groupIndex) => (
                      <Draggable key={group.key} draggableId={`group-${group.key}`} index={groupIndex}>
                        {(groupProvided, groupSnapshot) => (
                          <div ref={groupProvided.innerRef} {...groupProvided.draggableProps}
                            className={`rp-group ${groupSnapshot.isDragging ? 'rp-group-dragging' : ''}`}>
                            <div className="rp-group-header">
                              <span className="rp-group-drag-handle" {...groupProvided.dragHandleProps}>
                                <GripVertical size={14} />
                              </span>
                              <h3>{group.label}</h3>
                              <span className="rp-group-count">{group.styles.length}</span>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setQuickAddGroup(group.key); setQuickAddName('') }}>
                                <Plus size={14} />
                              </button>
                            </div>
                            <Droppable droppableId={group.key} type="CARD">
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}
                                  className={`rp-grid rp-grid-${cardSize} ${snapshot.isDraggingOver ? 'drag-over' : ''}`}>
                                  {group.styles.map((style, index) => (
                                    <Draggable key={style.id} draggableId={style.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps}
                                          className={`rp-card rp-card-${cardSize} ${snapshot.isDragging ? 'dragging' : ''}`}
                                          onClick={() => setPanelStyleId(style.id)}>
                                          <div className="rp-card-thumb" {...provided.dragHandleProps}>
                                            {style.thumbnail_url ? (
                                              <>
                                                <img src={style.thumbnail_url} alt={style.name} />
                                                <button className="rp-thumb-zoom" onClick={(e) => openLightbox(style, e)} title="View full image">
                                                  <Maximize2 size={12} />
                                                </button>
                                              </>
                                            ) : (
                                              <div className="rp-card-placeholder"><ImageIcon size={cardSize === 'sm' ? 16 : 24} /></div>
                                            )}
                                          </div>
                                          <div className="rp-card-body">
                                            <div className="rp-card-name">{style.name}</div>
                                            <div className="rp-card-tags">
                                              {groupBy !== 'category' && <span className="tag">{style.category}</span>}
                                              <StatusDropdown status={style.status} onChange={(s) => handleStatusChange(style.id, s)} />
                                            </div>
                                            {cardSize !== 'sm' && style.colorways?.length > 0 && (
                                              <div className="rp-card-colors">
                                                {style.colorways.slice(0, 6).map((c, i) => (
                                                  <span key={i} className="rp-color-dot" style={{ background: getColorDot(c) }} title={c} />
                                                ))}
                                                {style.colorways.length > 6 && <span className="rp-color-more">+{style.colorways.length - 6}</span>}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                            <QuickAddInline groupKey={group.key} quickAddGroup={quickAddGroup} quickAddName={quickAddName}
                              setQuickAddName={setQuickAddName} setQuickAddGroup={setQuickAddGroup} handleQuickAdd={handleQuickAdd} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {boardProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </>
      )}

      {/* Table View */}
      {view === 'table' && (
        <TableView
          styles={filtered}
          isMobile={isMobile}
          onStatusChange={handleStatusChange}
          onInlineEdit={handleInlineEdit}
          onClickStyle={(id) => setPanelStyleId(id)}
          onOpenLightbox={(style) => setLightbox({ url: style.thumbnail_url, styleId: style.id, name: style.name })}
        />
      )}

      {/* Style Detail Panel */}
      {panelStyleId && (
        <RangeStylePanel
          styleId={panelStyleId}
          rangeId={id}
          onClose={() => setPanelStyleId(null)}
          onUpdate={() => loadData()}
          onDelete={() => { setPanelStyleId(null); loadData() }}
        />
      )}

      {/* Edit Range Modal */}
      {editingRange && (
        <EditRangeModal
          range={range}
          onClose={() => setEditingRange(false)}
          onSave={(updated) => { setRange(updated); setEditingRange(false) }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          url={lightbox.url}
          name={lightbox.name}
          onClose={() => setLightbox(null)}
          onPrev={() => lightboxNav(-1)}
          onNext={() => lightboxNav(1)}
          hasPrev={thumbStyles.findIndex(s => s.id === lightbox.styleId) > 0}
          hasNext={thumbStyles.findIndex(s => s.id === lightbox.styleId) < thumbStyles.length - 1}
        />
      )}
    </div>
  )
}

/* ----- Sub-components ----- */

function Lightbox({ url, name, onClose, onPrev, onNext, hasPrev, hasNext }) {
  return (
    <div className="rp-lightbox" onClick={onClose}>
      <button className="rp-lightbox-close" onClick={onClose}><X size={24} /></button>
      {hasPrev && (
        <button className="rp-lightbox-nav rp-lightbox-prev" onClick={e => { e.stopPropagation(); onPrev() }}>
          <ChevronLeft size={32} />
        </button>
      )}
      <div className="rp-lightbox-content" onClick={e => e.stopPropagation()}>
        <img src={url} alt={name || ''} />
        {name && <div className="rp-lightbox-caption">{name}</div>}
      </div>
      {hasNext && (
        <button className="rp-lightbox-nav rp-lightbox-next" onClick={e => { e.stopPropagation(); onNext() }}>
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  )
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false)
  const conf = RANGE_STYLE_STATUSES.find(s => s.value === status) || RANGE_STYLE_STATUSES[0]

  return (
    <div className="rp-status-drop" onClick={e => e.stopPropagation()}>
      <button
        className="badge"
        style={{ background: conf.bg, color: conf.color, cursor: 'pointer', border: 'none', fontSize: '0.6875rem' }}
        onClick={() => setOpen(!open)}
      >
        {conf.label}
      </button>
      {open && (
        <>
          <div className="rp-status-drop-overlay" onClick={() => setOpen(false)} />
          <div className="rp-status-drop-menu">
            {RANGE_STYLE_STATUSES.map(s => (
              <button
                key={s.value}
                className={`rp-status-drop-item ${s.value === status ? 'active' : ''}`}
                style={{ color: s.color }}
                onClick={() => { onChange(s.value); setOpen(false) }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RangeStatusDropdown({ status, onChange }) {
  const labels = { planning: 'Planning', active: 'Active', locked: 'Locked' }
  const colors = { planning: '#4b5563', active: '#1d4ed8', locked: '#15803d' }
  const bgs = { planning: '#f3f4f6', active: '#dbeafe', locked: '#dcfce7' }

  return (
    <select
      value={status}
      onChange={e => onChange(e.target.value)}
      style={{
        width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem',
        background: bgs[status], color: colors[status], borderColor: bgs[status],
        fontWeight: 600, borderRadius: '999px',
      }}
    >
      {Object.entries(labels).map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  )
}

function StyleCard({ style, cardSize, groupBy, onStatusChange, onOpenLightbox, onClick }) {
  return (
    <div className={`rp-card rp-card-${cardSize}`} onClick={onClick}>
      <div className="rp-card-thumb">
        {style.thumbnail_url ? (
          <>
            <img src={style.thumbnail_url} alt={style.name} />
            <button className="rp-thumb-zoom" onClick={(e) => onOpenLightbox(style, e)} title="View full image">
              <Maximize2 size={12} />
            </button>
          </>
        ) : (
          <div className="rp-card-placeholder"><ImageIcon size={cardSize === 'sm' ? 16 : 24} /></div>
        )}
      </div>
      <div className="rp-card-body">
        <div className="rp-card-name">{style.name}</div>
        <div className="rp-card-tags">
          {groupBy !== 'category' && <span className="tag">{style.category}</span>}
          <StatusDropdown status={style.status} onChange={(s) => onStatusChange(style.id, s)} />
        </div>
        {cardSize !== 'sm' && style.colorways?.length > 0 && (
          <div className="rp-card-colors">
            {style.colorways.slice(0, 6).map((c, i) => (
              <span key={i} className="rp-color-dot" style={{ background: getColorDot(c) }} title={c} />
            ))}
            {style.colorways.length > 6 && <span className="rp-color-more">+{style.colorways.length - 6}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickAddInline({ groupKey, quickAddGroup, quickAddName, setQuickAddName, setQuickAddGroup, handleQuickAdd }) {
  if (quickAddGroup !== groupKey) return null
  return (
    <div className="rp-quick-add">
      <input type="text" placeholder="Style name..." value={quickAddName}
        onChange={e => setQuickAddName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleQuickAdd(groupKey)
          if (e.key === 'Escape') { setQuickAddGroup(null); setQuickAddName('') }
        }}
        autoFocus
      />
      <button className="btn btn-primary btn-sm" onClick={() => handleQuickAdd(groupKey)}>Add</button>
      <button className="btn btn-ghost btn-sm" onClick={() => { setQuickAddGroup(null); setQuickAddName('') }}>Cancel</button>
    </div>
  )
}

function TableView({ styles, isMobile, onStatusChange, onInlineEdit, onClickStyle, onOpenLightbox }) {
  const [editCell, setEditCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...styles].sort((a, b) => {
      const av = a[sortField] || ''
      const bv = b[sortField] || ''
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [styles, sortField, sortDir])

  function startEdit(id, field, currentValue) {
    setEditCell({ id, field })
    setEditValue(field === 'colorways' ? (currentValue || []).join(', ') : (currentValue || ''))
  }

  function saveEdit(id, field) {
    onInlineEdit(id, field, editValue)
    setEditCell(null)
  }

  const SortIcon = ({ field }) => (
    <span style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '0.25rem' }}>
      {sortField === field && sortDir === 'desc' ? '▼' : '▲'}
    </span>
  )

  // Mobile: card layout instead of table
  if (isMobile) {
    return (
      <div className="rp-mobile-cards" style={{ marginTop: '1rem' }}>
        {sorted.map(style => (
          <div key={style.id} className="rp-mobile-card" onClick={() => onClickStyle(style.id)}>
            <div className="rp-mobile-card-left">
              {style.thumbnail_url ? (
                <img src={style.thumbnail_url} alt="" className="rp-mobile-card-thumb" />
              ) : (
                <div className="rp-mobile-card-thumb rp-mobile-card-thumb-empty">
                  <ImageIcon size={16} />
                </div>
              )}
            </div>
            <div className="rp-mobile-card-body">
              <div className="rp-mobile-card-name">{style.name}</div>
              <div className="rp-mobile-card-meta">
                <span className="tag">{style.category}</span>
                <StatusDropdown status={style.status} onChange={(s) => onStatusChange(style.id, s)} />
              </div>
              {style.delivery_drop && (
                <div className="text-sm text-muted">{style.delivery_drop}</div>
              )}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p className="text-muted">No styles match your filters.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="data-table-wrapper" style={{ marginTop: '1rem' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}></th>
            <th className="sortable" onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
            <th className="sortable" onClick={() => handleSort('category')}>Category <SortIcon field="category" /></th>
            <th>Sub-Category</th>
            <th>Colorways</th>
            <th className="sortable" onClick={() => handleSort('delivery_drop')}>Drop <SortIcon field="delivery_drop" /></th>
            <th className="sortable" onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(style => (
            <tr key={style.id}>
              <td>
                {style.thumbnail_url ? (
                  <img
                    src={style.thumbnail_url}
                    alt=""
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                    onClick={() => onOpenLightbox(style)}
                  />
                ) : (
                  <div style={{ width: 36, height: 36, background: 'var(--gray-100)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={14} style={{ color: 'var(--gray-400)' }} />
                  </div>
                )}
              </td>
              <td>
                <button className="rp-table-link" onClick={() => onClickStyle(style.id)}>
                  {style.name}
                </button>
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'category' ? (
                  <select value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(style.id, 'category')} autoFocus style={{ fontSize: '0.8125rem' }}>
                    {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'category', style.category)}>{style.category}</span>
                )}
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'sub_category' ? (
                  <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(style.id, 'sub_category')} onKeyDown={e => e.key === 'Enter' && saveEdit(style.id, 'sub_category')} autoFocus style={{ fontSize: '0.8125rem', width: '100%' }} />
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'sub_category', style.sub_category)}>{style.sub_category || '—'}</span>
                )}
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'colorways' ? (
                  <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(style.id, 'colorways')} onKeyDown={e => e.key === 'Enter' && saveEdit(style.id, 'colorways')} autoFocus style={{ fontSize: '0.8125rem', width: '100%' }} />
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'colorways', style.colorways)}>
                    {(style.colorways || []).length > 0 ? (
                      <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {style.colorways.map((c, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                            <span className="rp-color-dot" style={{ background: getColorDot(c), width: 10, height: 10 }} />{c}
                          </span>
                        ))}
                      </span>
                    ) : '—'}
                  </span>
                )}
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'delivery_drop' ? (
                  <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(style.id, 'delivery_drop')} onKeyDown={e => e.key === 'Enter' && saveEdit(style.id, 'delivery_drop')} autoFocus style={{ fontSize: '0.8125rem', width: '100%' }} />
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'delivery_drop', style.delivery_drop)}>{style.delivery_drop || '—'}</span>
                )}
              </td>
              <td>
                <StatusDropdown status={style.status} onChange={(s) => onStatusChange(style.id, s)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <p className="text-muted">No styles match your filters.</p>
        </div>
      )}
    </div>
  )
}

function EditRangeModal({ range, onClose, onSave }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(range.name)
  const [season, setSeason] = useState(range.season || '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const updated = await updateRange(range.id, {
        name: name.trim(),
        season: season.trim() || null,
      })
      toast.success('Range updated')
      onSave(updated)
    } catch (err) {
      toast.error('Failed to update range')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit Range" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Range Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label>Season</label>
          <input type="text" value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. SS26, AW26" />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
