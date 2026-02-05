import { useState, useEffect } from 'react'
import { getMaterials, getSuppliers, createMaterial } from '../lib/supabase'
import { MATERIAL_TYPES } from '../lib/constants'
import Modal from '../components/Modal'
import { Plus, Palette, Search, ImageOff } from 'lucide-react'

export default function Materials() {
  const [materials, setMaterials] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({ type: '', supplier_id: '', search: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [mats, sups] = await Promise.all([getMaterials(), getSuppliers()])
      setMaterials(mats || [])
      setSuppliers(sups || [])
    } catch (err) {
      console.error('Failed to load materials:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = materials.filter(m => {
    if (filters.type && m.type !== filters.type) return false
    if (filters.supplier_id && m.supplier_id !== filters.supplier_id) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!m.name.toLowerCase().includes(q) && !(m.code || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Materials</h1>
          <p className="subtitle">{filtered.length} materials</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Material
        </button>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input type="search" placeholder="Search materials..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} style={{ paddingLeft: '2rem' }} />
        </div>
        <select value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}>
          <option value="">All Types</option>
          {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filters.supplier_id} onChange={e => setFilters(p => ({ ...p, supplier_id: e.target.value }))}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state">
          <Palette size={48} />
          <h3>No materials found</h3>
          <p>{materials.length === 0 ? 'Add your first material to the library.' : 'Try adjusting your filters.'}</p>
          {materials.length === 0 && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Material</button>}
        </div></div>
      ) : (
        <div className="materials-grid">
          {filtered.map(m => (
            <div key={m.id} className="material-card">
              <div className="material-card-swatch">
                {m.swatch_image_url ? <img src={m.swatch_image_url} alt={m.name} /> : <ImageOff size={32} />}
              </div>
              <div className="material-card-body">
                <div className="material-card-code">{m.code || 'No code'}</div>
                <div className="material-card-name">{m.name}</div>
                <div className="material-card-details">
                  {m.type && <span className="tag" style={{ marginRight: '0.25rem' }}>{m.type}</span>}
                  {m.composition && <span>{m.composition}</span>}
                </div>
                <div className="material-card-details" style={{ marginTop: '0.25rem' }}>
                  {m.suppliers?.name && <span>{m.suppliers.name}</span>}
                  {m.unit_price && <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>${parseFloat(m.unit_price).toFixed(2)}/{m.price_unit || 'yd'}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <MaterialFormModal suppliers={suppliers} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); loadData() }} />}
    </div>
  )
}

function MaterialFormModal({ suppliers, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', code: '', type: 'fabric', description: '',
    composition: '', weight: '', width: '', color: '',
    supplier_id: '', unit_price: '', price_unit: 'yard', currency: 'USD',
    moq: '', lead_time_days: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createMaterial({
        ...form,
        supplier_id: form.supplier_id || null,
        unit_price: form.unit_price || null,
        moq: form.moq || null,
        lead_time_days: form.lead_time_days || null,
      })
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New Material" onClose={onClose} large>
      {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row-3">
          <div className="form-group"><label>Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
          <div className="form-group"><label>Code</label><input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. FAB-001" /></div>
          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Composition</label><input type="text" value={form.composition} onChange={e => setForm(p => ({ ...p, composition: e.target.value }))} placeholder="e.g. 100% Cotton" /></div>
          <div className="form-group"><label>Color</label><input type="text" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} /></div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label>Weight</label><input type="text" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="e.g. 180 gsm" /></div>
          <div className="form-group"><label>Width</label><input type="text" value={form.width} onChange={e => setForm(p => ({ ...p, width: e.target.value }))} placeholder='e.g. 60"' /></div>
          <div className="form-group">
            <label>Supplier</label>
            <select value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
              <option value="">Select...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row-3">
          <div className="form-group"><label>Unit Price ($)</label><input type="number" step="0.01" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></div>
          <div className="form-group"><label>MOQ</label><input type="number" value={form.moq} onChange={e => setForm(p => ({ ...p, moq: e.target.value }))} /></div>
          <div className="form-group"><label>Lead Time (days)</label><input type="number" value={form.lead_time_days} onChange={e => setForm(p => ({ ...p, lead_time_days: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Material'}</button>
        </div>
      </form>
    </Modal>
  )
}
