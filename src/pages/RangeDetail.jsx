import { useState, useEffect, useMemo } from 'react'
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
  LayoutGrid, List, Plus, Search, Edit3, GripVertical,
  Image as ImageIcon, ChevronLeft, Lock, Unlock, Play,
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

const RANGE_STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning', icon: Edit3 },
  { value: 'active', label: 'Active', icon: Play },
  { value: 'locked', label: 'Locked', icon: Lock },
]

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
  const [panelStyleId, setPanelStyleId] = useState(null)
  const [editingRange, setEditingRange] = useState(false)
  const [quickAddGroup, setQuickAddGroup] = useState(null)
  const [quickAddName, setQuickAddName] = useState('')

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
      const [rangeData, stylesData] = await Promise.all([
        getRange(id),
        getRangeStyles(id),
      ])
      setRange(rangeData)
      setStyles(stylesData || [])
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

    if (groupBy === 'category') {
      const ordered = STYLE_CATEGORIES.filter(c => grouped[c]).map(c => ({ key: c, label: c, styles: grouped[c] }))
      if (grouped['Unassigned']) ordered.push({ key: 'Unassigned', label: 'Unassigned', styles: grouped['Unassigned'] })
      return ordered
    }
    if (groupBy === 'status') {
      return RANGE_STYLE_STATUSES.filter(s => grouped[s.value]).map(s => ({ key: s.value, label: s.label, styles: grouped[s.value] }))
    }
    return Object.keys(grouped).sort().map(key => ({ key, label: key, styles: grouped[key] }))
  }, [filtered, groupBy])

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

  // Drag and drop handler
  function handleDragEnd(result) {
    if (!result.destination) return
    if (result.source.droppableId !== result.destination.droppableId) return
    if (result.source.index === result.destination.index) return

    const groupKey = result.source.droppableId
    const group = groups.find(g => g.key === groupKey)
    if (!group) return

    const items = [...group.styles]
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
      const newStyle = {
        range_id: id,
        name: quickAddName.trim(),
        category: groupBy === 'category' ? groupKey : 'Tops',
        delivery_drop: groupBy === 'delivery_drop' && groupKey !== 'Unassigned' ? groupKey : null,
        status: groupBy === 'status' ? groupKey : 'concept',
        sort_order: (groups.find(g => g.key === groupKey)?.styles.length || 0),
        created_by: currentPerson?.id,
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
          )}
        </div>
        <div className="rp-toolbar-right">
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

      {/* Board View */}
      {view === 'board' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {groups.length === 0 ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="empty-state">
                <ImageIcon size={48} />
                <h3>No styles yet</h3>
                <p>Add styles to start building your range.</p>
              </div>
            </div>
          ) : (
            <div className="rp-board">
              {groups.map(group => (
                <div key={group.key} className="rp-group">
                  <div className="rp-group-header">
                    <h3>{group.label}</h3>
                    <span className="rp-group-count">{group.styles.length}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setQuickAddGroup(group.key); setQuickAddName('') }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <Droppable droppableId={group.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rp-grid ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      >
                        {group.styles.map((style, index) => (
                          <Draggable key={style.id} draggableId={style.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`rp-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                onClick={() => setPanelStyleId(style.id)}
                              >
                                <div className="rp-card-thumb" {...provided.dragHandleProps}>
                                  {style.thumbnail_url ? (
                                    <img src={style.thumbnail_url} alt={style.name} />
                                  ) : (
                                    <div className="rp-card-placeholder">
                                      <ImageIcon size={24} />
                                    </div>
                                  )}
                                </div>
                                <div className="rp-card-body">
                                  <div className="rp-card-name">{style.name}</div>
                                  <div className="rp-card-tags">
                                    {groupBy !== 'category' && (
                                      <span className="tag">{style.category}</span>
                                    )}
                                    <StatusDropdown
                                      status={style.status}
                                      onChange={(s) => { handleStatusChange(style.id, s) }}
                                    />
                                  </div>
                                  {style.colorways && style.colorways.length > 0 && (
                                    <div className="rp-card-colors">
                                      {style.colorways.slice(0, 6).map((c, i) => (
                                        <span
                                          key={i}
                                          className="rp-color-dot"
                                          style={{ background: getColorDot(c) }}
                                          title={c}
                                        />
                                      ))}
                                      {style.colorways.length > 6 && (
                                        <span className="rp-color-more">+{style.colorways.length - 6}</span>
                                      )}
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

                  {quickAddGroup === group.key && (
                    <div className="rp-quick-add">
                      <input
                        type="text"
                        placeholder="Style name..."
                        value={quickAddName}
                        onChange={e => setQuickAddName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleQuickAdd(group.key)
                          if (e.key === 'Escape') { setQuickAddGroup(null); setQuickAddName('') }
                        }}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleQuickAdd(group.key)}>Add</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setQuickAddGroup(null); setQuickAddName('') }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DragDropContext>
      )}

      {/* Table View */}
      {view === 'table' && (
        <TableView
          styles={filtered}
          onStatusChange={handleStatusChange}
          onInlineEdit={handleInlineEdit}
          onClickStyle={(id) => setPanelStyleId(id)}
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
    </div>
  )
}

/* ----- Sub-components ----- */

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

function TableView({ styles, onStatusChange, onInlineEdit, onClickStyle }) {
  const [editCell, setEditCell] = useState(null) // { id, field }
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
                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }}
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
                  <select
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(style.id, 'category')}
                    autoFocus
                    style={{ fontSize: '0.8125rem' }}
                  >
                    {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'category', style.category)}>
                    {style.category}
                  </span>
                )}
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'sub_category' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(style.id, 'sub_category')}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(style.id, 'sub_category')}
                    autoFocus
                    style={{ fontSize: '0.8125rem', width: '100%' }}
                  />
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'sub_category', style.sub_category)}>
                    {style.sub_category || '—'}
                  </span>
                )}
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'colorways' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(style.id, 'colorways')}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(style.id, 'colorways')}
                    autoFocus
                    style={{ fontSize: '0.8125rem', width: '100%' }}
                  />
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'colorways', style.colorways)}>
                    {(style.colorways || []).length > 0 ? (
                      <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {style.colorways.map((c, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                            <span className="rp-color-dot" style={{ background: getColorDot(c), width: 10, height: 10 }} />
                            {c}
                          </span>
                        ))}
                      </span>
                    ) : '—'}
                  </span>
                )}
              </td>
              <td>
                {editCell?.id === style.id && editCell.field === 'delivery_drop' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(style.id, 'delivery_drop')}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(style.id, 'delivery_drop')}
                    autoFocus
                    style={{ fontSize: '0.8125rem', width: '100%' }}
                  />
                ) : (
                  <span className="rp-table-editable" onClick={() => startEdit(style.id, 'delivery_drop', style.delivery_drop)}>
                    {style.delivery_drop || '—'}
                  </span>
                )}
              </td>
              <td>
                <StatusDropdown
                  status={style.status}
                  onChange={(s) => onStatusChange(style.id, s)}
                />
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
