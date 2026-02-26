import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSupplier, updateSupplier } from '../lib/supabase'
import { SUPPLIER_STATUSES } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../contexts/ToastContext'
import CommentThread from '../components/CommentThread'
import { ArrowLeft, Edit, MapPin, Phone, Mail, Globe } from 'lucide-react'

export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const toast = useToast()

  useEffect(() => { loadSupplier() }, [id])

  async function loadSupplier() {
    setLoading(true)
    try {
      setSupplier(await getSupplier(id))
    } catch (err) {
      console.error('Failed to load supplier:', err)
      toast.error('Failed to load supplier')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      const updated = await updateSupplier(supplier.id, { status: newStatus })
      setSupplier(updated)
    } catch (err) {
      console.error('Failed to update status:', err)
      toast.error('Failed to update status')
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>
  if (!supplier) return <div className="card"><div className="empty-state"><h3>Supplier not found</h3></div></div>

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => navigate('/suppliers')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back to Suppliers
      </button>

      <div className="supplier-header">
        <div className="supplier-header-logo">{supplier.name.charAt(0)}</div>
        <div className="supplier-header-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ marginBottom: '0.25rem' }}>{supplier.name}</h1>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--gray-500)', fontSize: '0.8125rem' }}>
                {supplier.code && <span className="text-mono">{supplier.code}</span>}
                {supplier.country && <span><MapPin size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {[supplier.city, supplier.country].filter(Boolean).join(', ')}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select value={supplier.status} onChange={e => handleStatusChange(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}>
                {SUPPLIER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="info-grid">
            {supplier.contact_name && <div className="meta-item"><span className="meta-label">Contact</span><span className="meta-value">{supplier.contact_name}</span></div>}
            {supplier.contact_email && <div className="meta-item"><span className="meta-label">Email</span><span className="meta-value"><a href={`mailto:${supplier.contact_email}`}>{supplier.contact_email}</a></span></div>}
            {supplier.contact_phone && <div className="meta-item"><span className="meta-label">Phone</span><span className="meta-value">{supplier.contact_phone}</span></div>}
            {supplier.payment_terms && <div className="meta-item"><span className="meta-label">Payment Terms</span><span className="meta-value">{supplier.payment_terms}</span></div>}
            {supplier.minimum_order_qty && <div className="meta-item"><span className="meta-label">MOQ</span><span className="meta-value">{supplier.minimum_order_qty} pcs</span></div>}
            {supplier.lead_time_days && <div className="meta-item"><span className="meta-label">Lead Time</span><span className="meta-value">{supplier.lead_time_days} days</span></div>}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile</button>
        <button className={`tab ${activeTab === 'scorecard' ? 'active' : ''}`} onClick={() => setActiveTab('scorecard')}>Scorecard</button>
        <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Comments</button>
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Product Types</h3>
            {supplier.product_types?.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {supplier.product_types.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            ) : <p className="text-muted text-sm">No product types specified.</p>}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Certifications</h3>
            {supplier.certifications?.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {supplier.certifications.map(c => <span key={c} className="cert-badge">{c}</span>)}
              </div>
            ) : <p className="text-muted text-sm">No certifications listed.</p>}
          </div>
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Notes</h3>
            <p style={{ color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{supplier.notes || 'No notes.'}</p>
          </div>
        </div>
      )}

      {activeTab === 'scorecard' && (
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Supplier Scores</h3>
            <div className="scores-grid">
              {[
                { label: 'Quality', key: 'quality_score' },
                { label: 'Delivery', key: 'delivery_score' },
                { label: 'Communication', key: 'communication_score' },
                { label: 'Price', key: 'price_score' },
                { label: 'Overall', key: 'overall_score' },
              ].map(s => (
                <div key={s.key} className="score-item">
                  <div className="score-item-label">{s.label}</div>
                  <div className="score-item-value">{supplier[s.key] ? parseFloat(supplier[s.key]).toFixed(1) : '-'}</div>
                </div>
              ))}
            </div>
          </div>
          {supplier.last_audit_date && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Last Audit</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="meta-item"><span className="meta-label">Date</span><span className="meta-value">{supplier.last_audit_date}</span></div>
                <div className="meta-item"><span className="meta-label">Result</span><span className="meta-value">{supplier.audit_result || '-'}</span></div>
                <div className="meta-item"><span className="meta-label">Notes</span><span className="meta-value">{supplier.audit_notes || '-'}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <CommentThread entityType="supplier" entityId={supplier.id.toString()} />
      )}
    </div>
  )
}
