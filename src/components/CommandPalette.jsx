import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeason } from '../contexts/SeasonContext'
import { useApp } from '../App'
import { globalSearch, getRanges, getSuppliers, createTask, createRangeStyle } from '../lib/supabase'
import { STYLE_CATEGORIES, maskSupplierName } from '../lib/constants'
import { useToast } from '../contexts/ToastContext'
import { Search, Scissors, Factory, ClipboardList, FlaskConical, Users, CheckSquare, X, Plus, Layers } from 'lucide-react'

const ICON_MAP = {
  style: Scissors,
  supplier: Factory,
  purchase_order: ClipboardList,
  sample: FlaskConical,
  person: Users,
  task: CheckSquare,
  action: Plus,
  page: Search,
}

const QUICK_ACTIONS = [
  { id: 'create-task', label: 'New Task', type: 'action', action: 'create-task', icon: CheckSquare, section: 'Create' },
  { id: 'create-piece', label: 'New Piece', type: 'action', action: 'create-piece', icon: Layers, section: 'Create' },
]

const QUICK_LINKS = [
  { label: 'Dashboard', path: '/', section: 'Pages' },
  { label: 'Styles', path: '/styles', section: 'Pages' },
  { label: 'Suppliers', path: '/suppliers', section: 'Pages' },
  { label: 'Orders', path: '/orders', section: 'Pages' },
  { label: 'Materials', path: '/materials', section: 'Pages' },
  { label: 'Samples', path: '/samples', section: 'Pages' },
  { label: 'Team', path: '/team', section: 'Pages' },
  { label: 'Activity', path: '/activity', section: 'Pages' },
  { label: 'Tasks', path: '/tasks', section: 'Pages' },
  { label: 'Range Planning', path: '/range-planning', section: 'Pages' },
  { label: 'Command Center', path: '/admin', section: 'Pages' },
  { label: 'Help', path: '/help', section: 'Pages' },
]

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { currentSeason } = useSeason()
  const { currentPerson, people } = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeForm, setActiveForm] = useState(null) // 'create-task' | 'create-piece'
  const toast = useToast()
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setActiveForm(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (activeForm) return // Don't search while in a form
    if (!query.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await globalSearch(query.trim(), currentSeason?.id, currentPerson?.name)
        setResults(data)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Search failed:', err)
        toast.error('Search failed')
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query, currentSeason?.id, activeForm])

  // Filter quick actions + links by query
  const filteredActions = query.trim()
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS

  const allItems = query.trim()
    ? [...filteredActions, ...results]
    : [...QUICK_ACTIONS, ...QUICK_LINKS.map(l => ({ type: 'page', label: l.label, path: l.path }))]

  const handleSelect = useCallback((item) => {
    if (item.action) {
      setActiveForm(item.action)
      return
    }
    onClose()
    if (item.path) {
      navigate(item.path)
    } else if (item.type === 'style') {
      navigate(`/styles/${item.id}`)
    } else if (item.type === 'supplier') {
      navigate(`/suppliers/${item.id}`)
    } else if (item.type === 'purchase_order') {
      navigate(`/orders/${item.id}`)
    } else if (item.type === 'person') {
      navigate('/team')
    } else if (item.type === 'sample') {
      navigate('/samples')
    } else if (item.type === 'task') {
      navigate('/tasks')
    }
  }, [navigate, onClose])

  function handleKeyDown(e) {
    if (activeForm) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setActiveForm(null)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(allItems[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  function handleCreated() {
    setActiveForm(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()} style={activeForm ? { maxHeight: 'none' } : undefined}>
        {!activeForm && (
          <div className="command-palette-input-wrap">
            <Search size={16} className="command-palette-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or type 'new task', 'new piece'..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="command-palette-input"
            />
            <kbd className="command-palette-kbd">ESC</kbd>
          </div>
        )}

        {activeForm === 'create-task' && (
          <QuickTaskForm
            people={people}
            currentPerson={currentPerson}
            onCreated={handleCreated}
            onBack={() => { setActiveForm(null); setTimeout(() => inputRef.current?.focus(), 50) }}
          />
        )}

        {activeForm === 'create-piece' && (
          <QuickPieceForm
            currentPerson={currentPerson}
            onCreated={handleCreated}
            onBack={() => { setActiveForm(null); setTimeout(() => inputRef.current?.focus(), 50) }}
          />
        )}

        {!activeForm && (
          <div className="command-palette-results">
            {loading && <div className="command-palette-loading">Searching...</div>}

            {!loading && allItems.length === 0 && query.trim() && (
              <div className="command-palette-empty">No results found</div>
            )}

            {!loading && (() => {
              let lastSection = null
              return allItems.map((item, i) => {
                const Icon = item.icon || ICON_MAP[item.type] || Search
                const section = item.section || (item.type === 'action' ? 'Create' : item.type === 'page' ? 'Pages' : 'Results')
                const showSection = !query.trim() && section !== lastSection
                lastSection = section
                return (
                  <div key={`${item.type}-${item.id || item.label}-${i}`}>
                    {showSection && (
                      <div className="command-palette-section">{section}</div>
                    )}
                    <div
                      className={`command-palette-item ${i === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <Icon size={14} />
                      <div className="command-palette-item-content">
                        <span className="command-palette-item-label">{item.label}</span>
                        {item.sub && <span className="command-palette-item-sub">{item.sub}</span>}
                      </div>
                      <span className="command-palette-item-type">
                        {item.type === 'page' || item.type === 'action' ? '' : item.type?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quick Task Form ─────────────────────────────────────────

function QuickTaskForm({ people, currentPerson, onCreated, onBack }) {
  const toast = useToast()
  const titleRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await createTask({
        title: title.trim(),
        status: 'todo',
        priority,
        assigned_to: assignedTo ? parseInt(assignedTo) : null,
        due_date: dueDate || null,
        created_by: currentPerson?.id || null,
      })
      toast.success('Task created')
      onCreated()
    } catch (err) {
      console.error('Failed to create task:', err)
      toast.error('Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cmd-form">
      <div className="cmd-form-header">
        <button className="cmd-form-back" onClick={onBack}>&larr;</button>
        <h3><CheckSquare size={16} /> New Task</h3>
        <kbd className="command-palette-kbd" onClick={onBack}>ESC</kbd>
      </div>
      <form onSubmit={handleSubmit} className="cmd-form-body">
        <input
          ref={titleRef}
          type="text"
          placeholder="Task title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="cmd-form-title"
          required
        />
        <div className="cmd-form-row">
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="cmd-form-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim()}>
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Quick Piece Form ────────────────────────────────────────

function QuickPieceForm({ currentPerson, onCreated, onBack }) {
  const toast = useToast()
  const nameRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [ranges, setRanges] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [name, setName] = useState('')
  const [rangeId, setRangeId] = useState('')
  const [category, setCategory] = useState('')
  const [supplierId, setSupplierId] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([getRanges(), getSuppliers()])
        setRanges(r || [])
        setSuppliers(s || [])
        if (r?.length) setRangeId(r[0].id)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingData(false)
      }
    }
    load()
    setTimeout(() => nameRef.current?.focus(), 100)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !rangeId) return
    setSaving(true)
    try {
      await createRangeStyle({
        range_id: rangeId,
        name: name.trim(),
        category: category || STYLE_CATEGORIES[0],
        supplier_id: supplierId ? parseInt(supplierId) : null,
        status: 'concept',
        sort_order: 0,
        created_by: currentPerson?.id || null,
      })
      toast.success('Piece added to range')
      onCreated()
    } catch (err) {
      console.error('Failed to create piece:', err)
      toast.error('Failed to create piece')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cmd-form">
      <div className="cmd-form-header">
        <button className="cmd-form-back" onClick={onBack}>&larr;</button>
        <h3><Layers size={16} /> New Piece</h3>
        <kbd className="command-palette-kbd" onClick={onBack}>ESC</kbd>
      </div>
      <form onSubmit={handleSubmit} className="cmd-form-body">
        <input
          ref={nameRef}
          type="text"
          placeholder="Piece name..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="cmd-form-title"
          required
        />
        <div className="cmd-form-row">
          <select value={rangeId} onChange={e => setRangeId(e.target.value)} required disabled={loadingData}>
            <option value="">{loadingData ? 'Loading...' : 'Select range'}</option>
            {ranges.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Category</option>
            {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="cmd-form-row">
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">No supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{maskSupplierName(s.name, currentPerson?.name)}</option>)}
          </select>
        </div>
        <div className="cmd-form-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !name.trim() || !rangeId}>
            {saving ? 'Creating...' : 'Add Piece'}
          </button>
        </div>
      </form>
    </div>
  )
}
