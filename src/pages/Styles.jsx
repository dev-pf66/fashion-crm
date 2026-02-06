import { useState, useEffect } from 'react'
import { useSeason } from '../contexts/SeasonContext'
import { useApp } from '../App'
import { getStyles, getSuppliers, updateStyle } from '../lib/supabase'
import { STYLE_STATUSES, STYLE_CATEGORIES } from '../lib/constants'
import StyleCard from '../components/StyleCard'
import StyleForm from '../components/StyleForm'
import InlineStatusSelect from '../components/InlineStatusSelect'
import QuickViewDrawer from '../components/QuickViewDrawer'
import { exportToCSV } from '../lib/csvExporter'
import useStickyFilters from '../lib/useStickyFilters'
import { Plus, Grid3X3, List, Scissors, Search, Download, ArrowUpDown, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Styles() {
  const { currentSeason } = useSeason()
  const { people } = useApp()
  const navigate = useNavigate()
  const [styles, setStyles] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState({ key: '', dir: 'asc' })
  const [quickView, setQuickView] = useState(null)
  const [filters, setFilters] = useStickyFilters('styles', {
    status: '',
    category: '',
    supplier_id: '',
    assigned_to: '',
    search: '',
  })

  useEffect(() => {
    if (currentSeason) {
      loadData()
    }
  }, [currentSeason])

  async function loadData() {
    setLoading(true)
    try {
      const [stylesData, suppData] = await Promise.all([
        getStyles(currentSeason.id),
        getSuppliers(),
      ])
      setStyles(stylesData)
      setSuppliers(suppData)
    } catch (err) {
      console.error('Failed to load styles:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = styles.filter(s => {
    if (filters.status && s.status !== filters.status) return false
    if (filters.category && s.category !== filters.category) return false
    if (filters.supplier_id && s.supplier_id !== filters.supplier_id) return false
    if (filters.assigned_to && s.assigned_to !== filters.assigned_to) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !s.style_number.toLowerCase().includes(q)) return false
    }
    return true
  })

  function handleFilterChange(field, value) {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  function sortedItems(items) {
    if (!sort.key) return items
    return [...items].sort((a, b) => {
      let aVal, bVal
      switch (sort.key) {
        case 'style_number': aVal = a.style_number || ''; bVal = b.style_number || ''; break
        case 'name': aVal = a.name || ''; bVal = b.name || ''; break
        case 'category': aVal = a.category || ''; bVal = b.category || ''; break
        case 'supplier': aVal = a.suppliers?.name || ''; bVal = b.suppliers?.name || ''; break
        case 'status': aVal = a.status || ''; bVal = b.status || ''; break
        case 'target_fob': return sort.dir === 'asc' ? (parseFloat(a.target_fob) || 0) - (parseFloat(b.target_fob) || 0) : (parseFloat(b.target_fob) || 0) - (parseFloat(a.target_fob) || 0)
        case 'assigned': aVal = a.people?.name || ''; bVal = b.people?.name || ''; break
        default: return 0
      }
      const cmp = aVal.localeCompare(bVal)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }

  async function handleInlineStatusChange(styleId, newStatus) {
    try {
      const updated = await updateStyle(styleId, { status: newStatus })
      setStyles(prev => prev.map(s => s.id === styleId ? updated : s))
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Styles</h1>
          <p className="subtitle">{currentSeason?.code} &middot; {filtered.length} styles</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(filtered, 'styles', [
            { key: 'style_number', header: 'Style #' },
            { key: 'name', header: 'Name' },
            { key: 'category', header: 'Category' },
            { key: 'status', header: 'Status' },
            { header: 'Supplier', format: r => r.suppliers?.name || '' },
            { key: 'target_fob', header: 'Target FOB' },
            { header: 'Assigned To', format: r => r.people?.name || '' },
          ])} disabled={filtered.length === 0}>
            <Download size={14} /> Export
          </button>
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
              <Grid3X3 size={14} /> Grid
            </button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <List size={14} /> Table
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Style
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="search"
            placeholder="Search styles..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
        <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STYLE_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
          <option value="">All Categories</option>
          {STYLE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filters.supplier_id} onChange={e => handleFilterChange('supplier_id', e.target.value)}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Scissors size={48} />
            <h3>No styles found</h3>
            <p>{styles.length === 0 ? 'Create your first style for this season.' : 'Try adjusting your filters.'}</p>
            {styles.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Create Style
              </button>
            )}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="styles-grid">
          {filtered.map(style => (
            <StyleCard key={style.id} style={style} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => toggleSort('style_number')}>Style # <SortIcon field="style_number" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('name')}>Name <SortIcon field="name" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('category')}>Category <SortIcon field="category" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('supplier')}>Supplier <SortIcon field="supplier" sort={sort} /></th>
                <th>Status</th>
                <th className="sortable-header" onClick={() => toggleSort('target_fob')}>FOB <SortIcon field="target_fob" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('assigned')}>Assigned <SortIcon field="assigned" sort={sort} /></th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems(filtered).map(style => (
                <tr key={style.id} className="clickable" onClick={() => navigate(`/styles/${style.id}`)}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {style.style_number}
                  </td>
                  <td style={{ fontWeight: 500 }}>{style.name}</td>
                  <td>{style.category || '-'}</td>
                  <td>{style.suppliers?.name || '-'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <InlineStatusSelect status={style.status} statuses={STYLE_STATUSES} onChange={v => handleInlineStatusChange(style.id, v)} />
                  </td>
                  <td>{style.target_fob ? `$${parseFloat(style.target_fob).toFixed(2)}` : '-'}</td>
                  <td>{style.people?.name || '-'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm quick-view-btn" onClick={() => setQuickView(style)}><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <StyleForm
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData() }}
        />
      )}

      {quickView && (
        <QuickViewDrawer item={quickView} type="style" onClose={() => setQuickView(null)} />
      )}
    </div>
  )
}

function SortIcon({ field, sort }) {
  if (sort.key !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
  return <span style={{ fontSize: '0.75rem' }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>
}
