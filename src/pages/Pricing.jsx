import { useState, useEffect, useMemo } from 'react'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { getPricingPieces, getSuppliers, updateRangeStyle } from '../lib/supabase'
import { ListSkeleton } from '../components/PageSkeleton'
import { IndianRupee, Search, ChevronDown, ChevronRight } from 'lucide-react'

const HOME_CODE = 'HOME'

function fmtMoney(n) {
  if (n == null || n === '' || isNaN(n)) return '—'
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default function Pricing() {
  const { currentDivision } = useDivision()
  const toast = useToast()
  const [pieces, setPieces] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const isHome = currentDivision?.code === HOME_CODE

  useEffect(() => {
    if (!currentDivision?.id || !isHome) { setLoading(false); return }
    loadData()
  }, [currentDivision?.id, isHome])

  async function loadData() {
    setLoading(true)
    try {
      const [piecesData, supplierData] = await Promise.all([
        getPricingPieces(currentDivision.id),
        getSuppliers(),
      ])
      setPieces(piecesData)
      setSuppliers(supplierData || [])
    } catch (err) {
      console.error('Failed to load pricing:', err)
      toast.error('Failed to load pricing table')
    } finally {
      setLoading(false)
    }
  }

  // Optimistic field update — persists the single changed field.
  async function saveField(pieceId, field, value) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, [field]: value } : p))
    try {
      await updateRangeStyle(pieceId, { [field]: value })
    } catch (err) {
      console.error('Failed to save pricing field:', err)
      toast.error('Failed to save')
      loadData()
    }
  }

  const filtered = useMemo(() => {
    if (!search) return pieces
    const q = search.toLowerCase()
    return pieces.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.ranges?.name?.toLowerCase().includes(q)
    )
  }, [pieces, search])

  const grouped = useMemo(() => {
    const byRange = {}
    filtered.forEach(p => {
      const key = p.ranges?.name || 'Unassigned'
      if (!byRange[key]) byRange[key] = []
      byRange[key].push(p)
    })
    return Object.entries(byRange).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const grandTotal = useMemo(
    () => filtered.reduce((sum, p) => sum + (Number(p.production_qty) || 0) * (Number(p.price_per_piece) || 0), 0),
    [filtered]
  )

  if (!isHome) {
    return (
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><IndianRupee size={22} /> Pricing</h1>
        <p className="empty-state">Pricing is only available in the Home division. Switch to Home from the division selector.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><IndianRupee size={22} /> Pricing</h1>
          <p className="page-subtitle">
            {filtered.length} piece{filtered.length !== 1 ? 's' : ''} across {grouped.length} range{grouped.length !== 1 ? 's' : ''}
            {grandTotal > 0 && <> &middot; <strong>{fmtMoney(grandTotal)}</strong> total</>}
          </p>
        </div>
      </div>

      <div className="rp-search" style={{ maxWidth: 320, marginBottom: '1rem' }}>
        <Search size={14} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pieces, categories, ranges..."
        />
      </div>

      {loading ? (
        <ListSkeleton rows={8} />
      ) : grouped.length === 0 ? (
        <div className="card"><div className="empty-state">
          <IndianRupee size={48} />
          <h3>No pieces to price</h3>
          <p>Add pieces to your Home ranges to price them here.</p>
        </div></div>
      ) : (
        grouped.map(([rangeName, rangerows]) => {
          const isCollapsed = collapsed[rangeName]
          const rangeTotal = rangerows.reduce((s, p) => s + (Number(p.production_qty) || 0) * (Number(p.price_per_piece) || 0), 0)
          return (
            <div key={rangeName} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setCollapsed(c => ({ ...c, [rangeName]: !c[rangeName] }))}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0.875rem 1rem', background: 'var(--gray-50)', border: 'none', borderBottom: isCollapsed ? 'none' : '1px solid var(--gray-200)', cursor: 'pointer', textAlign: 'left' }}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span style={{ fontWeight: 600 }}>{rangeName}</span>
                <span className="text-muted text-sm">{rangerows.length} piece{rangerows.length !== 1 ? 's' : ''}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.875rem' }}>{fmtMoney(rangeTotal)}</span>
              </button>

              {!isCollapsed && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>Piece</th>
                        <th>Category</th>
                        <th style={{ minWidth: 180 }}>Supplier</th>
                        <th style={{ width: 110 }}>Quantity</th>
                        <th style={{ width: 140 }}>Price / piece</th>
                        <th style={{ width: 130, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rangerows.map(p => {
                        const lineTotal = (Number(p.production_qty) || 0) * (Number(p.price_per_piece) || 0)
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td className="text-muted">{p.category || '—'}</td>
                            <td>
                              <select
                                value={p.supplier_id || ''}
                                onChange={e => saveField(p.id, 'supplier_id', e.target.value ? parseInt(e.target.value) : null)}
                                style={{ width: '100%', fontSize: '0.8125rem' }}
                              >
                                <option value="">No supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={p.production_qty ?? ''}
                                onChange={e => setPieces(prev => prev.map(x => x.id === p.id ? { ...x, production_qty: e.target.value } : x))}
                                onBlur={e => saveField(p.id, 'production_qty', e.target.value ? parseInt(e.target.value) : 0)}
                                style={{ width: '100%', fontSize: '0.8125rem' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={p.price_per_piece ?? ''}
                                placeholder="₹"
                                onChange={e => setPieces(prev => prev.map(x => x.id === p.id ? { ...x, price_per_piece: e.target.value } : x))}
                                onBlur={e => saveField(p.id, 'price_per_piece', e.target.value === '' ? null : parseFloat(e.target.value))}
                                style={{ width: '100%', fontSize: '0.8125rem' }}
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.8125rem' }}>
                              {lineTotal > 0 ? fmtMoney(lineTotal) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
