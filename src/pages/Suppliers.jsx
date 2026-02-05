import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuppliers, createSupplier } from '../lib/supabase'
import { SUPPLIER_STATUSES, PRODUCT_TYPES, CERTIFICATIONS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { Plus, Factory, Search, Grid3X3, List } from 'lucide-react'

export default function Suppliers() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('grid')
  const [filters, setFilters] = useState({ status: '', country: '', search: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      setSuppliers(await getSuppliers())
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = suppliers.filter(s => {
    if (filters.status && s.status !== filters.status) return false
    if (filters.country && s.country !== filters.country) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !(s.code || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const countries = [...new Set(suppliers.map(s => s.country).filter(Boolean))].sort()

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="subtitle">{filtered.length} suppliers</p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid3X3 size={14} /> Grid</button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={14} /> Table</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Supplier
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input type="search" placeholder="Search suppliers..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} style={{ paddingLeft: '2rem' }} />
        </div>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {SUPPLIER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filters.country} onChange={e => setFilters(p => ({ ...p, country: e.target.value }))}>
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <Factory size={48} />
          <h3>No suppliers found</h3>
          <p>{suppliers.length === 0 ? 'Add your first supplier.' : 'Try adjusting your filters.'}</p>
          {suppliers.length === 0 && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Supplier</button>}
        </div></div>
      ) : view === 'grid' ? (
        <div className="suppliers-grid">
          {filtered.map(s => (
            <div key={s.id} className="supplier-card" onClick={() => navigate(`/suppliers/${s.id}`)}>
              <div className="supplier-card-header">
                <div className="supplier-logo">{s.name.charAt(0)}</div>
                <div>
                  <div className="supplier-card-name">{s.name}</div>
                  <div className="supplier-card-location">{[s.city, s.country].filter(Boolean).join(', ') || 'No location'}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}><StatusBadge status={s.status} /></div>
              </div>
              {s.product_types?.length > 0 && (
                <div className="supplier-card-types">
                  {s.product_types.slice(0, 4).map(t => <span key={t} className="tag">{t}</span>)}
                  {s.product_types.length > 4 && <span className="tag">+{s.product_types.length - 4}</span>}
                </div>
              )}
              {s.certifications?.length > 0 && (
                <div className="cert-badges" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {s.certifications.slice(0, 3).map(c => <span key={c} className="cert-badge">{c}</span>)}
                </div>
              )}
              {s.overall_score && (
                <div className="supplier-card-scores">
                  <div className="score-bar"><div className="score-bar-fill" style={{ width: `${(s.overall_score / 5) * 100}%` }} /></div>
                  <span className="score-value">{parseFloat(s.overall_score).toFixed(1)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Country</th><th>Status</th><th>Types</th><th>Score</th></tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/suppliers/${s.id}`)}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{s.code || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.country || '-'}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>{(s.product_types || []).join(', ') || '-'}</td>
                  <td>{s.overall_score ? parseFloat(s.overall_score).toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <SupplierFormModal onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); loadData() }} />}
    </div>
  )
}

function SupplierFormModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', code: '', country: '', city: '',
    contact_name: '', contact_email: '', contact_phone: '', website: '',
    product_types: [], capabilities: [], certifications: [],
    minimum_order_qty: '', lead_time_days: '', payment_terms: '',
    currency: 'USD', status: 'active', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleArray(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(v => v !== value) : [...prev[field], value]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createSupplier({ ...form, minimum_order_qty: form.minimum_order_qty || null, lead_time_days: form.lead_time_days || null })
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New Supplier" onClose={onClose} large>
      {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group"><label>Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
          <div className="form-group"><label>Code</label><input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. SUP-001" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Country</label><input type="text" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} /></div>
          <div className="form-group"><label>City</label><input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label>Contact Name</label><input type="text" value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
          <div className="form-group"><label>Contact Email</label><input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} /></div>
          <div className="form-group"><label>Contact Phone</label><input type="text" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label>MOQ</label><input type="number" value={form.minimum_order_qty} onChange={e => setForm(p => ({ ...p, minimum_order_qty: e.target.value }))} /></div>
          <div className="form-group"><label>Lead Time (days)</label><input type="number" value={form.lead_time_days} onChange={e => setForm(p => ({ ...p, lead_time_days: e.target.value }))} /></div>
          <div className="form-group"><label>Payment Terms</label><input type="text" value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} placeholder="e.g. Net 30" /></div>
        </div>
        <div className="form-group">
          <label>Product Types</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {PRODUCT_TYPES.map(t => (
              <button key={t} type="button" className="tag" onClick={() => toggleArray('product_types', t)}
                style={{ cursor: 'pointer', background: form.product_types.includes(t) ? 'var(--primary-light)' : undefined, color: form.product_types.includes(t) ? 'var(--primary)' : undefined }}>{t}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Certifications</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {CERTIFICATIONS.map(c => (
              <button key={c} type="button" className="tag" onClick={() => toggleArray('certifications', c)}
                style={{ cursor: 'pointer', background: form.certifications.includes(c) ? 'var(--success-light)' : undefined, color: form.certifications.includes(c) ? 'var(--success)' : undefined }}>{c}</button>
            ))}
          </div>
        </div>
        <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Supplier'}</button>
        </div>
      </form>
    </Modal>
  )
}
