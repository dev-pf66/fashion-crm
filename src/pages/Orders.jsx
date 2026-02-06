import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeason } from '../contexts/SeasonContext'
import { useApp } from '../App'
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, getSuppliers } from '../lib/supabase'
import { PO_STATUSES } from '../lib/constants'
import { exportToCSV } from '../lib/csvExporter'
import POCard from '../components/POCard'
import POForm from '../components/POForm'
import InlineStatusSelect from '../components/InlineStatusSelect'
import QuickViewDrawer from '../components/QuickViewDrawer'
import useStickyFilters from '../lib/useStickyFilters'
import { Plus, Grid3X3, List, ClipboardList, Search, Download, ArrowUpDown, Eye } from 'lucide-react'

export default function Orders() {
  const { currentSeason } = useSeason()
  const { people } = useApp()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState({ key: '', dir: 'asc' })
  const [quickView, setQuickView] = useState(null)
  const [filters, setFilters] = useStickyFilters('orders', { status: '', supplier_id: '', search: '' })

  useEffect(() => {
    if (currentSeason) loadData()
  }, [currentSeason])

  async function loadData() {
    setLoading(true)
    try {
      const [ordersData, suppData] = await Promise.all([
        getPurchaseOrders(currentSeason.id),
        getSuppliers({ status: 'active' }),
      ])
      setOrders(ordersData || [])
      setSuppliers(suppData || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = orders.filter(o => {
    if (filters.status && o.status !== filters.status) return false
    if (filters.supplier_id && o.supplier_id !== filters.supplier_id) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!(o.po_number || '').toLowerCase().includes(q) && !(o.suppliers?.name || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  function sortedItems(items) {
    if (!sort.key) return items
    return [...items].sort((a, b) => {
      let aVal, bVal
      switch (sort.key) {
        case 'po_number': aVal = a.po_number || ''; bVal = b.po_number || ''; break
        case 'supplier': aVal = a.suppliers?.name || ''; bVal = b.suppliers?.name || ''; break
        case 'issue_date': aVal = a.issue_date || ''; bVal = b.issue_date || ''; break
        case 'delivery_date': aVal = a.delivery_date || ''; bVal = b.delivery_date || ''; break
        case 'total_qty': return sort.dir === 'asc' ? (parseInt(a.total_qty) || 0) - (parseInt(b.total_qty) || 0) : (parseInt(b.total_qty) || 0) - (parseInt(a.total_qty) || 0)
        case 'total_amount': return sort.dir === 'asc' ? (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0) : (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0)
        case 'assigned': aVal = a.people?.name || ''; bVal = b.people?.name || ''; break
        default: return 0
      }
      const cmp = aVal.localeCompare(bVal)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }

  async function handleInlineStatusChange(orderId, newStatus) {
    try {
      const updated = await updatePurchaseOrder(orderId, { status: newStatus })
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
    } catch (err) {
      console.error('Failed to update PO status:', err)
    }
  }

  async function handleCreatePO(formData) {
    await createPurchaseOrder(formData)
    setShowForm(false)
    loadData()
  }

  function handleExport() {
    exportToCSV(filtered, 'purchase-orders', [
      { key: 'po_number', header: 'PO Number' },
      { key: 'status', header: 'Status' },
      { header: 'Supplier', format: r => r.suppliers?.name || '' },
      { key: 'issue_date', header: 'Issue Date' },
      { key: 'delivery_date', header: 'Delivery Date' },
      { key: 'total_qty', header: 'Total Qty' },
      { key: 'total_amount', header: 'Total Amount' },
      { key: 'currency', header: 'Currency' },
      { header: 'Assigned To', format: r => r.people?.name || '' },
    ])
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p className="subtitle">{filtered.length} orders</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download size={14} /> Export
          </button>
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid3X3 size={14} /> Grid</button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={14} /> Table</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New PO
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input type="search" placeholder="Search POs..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} style={{ paddingLeft: '2rem' }} />
        </div>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {PO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filters.supplier_id} onChange={e => setFilters(p => ({ ...p, supplier_id: e.target.value }))}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ClipboardList size={48} />
            <h3>No purchase orders found</h3>
            <p>{orders.length === 0 ? 'Create your first purchase order.' : 'Try adjusting your filters.'}</p>
            {orders.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create PO</button>
            )}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="po-grid">
          {filtered.map(po => (
            <POCard key={po.id} po={po} onClick={() => navigate(`/orders/${po.id}`)} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable-header" onClick={() => toggleSort('po_number')}>PO # <SortIcon field="po_number" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('supplier')}>Supplier <SortIcon field="supplier" sort={sort} /></th>
                <th>Status</th>
                <th className="sortable-header" onClick={() => toggleSort('issue_date')}>Issue Date <SortIcon field="issue_date" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('delivery_date')}>Delivery <SortIcon field="delivery_date" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('total_qty')}>Qty <SortIcon field="total_qty" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('total_amount')}>Amount <SortIcon field="total_amount" sort={sort} /></th>
                <th className="sortable-header" onClick={() => toggleSort('assigned')}>Assigned <SortIcon field="assigned" sort={sort} /></th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedItems(filtered).map(po => (
                <tr key={po.id} className="clickable" onClick={() => navigate(`/orders/${po.id}`)}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>{po.po_number}</td>
                  <td>{po.suppliers?.name || '-'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <InlineStatusSelect status={po.status} statuses={PO_STATUSES} onChange={v => handleInlineStatusChange(po.id, v)} />
                  </td>
                  <td>{po.issue_date ? new Date(po.issue_date).toLocaleDateString() : '-'}</td>
                  <td>{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '-'}</td>
                  <td>{po.total_qty || '-'}</td>
                  <td>{po.total_amount ? `$${parseFloat(po.total_amount).toFixed(2)}` : '-'}</td>
                  <td>{po.people?.name || '-'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm quick-view-btn" onClick={() => setQuickView(po)}><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <POForm onClose={() => setShowForm(false)} onSave={handleCreatePO} />}

      {quickView && (
        <QuickViewDrawer item={quickView} type="order" onClose={() => setQuickView(null)} />
      )}
    </div>
  )
}

function SortIcon({ field, sort }) {
  if (sort.key !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
  return <span style={{ fontSize: '0.75rem' }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>
}
