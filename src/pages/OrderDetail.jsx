import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { getPurchaseOrder, updatePurchaseOrder, createPurchaseOrder, getPOLineItems, createPOLineItem, updatePOLineItem, deletePOLineItem, updatePOTotals } from '../lib/supabase'
import { PO_STATUSES } from '../lib/constants'
import { useToast } from '../contexts/ToastContext'
import StatusBadge from '../components/StatusBadge'
import POForm from '../components/POForm'
import POLineItemTable from '../components/POLineItemTable'
import Breadcrumbs from '../components/Breadcrumbs'
import CommentThread from '../components/CommentThread'
import { Edit, Calendar, DollarSign, Package, Truck, Copy } from 'lucide-react'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentPerson } = useApp()
  const toast = useToast()
  const [po, setPo] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [poData, items] = await Promise.all([
        getPurchaseOrder(id),
        getPOLineItems(id),
      ])
      setPo(poData)
      setLineItems(items || [])
    } catch (err) {
      console.error('Failed to load PO:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      await updatePurchaseOrder(id, { status: newStatus })
      toast.success(`Status changed to ${newStatus}`)
      loadData()
    } catch (err) {
      console.error('Failed to update status:', err)
      toast.error('Failed to update status')
    }
  }

  async function handleDuplicate() {
    try {
      const { id: _, created_at, updated_at, total_qty, total_amount, ...rest } = po
      const newPO = await createPurchaseOrder({
        ...rest,
        po_number: `${po.po_number}-COPY`,
        status: 'draft',
        total_qty: 0,
        total_amount: 0,
      })
      toast.success('Purchase order duplicated')
      navigate(`/orders/${newPO.id}`)
    } catch (err) {
      console.error('Failed to duplicate PO:', err)
      toast.error('Failed to duplicate PO')
    }
  }

  async function handleUpdate(formData) {
    await updatePurchaseOrder(id, formData)
    setShowEdit(false)
    loadData()
  }

  async function handleAddLineItem(item) {
    await createPOLineItem({ ...item, purchase_order_id: id })
    await updatePOTotals(id)
    loadData()
  }

  async function handleUpdateLineItem(itemId, updates) {
    await updatePOLineItem(itemId, updates)
    await updatePOTotals(id)
    loadData()
  }

  async function handleDeleteLineItem(itemId) {
    if (!confirm('Remove this line item?')) return
    await deletePOLineItem(itemId)
    await updatePOTotals(id)
    loadData()
  }

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>
  if (!po) return <div className="card"><div className="empty-state"><h3>Purchase order not found</h3></div></div>

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Orders', to: '/orders' },
        { label: `${po.po_number} - ${po.suppliers?.name || 'Unknown'}` },
      ]} />

      <div className="po-detail-header card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--gray-500)' }}>{po.po_number}</div>
            <h2 style={{ marginTop: '0.25rem' }}>{po.suppliers?.name || 'Unknown Supplier'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={po.status}
              onChange={e => handleStatusChange(e.target.value)}
              style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
            >
              {PO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={handleDuplicate}>
              <Copy size={14} /> Duplicate
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
              <Edit size={14} /> Edit
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <MetaItem icon={Calendar} label="Issue Date" value={formatDate(po.issue_date)} />
          <MetaItem icon={Calendar} label="Confirm By" value={formatDate(po.confirm_by_date)} />
          <MetaItem icon={Calendar} label="Ex-Factory" value={formatDate(po.ex_factory_date)} />
          <MetaItem icon={Calendar} label="Delivery" value={formatDate(po.delivery_date)} />
          <MetaItem icon={Package} label="Total Qty" value={po.total_qty || '0'} />
          <MetaItem icon={DollarSign} label="Total Amount" value={po.total_amount ? `$${parseFloat(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${po.currency}` : '-'} />
          <MetaItem icon={Truck} label="Ship Mode" value={po.ship_mode || '-'} />
          <MetaItem label="Payment Terms" value={po.payment_terms || '-'} />
        </div>

        {po.notes && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--gray-600)' }}>
            {po.notes}
          </div>
        )}
      </div>

      <POLineItemTable
        lineItems={lineItems}
        onAdd={handleAddLineItem}
        onUpdate={handleUpdateLineItem}
        onDelete={handleDeleteLineItem}
      />

      <div style={{ marginTop: '1.5rem' }}>
        <CommentThread entityType="purchase_order" entityId={po.id} />
      </div>

      {showEdit && <POForm po={po} onClose={() => setShowEdit(false)} onSave={handleUpdate} />}
    </div>
  )
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="meta-item">
      <div className="meta-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {Icon && <Icon size={11} />} {label}
      </div>
      <div className="meta-value">{value}</div>
    </div>
  )
}
