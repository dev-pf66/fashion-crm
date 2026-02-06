import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useSeason } from '../contexts/SeasonContext'
import { getSuppliers } from '../lib/supabase'
import { PO_STATUSES, CURRENCIES } from '../lib/constants'
import Modal from './Modal'

export default function POForm({ po, onClose, onSave }) {
  const { people, currentPerson } = useApp()
  const { currentSeason } = useSeason()
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    po_number: po?.po_number || '',
    supplier_id: po?.supplier_id || '',
    status: po?.status || 'draft',
    issue_date: po?.issue_date || new Date().toISOString().slice(0, 10),
    confirm_by_date: po?.confirm_by_date || '',
    ex_factory_date: po?.ex_factory_date || '',
    delivery_date: po?.delivery_date || '',
    currency: po?.currency || 'USD',
    payment_terms: po?.payment_terms || '',
    ship_mode: po?.ship_mode || '',
    destination: po?.destination || '',
    incoterms: po?.incoterms || '',
    assigned_to: po?.assigned_to || currentPerson?.id || '',
    notes: po?.notes || '',
    season_id: po?.season_id || currentSeason?.id,
  })

  useEffect(() => {
    getSuppliers({ status: 'active' }).then(setSuppliers).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.po_number || !form.supplier_id) {
      setError('PO number and supplier are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  function set(field, value) { setForm(p => ({ ...p, [field]: value })) }

  return (
    <Modal title={po ? 'Edit Purchase Order' : 'New Purchase Order'} onClose={onClose} large>
      {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>PO Number *</label>
            <input type="text" value={form.po_number} onChange={e => set('po_number', e.target.value)} placeholder="PO-001" required />
          </div>
          <div className="form-group">
            <label>Supplier *</label>
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} required>
              <option value="">Select supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {PO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Currency</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Payment Terms</label>
            <input type="text" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} placeholder="e.g. 30% deposit, 70% before ship" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Issue Date</label>
            <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Confirm By</label>
            <input type="date" value={form.confirm_by_date} onChange={e => set('confirm_by_date', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Ex-Factory Date</label>
            <input type="date" value={form.ex_factory_date} onChange={e => set('ex_factory_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Delivery Date</label>
            <input type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label>Ship Mode</label>
            <select value={form.ship_mode} onChange={e => set('ship_mode', e.target.value)}>
              <option value="">Select...</option>
              <option value="sea">Sea</option>
              <option value="air">Air</option>
              <option value="courier">Courier</option>
              <option value="truck">Truck</option>
            </select>
          </div>
          <div className="form-group">
            <label>Destination</label>
            <input type="text" value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Los Angeles" />
          </div>
          <div className="form-group">
            <label>Incoterms</label>
            <select value={form.incoterms} onChange={e => set('incoterms', e.target.value)}>
              <option value="">Select...</option>
              <option value="FOB">FOB</option>
              <option value="CIF">CIF</option>
              <option value="EXW">EXW</option>
              <option value="DDP">DDP</option>
              <option value="DAP">DAP</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Assigned To</label>
          <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : po ? 'Update PO' : 'Create PO'}</button>
        </div>
      </form>
    </Modal>
  )
}
