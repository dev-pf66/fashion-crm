import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

const DEFAULT_POINTS = [
  'Chest', 'Waist', 'Hip', 'Length', 'Sleeve',
  'Shoulder', 'Neck', 'Inseam', 'Thigh', 'Rise',
]

export default function MeasurementTable({ measurements = [], onChange, readOnly = false }) {
  const [rows, setRows] = useState(() => {
    if (measurements.length > 0) return measurements
    return DEFAULT_POINTS.map(point => ({ point, spec: '', actual: '', tolerance: '0.5' }))
  })

  function updateRow(index, field, value) {
    const updated = rows.map((r, i) => i === index ? { ...r, [field]: value } : r)
    setRows(updated)
    onChange?.(updated)
  }

  function addRow() {
    const updated = [...rows, { point: '', spec: '', actual: '', tolerance: '0.5' }]
    setRows(updated)
    onChange?.(updated)
  }

  function removeRow(index) {
    const updated = rows.filter((_, i) => i !== index)
    setRows(updated)
    onChange?.(updated)
  }

  function getPassFail(row) {
    const spec = parseFloat(row.spec)
    const actual = parseFloat(row.actual)
    const tolerance = parseFloat(row.tolerance)
    if (isNaN(spec) || isNaN(actual)) return null
    const diff = Math.abs(actual - spec)
    const tol = isNaN(tolerance) ? 0.5 : tolerance
    return diff <= tol
  }

  function getDiff(row) {
    const spec = parseFloat(row.spec)
    const actual = parseFloat(row.actual)
    if (isNaN(spec) || isNaN(actual)) return null
    return (actual - spec).toFixed(2)
  }

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="measurement-table">
          <thead>
            <tr>
              <th>Point</th>
              <th>Spec</th>
              <th>Actual</th>
              <th>Tolerance</th>
              <th>Diff</th>
              <th>Result</th>
              {!readOnly && <th style={{ width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pass = getPassFail(row)
              const diff = getDiff(row)
              return (
                <tr key={i}>
                  <td>
                    {readOnly ? (
                      <span style={{ fontWeight: 500 }}>{row.point}</span>
                    ) : (
                      <input
                        type="text"
                        value={row.point}
                        onChange={e => updateRow(i, 'point', e.target.value)}
                        placeholder="Measurement point"
                        style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 500 }}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      row.spec || '-'
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        value={row.spec}
                        onChange={e => updateRow(i, 'spec', e.target.value)}
                        placeholder="—"
                        style={{ width: 70 }}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      row.actual || '-'
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        value={row.actual}
                        onChange={e => updateRow(i, 'actual', e.target.value)}
                        placeholder="—"
                        style={{ width: 70 }}
                      />
                    )}
                  </td>
                  <td>
                    {readOnly ? (
                      row.tolerance || '0.5'
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        value={row.tolerance}
                        onChange={e => updateRow(i, 'tolerance', e.target.value)}
                        style={{ width: 60 }}
                      />
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                    {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '-'}
                  </td>
                  <td>
                    {pass === null ? (
                      <span className="text-muted text-sm">—</span>
                    ) : pass ? (
                      <span className="measurement-pass">PASS</span>
                    ) : (
                      <span className="measurement-fail">FAIL</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeRow(i)}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginTop: '0.75rem' }}>
          <Plus size={14} /> Add Measurement
        </button>
      )}
    </div>
  )
}
