import StatusBadge from './StatusBadge'
import { Package, Calendar, DollarSign } from 'lucide-react'

export default function POCard({ po, onClick }) {
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
  const isOverdue = po.delivery_date && new Date(po.delivery_date) < new Date() && !['received', 'cancelled'].includes(po.status)

  return (
    <div className="po-card" onClick={onClick}>
      <div className="po-card-header">
        <div>
          <div className="po-card-number">{po.po_number}</div>
          <div className="po-card-supplier">{po.suppliers?.name || 'No supplier'}</div>
        </div>
        <StatusBadge status={po.status} />
      </div>

      <div className="po-card-meta">
        {po.total_qty > 0 && (
          <span className="po-card-detail"><Package size={12} /> {po.total_qty} pcs</span>
        )}
        {po.total_amount > 0 && (
          <span className="po-card-detail"><DollarSign size={12} /> {parseFloat(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {po.currency}</span>
        )}
      </div>

      <div className="po-card-footer">
        {po.delivery_date && (
          <span className={`po-card-date ${isOverdue ? 'overdue' : ''}`}>
            <Calendar size={12} />
            {formatDate(po.delivery_date)}
          </span>
        )}
        {po.people?.name && (
          <div className="assignee-avatar" title={po.people.name}>
            {po.people.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
      </div>
    </div>
  )
}
