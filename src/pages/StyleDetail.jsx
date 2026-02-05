import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStyle, updateStyle } from '../lib/supabase'
import { STYLE_STATUSES } from '../lib/constants'
import StyleForm from '../components/StyleForm'
import BomTable from '../components/BomTable'
import { ArrowLeft, Edit, ImageOff } from 'lucide-react'

export default function StyleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [style, setStyle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => { loadStyle() }, [id])

  async function loadStyle() {
    setLoading(true)
    try {
      const data = await getStyle(id)
      setStyle(data)
    } catch (err) {
      console.error('Failed to load style:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      const updated = await updateStyle(style.id, { status: newStatus })
      setStyle(updated)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>
  if (!style) return <div className="card"><div className="empty-state"><h3>Style not found</h3></div></div>

  const colorways = style.colorways || []
  const sizeRun = style.size_run || {}

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => navigate('/styles')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Back to Styles
      </button>

      <div className="style-header">
        <div className="style-header-image">
          {style.thumbnail_url ? <img src={style.thumbnail_url} alt={style.name} /> : <ImageOff size={48} />}
        </div>
        <div className="style-header-info">
          <div className="style-header-top">
            <div>
              <div className="style-header-number">{style.style_number}</div>
              <div className="style-header-name">{style.name}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select value={style.status} onChange={e => handleStatusChange(e.target.value)} style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}>
                {STYLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                <Edit size={14} /> Edit
              </button>
            </div>
          </div>
          <div className="style-header-meta">
            <div className="meta-item"><span className="meta-label">Category</span><span className="meta-value">{style.category || '-'}</span></div>
            <div className="meta-item"><span className="meta-label">Supplier</span><span className="meta-value">{style.suppliers?.name || '-'}</span></div>
            <div className="meta-item"><span className="meta-label">Assigned To</span><span className="meta-value">{style.people?.name || '-'}</span></div>
            <div className="meta-item"><span className="meta-label">Target FOB</span><span className="meta-value">{style.target_fob ? `$${parseFloat(style.target_fob).toFixed(2)}` : '-'}</span></div>
            <div className="meta-item"><span className="meta-label">Target Retail</span><span className="meta-value">{style.target_retail ? `$${parseFloat(style.target_retail).toFixed(2)}` : '-'}</span></div>
            <div className="meta-item"><span className="meta-label">Target Margin</span><span className="meta-value">{style.target_margin ? `${style.target_margin}%` : '-'}</span></div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'bom' ? 'active' : ''}`} onClick={() => setActiveTab('bom')}>BOM</button>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Colorways</h3>
              {colorways.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {colorways.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="color-swatch" style={{ background: c.hex || '#ccc', width: 24, height: 24 }} />
                      <span style={{ fontWeight: 500 }}>{c.name || 'Unnamed'}</span>
                      {c.code && <span className="text-muted text-sm">({c.code})</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted text-sm">No colorways defined.</p>}
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Size Run</h3>
              {sizeRun.sizes && sizeRun.sizes.length > 0 ? (
                <div>
                  {sizeRun.range && <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>{sizeRun.range}</p>}
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {sizeRun.sizes.map((s, i) => <span key={i} className="tag">{s}</span>)}
                  </div>
                </div>
              ) : <p className="text-muted text-sm">No size run defined.</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Description</h3>
              <p style={{ color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{style.description || 'No description.'}</p>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Notes</h3>
              <p style={{ color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{style.notes || 'No notes.'}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Key Dates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
              <div className="meta-item"><span className="meta-label">Development Start</span><span className="meta-value">{style.development_start || '-'}</span></div>
              <div className="meta-item"><span className="meta-label">Target Delivery</span><span className="meta-value">{style.target_delivery || '-'}</span></div>
              <div className="meta-item"><span className="meta-label">Created</span><span className="meta-value">{new Date(style.created_at).toLocaleDateString()}</span></div>
              <div className="meta-item"><span className="meta-label">Updated</span><span className="meta-value">{new Date(style.updated_at).toLocaleDateString()}</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bom' && <BomTable styleId={style.id} />}

      {showEdit && (
        <StyleForm style={style} onClose={() => setShowEdit(false)} onSave={() => { setShowEdit(false); loadStyle() }} />
      )}
    </div>
  )
}
