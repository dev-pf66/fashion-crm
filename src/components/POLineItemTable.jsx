import { useState, useEffect } from 'react'
import { getStyles } from '../lib/supabase'
import { useSeason } from '../contexts/SeasonContext'
import { Plus, Trash2, Save } from 'lucide-react'

export default function POLineItemTable({ lineItems, onAdd, onUpdate, onDelete }) {
  const { currentSeason } = useSeason()
  const [styles, setStyles] = useState([])
  const [newRow, setNewRow] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    if (currentSeason) {
      getStyles(currentSeason.id).then(setStyles).catch(() => {})
    }
  }, [currentSeason])

  function startAdd() {
    setNewRow({ style_id: '', colorway: '', size: '', quantity: '', unit_price: '' })
  }

  async function handleSaveNew() {
    if (!newRow.style_id || !newRow.quantity) return
    const totalPrice = (parseFloat(newRow.quantity) || 0) * (parseFloat(newRow.unit_price) || 0)
    await onAdd({ ...newRow, quantity: parseInt(newRow.quantity), unit_price: parseFloat(newRow.unit_price) || 0, total_price: totalPrice })
    setNewRow(null)
  }

  async function handleSaveEdit(item) {
    const totalPrice = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
    await onUpdate(item.id, { style_id: item.style_id, colorway: item.colorway, size: item.size, quantity: parseInt(item.quantity), unit_price: parseFloat(item.unit_price) || 0, total_price: totalPrice })
    setEditingId(null)
  }

  const grandTotal = lineItems.reduce((sum, li) => sum + (parseFloat(li.total_price) || 0), 0)
  const grandQty = lineItems.reduce((sum, li) => sum + (parseInt(li.quantity) || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3>Line Items</h3>
        <button className="btn btn-primary btn-sm" onClick={startAdd} disabled={!!newRow}>
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="bom-table">
          <thead>
            <tr>
              <th>Style</th>
              <th>Colorway</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map(item => {
              if (editingId === item.id) {
                return <EditRow key={item.id} item={item} styles={styles} onSave={handleSaveEdit} onCancel={() => setEditingId(null)} />
              }
              return (
                <tr key={item.id} onDoubleClick={() => setEditingId(item.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>
                    {item.styles?.style_number || '-'} {item.styles?.name ? `- ${item.styles.name}` : ''}
                  </td>
                  <td>{item.colorway || '-'}</td>
                  <td>{item.size || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</td>
                  <td style={{ fontWeight: 600 }}>{item.total_price ? `$${parseFloat(item.total_price).toFixed(2)}` : '-'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(item.id)} title="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}

            {newRow && <NewRow row={newRow} setRow={setNewRow} styles={styles} onSave={handleSaveNew} onCancel={() => setNewRow(null)} />}

            {lineItems.length > 0 && (
              <tr className="bom-total-row">
                <td colSpan={3} style={{ textAlign: 'right' }}>Totals</td>
                <td>{grandQty}</td>
                <td></td>
                <td>${grandTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lineItems.length === 0 && !newRow && (
        <div className="empty-state" style={{ padding: '1.5rem' }}>
          <p>No line items yet. Click "Add Item" to start.</p>
        </div>
      )}
    </div>
  )
}

function EditRow({ item, styles, onSave, onCancel }) {
  const [data, setData] = useState({ ...item })
  const total = ((parseFloat(data.quantity) || 0) * (parseFloat(data.unit_price) || 0))

  return (
    <tr>
      <td>
        <select value={data.style_id || ''} onChange={e => setData({ ...data, style_id: e.target.value })} style={{ width: '100%' }}>
          <option value="">Select style...</option>
          {styles.map(s => <option key={s.id} value={s.id}>{s.style_number} - {s.name}</option>)}
        </select>
      </td>
      <td><input type="text" value={data.colorway || ''} onChange={e => setData({ ...data, colorway: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="text" value={data.size || ''} onChange={e => setData({ ...data, size: e.target.value })} style={{ width: 80 }} /></td>
      <td><input type="number" value={data.quantity || ''} onChange={e => setData({ ...data, quantity: e.target.value })} style={{ width: 70 }} /></td>
      <td><input type="number" step="0.01" value={data.unit_price || ''} onChange={e => setData({ ...data, unit_price: e.target.value })} style={{ width: 80 }} /></td>
      <td style={{ fontWeight: 600 }}>${total.toFixed(2)}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onSave(data)}><Save size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
      </td>
    </tr>
  )
}

function NewRow({ row, setRow, styles, onSave, onCancel }) {
  const total = ((parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0))

  return (
    <tr style={{ background: 'var(--primary-light)' }}>
      <td>
        <select value={row.style_id || ''} onChange={e => setRow({ ...row, style_id: e.target.value })} style={{ width: '100%' }}>
          <option value="">Select style...</option>
          {styles.map(s => <option key={s.id} value={s.id}>{s.style_number} - {s.name}</option>)}
        </select>
      </td>
      <td><input type="text" placeholder="Colorway" value={row.colorway || ''} onChange={e => setRow({ ...row, colorway: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="text" placeholder="Size" value={row.size || ''} onChange={e => setRow({ ...row, size: e.target.value })} style={{ width: 80 }} /></td>
      <td><input type="number" placeholder="Qty" value={row.quantity || ''} onChange={e => setRow({ ...row, quantity: e.target.value })} style={{ width: 70 }} /></td>
      <td><input type="number" step="0.01" placeholder="Price" value={row.unit_price || ''} onChange={e => setRow({ ...row, unit_price: e.target.value })} style={{ width: 80 }} /></td>
      <td style={{ fontWeight: 600 }}>${total.toFixed(2)}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-primary btn-sm" onClick={onSave}><Save size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
      </td>
    </tr>
  )
}
