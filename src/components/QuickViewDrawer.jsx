import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { X, ExternalLink } from 'lucide-react'

export default function QuickViewDrawer({ item, type, onClose }) {
  const navigate = useNavigate()
  const drawerRef = useRef(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!item) return null

  const detailPath = type === 'style' ? `/styles/${item.id}`
    : type === 'order' ? `/orders/${item.id}`
    : type === 'supplier' ? `/suppliers/${item.id}`
    : null

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="quick-view-drawer" ref={drawerRef}>
        <div className="drawer-header">
          <h3>{type === 'style' ? 'Style' : type === 'order' ? 'Purchase Order' : 'Supplier'} Quick View</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {detailPath && (
              <button className="btn btn-ghost btn-sm" onClick={() => { onClose(); navigate(detailPath) }}>
                <ExternalLink size={14} /> Open
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {type === 'style' && <StyleQuickView item={item} />}
          {type === 'order' && <OrderQuickView item={item} />}
          {type === 'supplier' && <SupplierQuickView item={item} />}
        </div>
      </div>
    </>
  )
}

function StyleQuickView({ item }) {
  return (
    <div className="quick-view-content">
      <div className="quick-view-title-row">
        <span className="quick-view-number">{item.style_number}</span>
        <StatusBadge status={item.status} />
      </div>
      <h2 className="quick-view-name">{item.name}</h2>
      <div className="quick-view-meta">
        <MetaRow label="Category" value={item.category || '-'} />
        <MetaRow label="Supplier" value={item.suppliers?.name || '-'} />
        <MetaRow label="Assigned To" value={item.people?.name || '-'} />
        <MetaRow label="Target FOB" value={item.target_fob ? `$${parseFloat(item.target_fob).toFixed(2)}` : '-'} />
        <MetaRow label="Target Retail" value={item.target_retail ? `$${parseFloat(item.target_retail).toFixed(2)}` : '-'} />
      </div>
      {item.description && (
        <div className="quick-view-section">
          <h4>Description</h4>
          <p>{item.description}</p>
        </div>
      )}
    </div>
  )
}

function OrderQuickView({ item }) {
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
  return (
    <div className="quick-view-content">
      <div className="quick-view-title-row">
        <span className="quick-view-number">{item.po_number}</span>
        <StatusBadge status={item.status} />
      </div>
      <h2 className="quick-view-name">{item.suppliers?.name || 'Unknown Supplier'}</h2>
      <div className="quick-view-meta">
        <MetaRow label="Issue Date" value={formatDate(item.issue_date)} />
        <MetaRow label="Delivery" value={formatDate(item.delivery_date)} />
        <MetaRow label="Total Qty" value={item.total_qty || '0'} />
        <MetaRow label="Total Amount" value={item.total_amount ? `$${parseFloat(item.total_amount).toFixed(2)} ${item.currency || ''}` : '-'} />
        <MetaRow label="Ship Mode" value={item.ship_mode || '-'} />
        <MetaRow label="Assigned To" value={item.people?.name || '-'} />
      </div>
      {item.notes && (
        <div className="quick-view-section">
          <h4>Notes</h4>
          <p>{item.notes}</p>
        </div>
      )}
    </div>
  )
}

function SupplierQuickView({ item }) {
  return (
    <div className="quick-view-content">
      <div className="quick-view-title-row">
        <span className="quick-view-number">{item.code || '-'}</span>
        <StatusBadge status={item.status} />
      </div>
      <h2 className="quick-view-name">{item.name}</h2>
      <div className="quick-view-meta">
        <MetaRow label="Location" value={[item.city, item.country].filter(Boolean).join(', ') || '-'} />
        <MetaRow label="Contact" value={item.contact_name || '-'} />
        <MetaRow label="Email" value={item.contact_email || '-'} />
        <MetaRow label="Score" value={item.overall_score ? parseFloat(item.overall_score).toFixed(1) : '-'} />
      </div>
      {item.product_types?.length > 0 && (
        <div className="quick-view-section">
          <h4>Product Types</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {item.product_types.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }) {
  return (
    <div className="quick-view-meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value}</span>
    </div>
  )
}
