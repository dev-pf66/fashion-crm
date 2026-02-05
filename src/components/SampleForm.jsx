import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useSeason } from '../contexts/SeasonContext'
import { getStyles, getSuppliers, createSample, updateSample } from '../lib/supabase'
import { SAMPLE_ROUNDS, SAMPLE_STATUSES } from '../lib/constants'
import Modal from './Modal'

export default function SampleForm({ sample, styleId, onClose, onSave }) {
  const { people } = useApp()
  const { currentSeason } = useSeason()
  const [styles, setStyles] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!sample

  const [form, setForm] = useState({
    style_id: styleId || '',
    round: 'proto',
    round_number: 1,
    supplier_id: '',
    status: 'requested',
    colorway: '',
    size: '',
    requested_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    received_date: '',
    tracking_number: '',
    courier: '',
    assigned_to: '',
    notes: '',
    fit_comments: '',
  })

  useEffect(() => {
    loadDropdowns()
    if (sample) {
      setForm({
        style_id: sample.style_id || '',
        round: sample.round || 'proto',
        round_number: sample.round_number || 1,
        supplier_id: sample.supplier_id || '',
        status: sample.status || 'requested',
        colorway: sample.colorway || '',
        size: sample.size || '',
        requested_date: sample.requested_date || '',
        expected_date: sample.expected_date || '',
        received_date: sample.received_date || '',
        tracking_number: sample.tracking_number || '',
        courier: sample.courier || '',
        assigned_to: sample.assigned_to || '',
        notes: sample.notes || '',
        fit_comments: sample.fit_comments || '',
      })
    }
  }, [sample])

  async function loadDropdowns() {
    try {
      const [stylesData, suppliersData] = await Promise.all([
        currentSeason ? getStyles(currentSeason.id) : Promise.resolve([]),
        getSuppliers({ status: 'active' }),
      ])
      setStyles(stylesData || [])
      setSuppliers(suppliersData || [])
    } catch (err) {
      console.error('Failed to load dropdowns:', err)
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
        style_id: form.style_id || null,
        supplier_id: form.supplier_id || null,
        assigned_to: form.assigned_to || null,
        round_number: parseInt(form.round_number) || 1,
        requested_date: form.requested_date || null,
        expected_date: form.expected_date || null,
        received_date: form.received_date || null,
      }

      if (isEditing) {
        await updateSample(sample.id, data)
      } else {
        await createSample(data)
      }
      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEditing ? 'Edit Sample' : 'New Sample'} onClose={onClose} large>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.8125rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Style *</label>
            <select
              value={form.style_id}
              onChange={e => handleChange('style_id', e.target.value)}
              disabled={!!styleId}
              required
            >
              <option value="">Select style...</option>
              {styles.map(s => (
                <option key={s.id} value={s.id}>{s.style_number} - {s.name}</option>
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

        <div className="form-row-3">
          <div className="form-group">
            <label>Round *</label>
            <select value={form.round} onChange={e => handleChange('round', e.target.value)} required>
              {SAMPLE_ROUNDS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Round #</label>
            <input
              type="number"
              min="1"
              value={form.round_number}
              onChange={e => handleChange('round_number', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => handleChange('status', e.target.value)}>
              {SAMPLE_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Colorway</label>
            <input
              type="text"
              value={form.colorway}
              onChange={e => handleChange('colorway', e.target.value)}
              placeholder="e.g. Black, Navy"
            />
          </div>
          <div className="form-group">
            <label>Size</label>
            <input
              type="text"
              value={form.size}
              onChange={e => handleChange('size', e.target.value)}
              placeholder="e.g. M, 8"
            />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label>Date Requested</label>
            <input type="date" value={form.requested_date} onChange={e => handleChange('requested_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date Expected</label>
            <input type="date" value={form.expected_date} onChange={e => handleChange('expected_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date Received</label>
            <input type="date" value={form.received_date} onChange={e => handleChange('received_date', e.target.value)} />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label>Tracking Number</label>
            <input
              type="text"
              value={form.tracking_number}
              onChange={e => handleChange('tracking_number', e.target.value)}
              placeholder="Tracking #"
            />
          </div>
          <div className="form-group">
            <label>Courier</label>
            <input
              type="text"
              value={form.courier}
              onChange={e => handleChange('courier', e.target.value)}
              placeholder="e.g. DHL, FedEx"
            />
          </div>
          <div className="form-group">
            <label>Assigned To</label>
            <select value={form.assigned_to} onChange={e => handleChange('assigned_to', e.target.value)}>
              <option value="">Select...</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Sample notes..."
            rows={2}
          />
        </div>

        <div className="form-group">
          <label>Fit Comments</label>
          <textarea
            value={form.fit_comments}
            onChange={e => handleChange('fit_comments', e.target.value)}
            placeholder="Fit adjustments, issues..."
            rows={2}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (isEditing ? 'Update Sample' : 'Create Sample')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
