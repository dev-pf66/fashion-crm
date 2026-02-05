import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useSeason } from '../contexts/SeasonContext'
import { getSuppliers, createStyle, updateStyle } from '../lib/supabase'
import { STYLE_CATEGORIES, STYLE_STATUSES, SIZE_PRESETS } from '../lib/constants'
import Modal from './Modal'
import ColorwayInput from './ColorwayInput'
import SizeRunInput from './SizeRunInput'

export default function StyleForm({ style, onClose, onSave }) {
  const { people } = useApp()
  const { currentSeason } = useSeason()
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!style

  const [form, setForm] = useState({
    style_number: '',
    name: '',
    category: '',
    subcategory: '',
    description: '',
    supplier_id: '',
    assigned_to: '',
    status: 'concept',
    colorways: [],
    size_run: { range: '', sizes: [] },
    target_fob: '',
    target_retail: '',
    target_margin: '',
    development_start: '',
    target_delivery: '',
    notes: '',
  })

  useEffect(() => {
    loadSuppliers()
    if (style) {
      setForm({
        style_number: style.style_number || '',
        name: style.name || '',
        category: style.category || '',
        subcategory: style.subcategory || '',
        description: style.description || '',
        supplier_id: style.supplier_id || '',
        assigned_to: style.assigned_to || '',
        status: style.status || 'concept',
        colorways: style.colorways || [],
        size_run: style.size_run || { range: '', sizes: [] },
        target_fob: style.target_fob || '',
        target_retail: style.target_retail || '',
        target_margin: style.target_margin || '',
        development_start: style.development_start || '',
        target_delivery: style.target_delivery || '',
        notes: style.notes || '',
      })
    }
  }, [style])

  async function loadSuppliers() {
    try {
      const data = await getSuppliers({ status: 'active' })
      setSuppliers(data)
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    }
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const data = {
        ...form,
        season_id: currentSeason.id,
        supplier_id: form.supplier_id || null,
        assigned_to: form.assigned_to || null,
        target_fob: form.target_fob || null,
        target_retail: form.target_retail || null,
        target_margin: form.target_margin || null,
        development_start: form.development_start || null,
        target_delivery: form.target_delivery || null,
      }

      if (isEditing) {
        await updateStyle(style.id, data)
      } else {
        await createStyle(data)
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEditing ? 'Edit Style' : 'New Style'} onClose={onClose} large>
      {error && <div className="login-card error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Style Number *</label>
            <input
              type="text"
              value={form.style_number}
              onChange={e => handleChange('style_number', e.target.value)}
              placeholder="e.g. ST-2601"
              required
            />
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="e.g. Classic Crew Neck Tee"
              required
            />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => handleChange('category', e.target.value)}>
              <option value="">Select...</option>
              {STYLE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => handleChange('status', e.target.value)}>
              {STYLE_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Supplier</label>
            <select value={form.supplier_id} onChange={e => handleChange('supplier_id', e.target.value)}>
              <option value="">Select...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Assigned To</label>
            <select value={form.assigned_to} onChange={e => handleChange('assigned_to', e.target.value)}>
              <option value="">Select...</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Subcategory</label>
            <input
              type="text"
              value={form.subcategory}
              onChange={e => handleChange('subcategory', e.target.value)}
              placeholder="e.g. T-Shirts"
            />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label>Target FOB ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.target_fob}
              onChange={e => handleChange('target_fob', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Target Retail ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.target_retail}
              onChange={e => handleChange('target_retail', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Target Margin (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.target_margin}
              onChange={e => handleChange('target_margin', e.target.value)}
              placeholder="0.0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Development Start</label>
            <input
              type="date"
              value={form.development_start}
              onChange={e => handleChange('development_start', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Target Delivery</label>
            <input
              type="date"
              value={form.target_delivery}
              onChange={e => handleChange('target_delivery', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Colorways</label>
          <ColorwayInput
            colorways={form.colorways}
            onChange={val => handleChange('colorways', val)}
          />
        </div>

        <div className="form-group">
          <label>Size Run</label>
          <SizeRunInput
            sizeRun={form.size_run}
            onChange={val => handleChange('size_run', val)}
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Style description, design notes..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Internal notes..."
            rows={2}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (isEditing ? 'Update Style' : 'Create Style')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
