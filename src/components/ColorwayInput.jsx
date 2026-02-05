import { Plus, X } from 'lucide-react'

export default function ColorwayInput({ colorways, onChange }) {
  function addColorway() {
    onChange([...colorways, { code: '', name: '', hex: '#000000' }])
  }

  function updateColorway(index, field, value) {
    const updated = colorways.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    )
    onChange(updated)
  }

  function removeColorway(index) {
    onChange(colorways.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="colorway-list">
        {colorways.map((c, i) => (
          <div key={i} className="colorway-item">
            <input
              type="color"
              value={c.hex || '#000000'}
              onChange={e => updateColorway(i, 'hex', e.target.value)}
            />
            <input
              type="text"
              value={c.code}
              onChange={e => updateColorway(i, 'code', e.target.value)}
              placeholder="Code (e.g. BLK)"
              style={{ width: '100px' }}
            />
            <input
              type="text"
              value={c.name}
              onChange={e => updateColorway(i, 'name', e.target.value)}
              placeholder="Name (e.g. Black)"
            />
            <button type="button" className="remove-btn" onClick={() => removeColorway(i)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={addColorway} style={{ marginTop: '0.5rem' }}>
        <Plus size={14} /> Add Colorway
      </button>
    </div>
  )
}
