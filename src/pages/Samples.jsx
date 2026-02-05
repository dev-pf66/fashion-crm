import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useSeason } from '../contexts/SeasonContext'
import { getSamples, getSuppliers } from '../lib/supabase'
import { SAMPLE_STATUSES, SAMPLE_ROUNDS } from '../lib/constants'
import SampleCard from '../components/SampleCard'
import SampleForm from '../components/SampleForm'
import SampleDetail from '../components/SampleDetail'
import { Plus, FlaskConical } from 'lucide-react'

export default function Samples() {
  const { people } = useApp()
  const { currentSeason } = useSeason()
  const [samples, setSamples] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSampleId, setSelectedSampleId] = useState(null)

  const [filters, setFilters] = useState({
    search: '',
    round: '',
    status: '',
    supplier_id: '',
    assigned_to: '',
  })

  useEffect(() => {
    if (currentSeason) loadData()
  }, [currentSeason])

  async function loadData() {
    setLoading(true)
    try {
      const [samplesData, suppliersData] = await Promise.all([
        getSamples(currentSeason.id),
        getSuppliers({ status: 'active' }),
      ])
      setSamples(samplesData || [])
      setSuppliers(suppliersData || [])
    } catch (err) {
      console.error('Failed to load samples:', err)
    } finally {
      setLoading(false)
    }
  }

  function filterSamples(sampleList) {
    return sampleList.filter(s => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const match = (s.styles?.style_number || '').toLowerCase().includes(q)
          || (s.styles?.name || '').toLowerCase().includes(q)
          || (s.colorway || '').toLowerCase().includes(q)
        if (!match) return false
      }
      if (filters.round && s.round !== filters.round) return false
      if (filters.supplier_id && s.supplier_id !== filters.supplier_id) return false
      if (filters.assigned_to && s.assigned_to !== filters.assigned_to) return false
      return true
    })
  }

  const filtered = filterSamples(samples)

  const columns = SAMPLE_STATUSES.map(status => ({
    ...status,
    samples: filtered.filter(s => s.status === status.value),
  }))

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Samples</h1>
          <p className="subtitle">Track sample rounds across all styles</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Sample
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search styles, colorways..."
          value={filters.search}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        <select value={filters.round} onChange={e => setFilters(prev => ({ ...prev, round: e.target.value }))}>
          <option value="">All Rounds</option>
          {SAMPLE_ROUNDS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select value={filters.supplier_id} onChange={e => setFilters(prev => ({ ...prev, supplier_id: e.target.value }))}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={filters.assigned_to} onChange={e => setFilters(prev => ({ ...prev, assigned_to: e.target.value }))}>
          <option value="">All Assignees</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FlaskConical size={48} />
            <h3>No samples yet</h3>
            <p>Create a sample to start tracking rounds.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Sample
            </button>
          </div>
        </div>
      ) : (
        <div className="kanban-board">
          {columns.map(col => (
            <div key={col.value} className="kanban-column">
              <div className="kanban-column-header">
                <span>{col.label}</span>
                <span className="kanban-count">{col.samples.length}</span>
              </div>
              <div className="kanban-column-body">
                {col.samples.map(sample => (
                  <SampleCard
                    key={sample.id}
                    sample={sample}
                    onClick={() => setSelectedSampleId(sample.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SampleForm
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadData() }}
        />
      )}

      {selectedSampleId && (
        <SampleDetail
          sampleId={selectedSampleId}
          onClose={() => setSelectedSampleId(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}
