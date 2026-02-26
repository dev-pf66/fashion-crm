import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useSeason } from '../contexts/SeasonContext'
import { useToast } from '../contexts/ToastContext'
import { getStyleRequests, createStyleRequest, updateStyleRequest, deleteStyleRequest } from '../lib/supabase'
import { STYLE_CATEGORIES } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { Plus, FileText, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react'

const REQUEST_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_development', label: 'In Development' },
  { value: 'rejected', label: 'Rejected' },
]

const FABRIC_TYPES = [
  'Cotton', 'Polyester', 'Nylon', 'Silk', 'Linen', 'Wool',
  'Rayon', 'Viscose', 'Denim', 'Knit Jersey', 'French Terry',
  'Fleece', 'Satin', 'Chiffon', 'Twill', 'Canvas', 'Leather', 'Other',
]

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', color: 'var(--gray-500)' },
  { value: 'normal', label: 'Normal', color: 'var(--info)' },
  { value: 'high', label: 'High', color: 'var(--warning)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--danger)' },
]

export default function StyleRequests() {
  const { currentPerson } = useApp()
  const { currentSeason } = useSeason()
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewingRequest, setViewingRequest] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (currentSeason) loadData()
  }, [currentSeason])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getStyleRequests(currentSeason?.id)
      setRequests(data || [])
    } catch (err) {
      console.error('Failed to load requests:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await updateStyleRequest(id, { status })
      toast.success(`Request marked as ${status}`)
      loadData()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this request?')) return
    try {
      await deleteStyleRequest(id)
      toast.success('Request deleted')
      loadData()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const filtered = requests.filter(r => !filterStatus || r.status === filterStatus)

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Style Requests</h1>
          <p className="subtitle">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-header-actions">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: 'auto', fontSize: '0.8125rem' }}
          >
            <option value="">All Statuses</option>
            {REQUEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Request
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileText size={48} />
            <h3>No style requests</h3>
            <p>Submit a new request with piece details and material specs.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Request
            </button>
          </div>
        </div>
      ) : (
        <div className="request-list">
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              request={req}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onView={() => setViewingRequest(req)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <StyleRequestForm
          seasonId={currentSeason?.id}
          personId={currentPerson?.id}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData() }}
        />
      )}

      {viewingRequest && (
        <RequestDetailModal
          request={viewingRequest}
          onClose={() => setViewingRequest(null)}
          onStatusChange={(status) => { handleStatusChange(viewingRequest.id, status); setViewingRequest(null) }}
        />
      )}
    </div>
  )
}

function RequestCard({ request, onStatusChange, onDelete, onView }) {
  const urgency = URGENCY_LEVELS.find(u => u.value === request.urgency) || URGENCY_LEVELS[1]

  return (
    <div className="request-card card">
      <div className="request-card-header">
        <div className="request-card-title">
          <h3>{request.piece_name}</h3>
          <div className="request-card-meta">
            <span className="tag">{request.category || 'Uncategorized'}</span>
            <span className="urgency-badge" style={{ color: urgency.color }}>
              {urgency.label}
            </span>
            <StatusBadge status={request.status} />
          </div>
        </div>
        <div className="request-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={onView}><Eye size={14} /></button>
          <select
            value={request.status}
            onChange={e => onStatusChange(request.id, e.target.value)}
            style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.375rem' }}
            onClick={e => e.stopPropagation()}
          >
            {REQUEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(request.id)} style={{ color: 'var(--danger)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {request.description && (
        <p className="request-card-desc">{request.description}</p>
      )}

      <div className="request-card-details">
        {request.fabric_type && (
          <div className="request-detail-chip">
            <span className="detail-label">Fabric</span>
            <span>{request.fabric_type}</span>
          </div>
        )}
        {request.fabric_composition && (
          <div className="request-detail-chip">
            <span className="detail-label">Composition</span>
            <span>{request.fabric_composition}</span>
          </div>
        )}
        {request.fabric_weight && (
          <div className="request-detail-chip">
            <span className="detail-label">Weight</span>
            <span>{request.fabric_weight}</span>
          </div>
        )}
        {request.target_price && (
          <div className="request-detail-chip">
            <span className="detail-label">Target</span>
            <span>${parseFloat(request.target_price).toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="request-card-footer">
        <span className="text-sm text-muted">
          by {request.people?.name || 'Unknown'} &middot; {new Date(request.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

function RequestDetailModal({ request, onClose, onStatusChange }) {
  const urgency = URGENCY_LEVELS.find(u => u.value === request.urgency) || URGENCY_LEVELS[1]

  return (
    <Modal title="Style Request Details" onClose={onClose} large>
      <div className="request-detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2>{request.piece_name}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem', alignItems: 'center' }}>
              <span className="tag">{request.category || 'Uncategorized'}</span>
              <span className="urgency-badge" style={{ color: urgency.color }}>{urgency.label}</span>
              <StatusBadge status={request.status} />
            </div>
          </div>
          <select
            value={request.status}
            onChange={e => onStatusChange(e.target.value)}
            style={{ width: 'auto', fontSize: '0.8125rem' }}
          >
            {REQUEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {request.description && (
          <div className="request-detail-section">
            <h4>Description</h4>
            <p>{request.description}</p>
          </div>
        )}

        <div className="request-detail-grid">
          <div className="request-detail-section">
            <h4>Fabric & Materials</h4>
            <div className="detail-rows">
              <DetailRow label="Fabric Type" value={request.fabric_type} />
              <DetailRow label="Composition" value={request.fabric_composition} />
              <DetailRow label="Weight" value={request.fabric_weight} />
              <DetailRow label="Color / Print" value={request.color_print} />
              <DetailRow label="Finish" value={request.finish} />
            </div>
          </div>

          <div className="request-detail-section">
            <h4>Trims & Details</h4>
            <div className="detail-rows">
              <DetailRow label="Trims Needed" value={request.trims_needed} />
              <DetailRow label="Hardware" value={request.hardware} />
              <DetailRow label="Labels" value={request.labels} />
              <DetailRow label="Packaging" value={request.packaging_notes} />
            </div>
          </div>
        </div>

        <div className="request-detail-grid">
          <div className="request-detail-section">
            <h4>Pricing & Targets</h4>
            <div className="detail-rows">
              <DetailRow label="Target Retail" value={request.target_price ? `$${parseFloat(request.target_price).toFixed(2)}` : null} />
              <DetailRow label="Target FOB" value={request.target_fob ? `$${parseFloat(request.target_fob).toFixed(2)}` : null} />
              <DetailRow label="Target Quantity" value={request.target_quantity} />
            </div>
          </div>

          <div className="request-detail-section">
            <h4>Sizing & Fit</h4>
            <div className="detail-rows">
              <DetailRow label="Size Range" value={request.size_range} />
              <DetailRow label="Fit Notes" value={request.fit_notes} />
            </div>
          </div>
        </div>

        {request.reference_notes && (
          <div className="request-detail-section">
            <h4>Reference / Inspiration Notes</h4>
            <p>{request.reference_notes}</p>
          </div>
        )}

        {request.special_requirements && (
          <div className="request-detail-section">
            <h4>Special Requirements</h4>
            <p>{request.special_requirements}</p>
          </div>
        )}

        <div className="request-detail-footer">
          Submitted by <strong>{request.people?.name || 'Unknown'}</strong> on {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function StyleRequestForm({ seasonId, personId, onClose, onSave }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState('piece')
  const [form, setForm] = useState({
    piece_name: '',
    category: '',
    description: '',
    fabric_type: '',
    fabric_composition: '',
    fabric_weight: '',
    color_print: '',
    finish: '',
    trims_needed: '',
    hardware: '',
    labels: '',
    packaging_notes: '',
    target_price: '',
    target_fob: '',
    target_quantity: '',
    size_range: '',
    fit_notes: '',
    reference_notes: '',
    special_requirements: '',
    urgency: 'normal',
  })

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.piece_name) return
    setSaving(true)
    try {
      await createStyleRequest({
        ...form,
        season_id: seasonId,
        submitted_by: personId,
        target_price: form.target_price || null,
        target_fob: form.target_fob || null,
        target_quantity: form.target_quantity || null,
      })
      toast.success('Style request submitted!')
      onSave()
    } catch (err) {
      toast.error('Failed to submit request')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New Style Request" onClose={onClose} large>
      <form onSubmit={handleSubmit}>
        <div className="request-form-tabs">
          <button type="button" className={`tab ${section === 'piece' ? 'active' : ''}`} onClick={() => setSection('piece')}>Piece Details</button>
          <button type="button" className={`tab ${section === 'materials' ? 'active' : ''}`} onClick={() => setSection('materials')}>Materials</button>
          <button type="button" className={`tab ${section === 'trims' ? 'active' : ''}`} onClick={() => setSection('trims')}>Trims & Extras</button>
          <button type="button" className={`tab ${section === 'pricing' ? 'active' : ''}`} onClick={() => setSection('pricing')}>Pricing & Notes</button>
        </div>

        {section === 'piece' && (
          <div className="request-form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Piece / Style Name *</label>
                <input type="text" value={form.piece_name} onChange={e => updateField('piece_name', e.target.value)} placeholder="e.g. Oversized Cotton Hoodie" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={e => updateField('category', e.target.value)}>
                  <option value="">Select...</option>
                  {STYLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={3} placeholder="Describe the piece — silhouette, design details, construction..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Size Range</label>
                <input type="text" value={form.size_range} onChange={e => updateField('size_range', e.target.value)} placeholder="e.g. XS-XL, 0-12" />
              </div>
              <div className="form-group">
                <label>Fit Notes</label>
                <input type="text" value={form.fit_notes} onChange={e => updateField('fit_notes', e.target.value)} placeholder="e.g. Relaxed, cropped, oversized" />
              </div>
            </div>
            <div className="form-group">
              <label>Urgency</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {URGENCY_LEVELS.map(u => (
                  <button
                    key={u.value}
                    type="button"
                    className={`tag ${form.urgency === u.value ? 'active' : ''}`}
                    style={{
                      cursor: 'pointer',
                      background: form.urgency === u.value ? u.color + '20' : undefined,
                      color: form.urgency === u.value ? u.color : undefined,
                      borderColor: form.urgency === u.value ? u.color : undefined,
                    }}
                    onClick={() => updateField('urgency', u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'materials' && (
          <div className="request-form-section">
            <div className="form-row">
              <div className="form-group">
                <label>Fabric Type</label>
                <select value={form.fabric_type} onChange={e => updateField('fabric_type', e.target.value)}>
                  <option value="">Select...</option>
                  {FABRIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Composition</label>
                <input type="text" value={form.fabric_composition} onChange={e => updateField('fabric_composition', e.target.value)} placeholder="e.g. 100% Cotton, 95% Cotton 5% Spandex" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fabric Weight</label>
                <input type="text" value={form.fabric_weight} onChange={e => updateField('fabric_weight', e.target.value)} placeholder="e.g. 280 GSM, 6oz" />
              </div>
              <div className="form-group">
                <label>Color / Print</label>
                <input type="text" value={form.color_print} onChange={e => updateField('color_print', e.target.value)} placeholder="e.g. Black, All-over floral print" />
              </div>
            </div>
            <div className="form-group">
              <label>Finish / Treatment</label>
              <input type="text" value={form.finish} onChange={e => updateField('finish', e.target.value)} placeholder="e.g. Garment dyed, enzyme wash, peach finish" />
            </div>
          </div>
        )}

        {section === 'trims' && (
          <div className="request-form-section">
            <div className="form-group">
              <label>Trims Needed</label>
              <textarea value={form.trims_needed} onChange={e => updateField('trims_needed', e.target.value)} rows={2} placeholder="e.g. YKK zipper, metal snaps, drawcord, ribbed cuffs..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Hardware</label>
                <input type="text" value={form.hardware} onChange={e => updateField('hardware', e.target.value)} placeholder="e.g. Matte black zippers, antique brass buttons" />
              </div>
              <div className="form-group">
                <label>Labels</label>
                <input type="text" value={form.labels} onChange={e => updateField('labels', e.target.value)} placeholder="e.g. Woven main label, printed care label" />
              </div>
            </div>
            <div className="form-group">
              <label>Packaging Notes</label>
              <input type="text" value={form.packaging_notes} onChange={e => updateField('packaging_notes', e.target.value)} placeholder="e.g. Individual polybag, hang tag, tissue paper" />
            </div>
          </div>
        )}

        {section === 'pricing' && (
          <div className="request-form-section">
            <div className="form-row-3">
              <div className="form-group">
                <label>Target Retail Price</label>
                <input type="number" step="0.01" min="0" value={form.target_price} onChange={e => updateField('target_price', e.target.value)} placeholder="$0.00" />
              </div>
              <div className="form-group">
                <label>Target FOB</label>
                <input type="number" step="0.01" min="0" value={form.target_fob} onChange={e => updateField('target_fob', e.target.value)} placeholder="$0.00" />
              </div>
              <div className="form-group">
                <label>Target Quantity</label>
                <input type="number" min="1" value={form.target_quantity} onChange={e => updateField('target_quantity', e.target.value)} placeholder="e.g. 500" />
              </div>
            </div>
            <div className="form-group">
              <label>Reference / Inspiration Notes</label>
              <textarea value={form.reference_notes} onChange={e => updateField('reference_notes', e.target.value)} rows={3} placeholder="Describe references, link inspiration, competitor examples..." />
            </div>
            <div className="form-group">
              <label>Special Requirements</label>
              <textarea value={form.special_requirements} onChange={e => updateField('special_requirements', e.target.value)} rows={2} placeholder="e.g. Must be GOTS certified, specific factory required..." />
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
