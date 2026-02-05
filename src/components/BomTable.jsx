import { useState, useEffect } from 'react'
import { getBomItems, createBomItem, updateBomItem, deleteBomItem, getMaterials } from '../lib/supabase'
import { BOM_COMPONENTS, CONSUMPTION_UNITS } from '../lib/constants'
import { Plus, Trash2, Save } from 'lucide-react'

export default function BomTable({ styleId }) {
  const [items, setItems] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingRow, setEditingRow] = useState(null)
  const [newRow, setNewRow] = useState(null)

  useEffect(() => {
    loadData()
  }, [styleId])

  async function loadData() {
    setLoading(true)
    try {
      const [bomData, matData] = await Promise.all([
        getBomItems(styleId),
        getMaterials()
      ])
      setItems(bomData || [])
      setMaterials(matData || [])
    } catch (err) {
      console.error('Failed to load BOM:', err)
    } finally {
      setLoading(false)
    }
  }

  function startAdd() {
    setNewRow({
      style_id: styleId,
      component: '',
      material_id: '',
      material_name: '',
      material_description: '',
      placement: '',
      consumption: '',
      consumption_unit: 'yard',
      unit_price: '',
      supplier_id: '',
      notes: '',
      sort_order: items.length,
    })
  }

  function handleMaterialSelect(row, setRow, materialId) {
    if (materialId) {
      const mat = materials.find(m => m.id === materialId)
      if (mat) {
        setRow({
          ...row,
          material_id: materialId,
          material_name: mat.name,
          material_description: mat.composition || '',
          unit_price: mat.unit_price || '',
          supplier_id: mat.supplier_id || '',
        })
        return
      }
    }
    setRow({ ...row, material_id: '', material_name: '', material_description: '' })
  }

  async function handleSaveNew() {
    if (!newRow.component) return
    try {
      await createBomItem({
        ...newRow,
        material_id: newRow.material_id || null,
        supplier_id: newRow.supplier_id || null,
        consumption: newRow.consumption || null,
        unit_price: newRow.unit_price || null,
      })
      setNewRow(null)
      await loadData()
    } catch (err) {
      console.error('Failed to add BOM item:', err)
    }
  }

  async function handleSaveEdit(item) {
    try {
      await updateBomItem(item.id, {
        component: item.component,
        material_id: item.material_id || null,
        material_name: item.material_name,
        material_description: item.material_description,
        placement: item.placement,
        consumption: item.consumption || null,
        consumption_unit: item.consumption_unit,
        unit_price: item.unit_price || null,
        supplier_id: item.supplier_id || null,
        notes: item.notes,
      })
      setEditingRow(null)
      await loadData()
    } catch (err) {
      console.error('Failed to update BOM item:', err)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this BOM item?')) return
    try {
      await deleteBomItem(id)
      await loadData()
    } catch (err) {
      console.error('Failed to delete BOM item:', err)
    }
  }

  const totalCost = items.reduce((sum, item) => {
    const cost = (parseFloat(item.consumption) || 0) * (parseFloat(item.unit_price) || 0)
    return sum + cost
  }, 0)

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Bill of Materials</h3>
        <button className="btn btn-primary btn-sm" onClick={startAdd} disabled={!!newRow}>
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="bom-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Material</th>
              <th>Placement</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isEditing = editingRow === item.id
              const lineTotal = (parseFloat(item.consumption) || 0) * (parseFloat(item.unit_price) || 0)

              if (isEditing) {
                return (
                  <EditableRow
                    key={item.id}
                    row={item}
                    materials={materials}
                    onMaterialSelect={handleMaterialSelect}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingRow(null)}
                  />
                )
              }

              return (
                <tr key={item.id} onDoubleClick={() => setEditingRow(item.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{item.component}</td>
                  <td>
                    <div>{item.material_name || item.materials?.name || '-'}</div>
                    {item.material_description && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>{item.material_description}</div>
                    )}
                  </td>
                  <td>{item.placement || '-'}</td>
                  <td>{item.consumption || '-'}</td>
                  <td>{CONSUMPTION_UNITS.find(u => u.value === item.consumption_unit)?.label || item.consumption_unit}</td>
                  <td>{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</td>
                  <td style={{ fontWeight: 600 }}>{lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '-'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}

            {newRow && (
              <NewRow
                row={newRow}
                setRow={setNewRow}
                materials={materials}
                onMaterialSelect={handleMaterialSelect}
                onSave={handleSaveNew}
                onCancel={() => setNewRow(null)}
              />
            )}

            {items.length > 0 && (
              <tr className="bom-total-row">
                <td colSpan={6} style={{ textAlign: 'right' }}>Total Material Cost</td>
                <td>${totalCost.toFixed(2)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {items.length === 0 && !newRow && (
        <div className="empty-state">
          <p>No materials added yet. Click "Add Item" to build the BOM.</p>
        </div>
      )}
    </div>
  )
}

function EditableRow({ row, materials, onMaterialSelect, onSave, onCancel }) {
  const [data, setData] = useState({ ...row })

  return (
    <tr>
      <td>
        <select value={data.component} onChange={e => setData({ ...data, component: e.target.value })} style={{ width: '100%' }}>
          <option value="">Select...</option>
          {BOM_COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td>
        <select value={data.material_id || ''} onChange={e => onMaterialSelect(data, setData, e.target.value)} style={{ width: '100%' }}>
          <option value="">Custom / None</option>
          {materials.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
        </select>
        {!data.material_id && (
          <input type="text" placeholder="Material name" value={data.material_name} onChange={e => setData({ ...data, material_name: e.target.value })} style={{ marginTop: '0.25rem', width: '100%' }} />
        )}
      </td>
      <td><input type="text" value={data.placement || ''} onChange={e => setData({ ...data, placement: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="number" step="0.01" value={data.consumption || ''} onChange={e => setData({ ...data, consumption: e.target.value })} style={{ width: 70 }} /></td>
      <td>
        <select value={data.consumption_unit} onChange={e => setData({ ...data, consumption_unit: e.target.value })} style={{ width: 80 }}>
          {CONSUMPTION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </td>
      <td><input type="number" step="0.01" value={data.unit_price || ''} onChange={e => setData({ ...data, unit_price: e.target.value })} style={{ width: 80 }} /></td>
      <td style={{ fontWeight: 600 }}>
        ${((parseFloat(data.consumption) || 0) * (parseFloat(data.unit_price) || 0)).toFixed(2)}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onSave(data)} title="Save"><Save size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel} title="Cancel">✕</button>
        </div>
      </td>
    </tr>
  )
}

function NewRow({ row, setRow, materials, onMaterialSelect, onSave, onCancel }) {
  return (
    <tr style={{ background: 'var(--primary-light)' }}>
      <td>
        <select value={row.component} onChange={e => setRow({ ...row, component: e.target.value })} style={{ width: '100%' }}>
          <option value="">Select...</option>
          {BOM_COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td>
        <select value={row.material_id || ''} onChange={e => onMaterialSelect(row, setRow, e.target.value)} style={{ width: '100%' }}>
          <option value="">Custom / None</option>
          {materials.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
        </select>
        {!row.material_id && (
          <input type="text" placeholder="Material name" value={row.material_name} onChange={e => setRow({ ...row, material_name: e.target.value })} style={{ marginTop: '0.25rem', width: '100%' }} />
        )}
      </td>
      <td><input type="text" placeholder="Placement" value={row.placement || ''} onChange={e => setRow({ ...row, placement: e.target.value })} style={{ width: '100%' }} /></td>
      <td><input type="number" step="0.01" placeholder="Qty" value={row.consumption || ''} onChange={e => setRow({ ...row, consumption: e.target.value })} style={{ width: 70 }} /></td>
      <td>
        <select value={row.consumption_unit} onChange={e => setRow({ ...row, consumption_unit: e.target.value })} style={{ width: 80 }}>
          {CONSUMPTION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </td>
      <td><input type="number" step="0.01" placeholder="Price" value={row.unit_price || ''} onChange={e => setRow({ ...row, unit_price: e.target.value })} style={{ width: 80 }} /></td>
      <td style={{ fontWeight: 600 }}>
        ${((parseFloat(row.consumption) || 0) * (parseFloat(row.unit_price) || 0)).toFixed(2)}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-primary btn-sm" onClick={onSave}><Save size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
      </td>
    </tr>
  )
}
