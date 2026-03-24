import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { getRanges, createRange, updateRange, deleteRange } from '../lib/supabase'
import { STYLE_CATEGORIES } from '../lib/constants'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { Plus, Layers, Trash2, X, Calendar, FolderOpen, Folder, ChevronDown, ChevronRight, Edit2, Check } from 'lucide-react'

const RANGE_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'locked', label: 'Locked' },
]

export default function RangePlanning() {
  const { currentPerson } = useApp()
  const { divisions, currentDivision } = useDivision()
  const toast = useToast()
  const [ranges, setRanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState({})

  useEffect(() => { loadData() }, [currentDivision])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getRanges(currentDivision?.id)
      setRanges(data || [])
    } catch (err) {
      console.error('Failed to load ranges:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group ranges by folder
  const { folders, ungrouped } = useMemo(() => {
    const folderMap = {}
    const ungrouped = []
    for (const range of ranges) {
      if (range.folder) {
        if (!folderMap[range.folder]) folderMap[range.folder] = []
        folderMap[range.folder].push(range)
      } else {
        ungrouped.push(range)
      }
    }
    // Sort folder names alphabetically
    const folders = Object.entries(folderMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, ranges: items }))
    return { folders, ungrouped }
  }, [ranges])

  // Get unique folder names for the form dropdown
  const folderNames = useMemo(() => {
    return [...new Set(ranges.map(r => r.folder).filter(Boolean))].sort()
  }, [ranges])

  function toggleFolder(folderName) {
    setCollapsedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))
  }

  async function handleMoveToFolder(rangeId, folderName) {
    try {
      await updateRange(rangeId, { folder: folderName || null })
      toast.success(folderName ? `Moved to "${folderName}"` : 'Removed from folder')
      loadData()
    } catch (err) {
      toast.error('Failed to move range')
    }
  }

  async function handleDelete(e, id, name, styleCount) {
    e.preventDefault()
    e.stopPropagation()
    if (styleCount > 0) {
      if (!confirm(`"${name}" has ${styleCount} styles. Delete this range and all its styles?`)) return
    } else {
      if (!confirm(`Delete range "${name}"?`)) return
    }
    try {
      await deleteRange(id)
      toast.success('Range deleted')
      loadData()
    } catch (err) {
      toast.error('Failed to delete range')
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Range Planning</h1>
          <p className="subtitle">
            {ranges.length} range{ranges.length !== 1 ? 's' : ''}
            {folders.length > 0 && ` in ${folders.length} folder${folders.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Range
        </button>
      </div>

      {ranges.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Layers size={48} />
            <h3>No ranges yet</h3>
            <p>Create your first range to start planning a collection.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Range
            </button>
          </div>
        </div>
      ) : (
        <div className="rp-folders-container">
          {/* Folders */}
          {folders.map(folder => {
            const isCollapsed = collapsedFolders[folder.name]
            const totalStyles = folder.ranges.reduce((sum, r) => sum + (r.range_styles?.length || 0), 0)
            return (
              <div key={folder.name} className="rp-folder">
                <button
                  className="rp-folder-header"
                  onClick={() => toggleFolder(folder.name)}
                  aria-expanded={!isCollapsed}
                  aria-label={`${folder.name} folder, ${folder.ranges.length} ranges`}
                >
                  <div className="rp-folder-header-left">
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    {isCollapsed ? <Folder size={18} /> : <FolderOpen size={18} />}
                    <span className="rp-folder-name">{folder.name}</span>
                  </div>
                  <div className="rp-folder-meta">
                    <span className="rp-folder-count">{folder.ranges.length} range{folder.ranges.length !== 1 ? 's' : ''}</span>
                    {totalStyles > 0 && (
                      <span className="rp-folder-styles">{totalStyles} style{totalStyles !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="rp-range-list">
                    {folder.ranges.map(range => (
                      <RangeCard key={range.id} range={range} onDelete={handleDelete} folderNames={folderNames} onMoveToFolder={handleMoveToFolder} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Ungrouped ranges */}
          {ungrouped.length > 0 && (
            <>
              {folders.length > 0 && (
                <div className="rp-ungrouped-label">Other Ranges</div>
              )}
              <div className="rp-range-list">
                {ungrouped.map(range => (
                  <RangeCard key={range.id} range={range} onDelete={handleDelete} folderNames={folderNames} onMoveToFolder={handleMoveToFolder} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showForm && (
        <NewRangeForm
          personId={currentPerson?.id}
          divisionId={currentDivision?.id}
          divisions={divisions}
          folderNames={folderNames}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData() }}
        />
      )}
    </div>
  )
}

function RangeCard({ range, onDelete, folderNames, onMoveToFolder }) {
  const toast = useToast()
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  const styleCount = range.range_styles?.length || 0
  const byCategory = {}
  const byStatus = {}
  let totalQty = 0
  ;(range.range_styles || []).forEach(s => {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1
    byStatus[s.status] = (byStatus[s.status] || 0) + 1
    totalQty += s.production_qty || 0
  })

  async function handleMoveToFolder(e, folderName) {
    e.preventDefault()
    e.stopPropagation()
    setShowFolderMenu(false)
    try {
      await onMoveToFolder(range.id, folderName)
    } catch (err) {
      toast.error('Failed to move range')
    }
  }

  return (
    <Link to={`/range-planning/${range.id}`} className="rp-range-card card">
      <div className="rp-range-card-header">
        <div>
          <h3>{range.name}</h3>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {range.division && <span className="tag">{range.division}</span>}
            {range.folder && <span className="tag" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}><Folder size={10} /> {range.folder}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StatusBadge status={range.status} />
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFolderMenu(!showFolderMenu) }}
              title="Move to folder"
            >
              <FolderOpen size={14} />
            </button>
            {showFolderMenu && (
              <div className="rp-folder-menu" onClick={e => { e.preventDefault(); e.stopPropagation() }}>
                <div className="rp-folder-menu-title">Move to folder</div>
                <button className="rp-folder-menu-item" onClick={(e) => handleMoveToFolder(e, null)}>
                  <X size={12} /> No folder
                </button>
                {folderNames.map(f => (
                  <button
                    key={f}
                    className={`rp-folder-menu-item ${range.folder === f ? 'active' : ''}`}
                    onClick={(e) => handleMoveToFolder(e, f)}
                  >
                    <Folder size={12} /> {f}
                  </button>
                ))}
                <NewFolderInput onSubmit={(e, name) => handleMoveToFolder(e, name)} />
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => onDelete(e, range.id, range.name, styleCount)}
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="rp-range-card-stats">
        <span className="rp-stat-big">{styleCount}</span>
        <span className="text-sm text-muted">
          {range.target_styles ? `/ ${range.target_styles} pieces` : `style${styleCount !== 1 ? 's' : ''}`}
        </span>
      </div>
      {range.target_styles > 0 && (
        <div className="rp-range-completion">
          <div className="rp-range-completion-bar">
            <div
              className="rp-range-completion-fill"
              style={{ width: `${Math.min(100, Math.round((styleCount / range.target_styles) * 100))}%` }}
            />
          </div>
          <span className="rp-range-completion-pct">
            {Math.round((styleCount / range.target_styles) * 100)}%
          </span>
        </div>
      )}
      {styleCount > 0 && (
        <>
          <div className="rp-range-card-meta" style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
            <span>Approved: {byStatus.approved || 0} / {styleCount}</span>
            {totalQty > 0 && <span>Total Qty: {totalQty.toLocaleString()}</span>}
          </div>
          <div className="rp-range-card-breakdown">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, count]) => (
              <span key={cat} className="rp-breakdown-item">{cat}: {count}</span>
            ))}
            {Object.keys(byCategory).length > 4 && (
              <span className="rp-breakdown-item text-muted">+{Object.keys(byCategory).length - 4} more</span>
            )}
          </div>
        </>
      )}
      <div className="rp-range-card-footer">
        <span className="text-sm text-muted">
          by {range.creator?.name || 'Unknown'} &middot; {new Date(range.created_at).toLocaleDateString()}
        </span>
        {range.deadline && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            color: new Date(range.deadline) < new Date() ? 'var(--danger)' : 'var(--gray-500)',
            fontWeight: 500,
          }}>
            <Calendar size={12} />
            {new Date(range.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
    </Link>
  )
}

function NewRangeForm({ personId, divisionId, divisions, folderNames, onClose, onSave }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [selectedDivisionId, setSelectedDivisionId] = useState(divisionId || '')
  const [targetStyles, setTargetStyles] = useState('')
  const [deadline, setDeadline] = useState('')
  const [folder, setFolder] = useState('')
  const [newFolder, setNewFolder] = useState('')
  const [categories, setCategories] = useState([...STYLE_CATEGORIES])
  const [newCat, setNewCat] = useState('')

  const effectiveFolder = folder === '__new__' ? newFolder.trim() : folder

  function addCategory() {
    const cat = newCat.trim()
    if (!cat || categories.includes(cat)) return
    setCategories(prev => [...prev, cat])
    setNewCat('')
  }

  function removeCategory(cat) {
    setCategories(prev => prev.filter(c => c !== cat))
  }

  function toggleDefault(cat) {
    if (categories.includes(cat)) {
      removeCategory(cat)
    } else {
      setCategories(prev => [...prev, cat])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (categories.length === 0) {
      toast.error('Add at least one category')
      return
    }
    setSaving(true)
    try {
      const rangeData = {
        name: name.trim(),
        target_styles: targetStyles ? parseInt(targetStyles) : 0,
        deadline: deadline || null,
        categories,
        division_id: selectedDivisionId || null,
        folder: effectiveFolder || null,
      }
      if (personId) rangeData.created_by = personId
      await createRange(rangeData)
      toast.success('Range created!')
      onSave()
    } catch (err) {
      console.error('Create range error:', err)
      toast.error('Failed: ' + (err?.message || err?.details || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New Range" onClose={onClose} large>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Range Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SS26 Womenswear" required autoFocus />
          </div>
          <div className="form-group">
            <label>Division</label>
            <select value={selectedDivisionId} onChange={e => setSelectedDivisionId(e.target.value ? parseInt(e.target.value) : '')}>
              <option value="">Select Division</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Target No. of Products</label>
            <input type="number" min="0" value={targetStyles} onChange={e => setTargetStyles(e.target.value)} placeholder="e.g. 50" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Folder</label>
            <select value={folder} onChange={e => setFolder(e.target.value)}>
              <option value="">No folder</option>
              {folderNames.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="__new__">+ New folder...</option>
            </select>
          </div>
          {folder === '__new__' && (
            <div className="form-group">
              <label>New Folder Name</label>
              <input
                type="text"
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                placeholder="e.g. Spring/Summer 2026"
                autoFocus
              />
            </div>
          )}
          <div className="form-group">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Categories</label>
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', margin: '0 0 0.5rem' }}>
            Select which categories this range will use. You can also add custom ones.
          </p>

          <div className="range-cat-defaults">
            {STYLE_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`range-cat-chip ${categories.includes(cat) ? 'active' : ''}`}
                onClick={() => toggleDefault(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {categories.filter(c => !STYLE_CATEGORIES.includes(c)).length > 0 && (
            <div className="range-cat-custom">
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500 }}>Custom:</span>
              {categories.filter(c => !STYLE_CATEGORIES.includes(c)).map(cat => (
                <span key={cat} className="range-cat-chip active">
                  {cat}
                  <button type="button" className="range-cat-remove" onClick={() => removeCategory(cat)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="range-cat-add">
            <input
              type="text"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
              placeholder="Add custom category..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addCategory} disabled={!newCat.trim()}>
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} selected
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Range'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NewFolderInput({ onSubmit }) {
  const [value, setValue] = useState('')
  const [showInput, setShowInput] = useState(false)

  if (!showInput) {
    return (
      <button className="rp-folder-menu-item" onClick={() => setShowInput(true)}>
        <Plus size={12} /> New folder...
      </button>
    )
  }

  return (
    <div className="rp-folder-menu-new">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Folder name"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) onSubmit(e, value.trim())
          if (e.key === 'Escape') setShowInput(false)
        }}
      />
      <button
        className="btn btn-primary btn-sm"
        onClick={e => { if (value.trim()) onSubmit(e, value.trim()) }}
        disabled={!value.trim()}
      >
        <Check size={12} />
      </button>
    </div>
  )
}
