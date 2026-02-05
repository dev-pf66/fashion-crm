import { useState, useEffect } from 'react'
import { getSamplesForStyle } from '../lib/supabase'
import { SAMPLE_ROUNDS, SAMPLE_STATUSES } from '../lib/constants'
import SampleForm from './SampleForm'
import SampleDetail from './SampleDetail'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

export default function SampleTimeline({ styleId }) {
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedRound, setExpandedRound] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedSampleId, setSelectedSampleId] = useState(null)

  useEffect(() => {
    loadSamples()
  }, [styleId])

  async function loadSamples() {
    setLoading(true)
    try {
      const data = await getSamplesForStyle(styleId)
      setSamples(data || [])
    } catch (err) {
      console.error('Failed to load samples:', err)
    } finally {
      setLoading(false)
    }
  }

  function getRoundState(roundValue) {
    const roundSamples = samples.filter(s => s.round === roundValue)
    if (roundSamples.length === 0) return 'none'
    const allApproved = roundSamples.every(s => s.status === 'approved')
    if (allApproved) return 'completed'
    return 'active'
  }

  function toggleRound(roundValue) {
    setExpandedRound(prev => prev === roundValue ? null : roundValue)
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Sample Rounds</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Sample
        </button>
      </div>

      {samples.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No samples for this style yet.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add First Sample
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="sample-timeline-track">
            {SAMPLE_ROUNDS.map((round, idx) => {
              const state = getRoundState(round.value)
              const roundSamples = samples.filter(s => s.round === round.value)
              const isExpanded = expandedRound === round.value

              return (
                <div key={round.value} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                  <div
                    className={`sample-timeline-node ${state}`}
                    onClick={() => roundSamples.length > 0 && toggleRound(round.value)}
                  >
                    <div className="sample-timeline-dot">
                      {roundSamples.length || ''}
                    </div>
                    <div className="sample-timeline-label">{round.label}</div>
                    {roundSamples.length > 0 && (
                      <div className="sample-timeline-count">
                        {roundSamples.length} sample{roundSamples.length !== 1 ? 's' : ''}
                        {isExpanded ? <ChevronUp size={12} style={{ marginLeft: 2 }} /> : <ChevronDown size={12} style={{ marginLeft: 2 }} />}
                      </div>
                    )}
                  </div>
                  {idx < SAMPLE_ROUNDS.length - 1 && (
                    <div className={`sample-timeline-connector ${state === 'completed' ? 'completed' : ''}`} />
                  )}
                </div>
              )
            })}
          </div>

          {expandedRound && (
            <div className="sample-timeline-expanded">
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                {SAMPLE_ROUNDS.find(r => r.value === expandedRound)?.label} Samples
              </h4>
              {samples.filter(s => s.round === expandedRound).map(sample => {
                const status = SAMPLE_STATUSES.find(st => st.value === sample.status)
                return (
                  <div
                    key={sample.id}
                    className="sample-timeline-item"
                    onClick={() => setSelectedSampleId(sample.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="badge" style={{
                        background: sample.status === 'approved' ? 'var(--success-light)' :
                          sample.status === 'rejected' ? 'var(--danger-light)' : 'var(--gray-100)',
                        color: sample.status === 'approved' ? 'var(--success)' :
                          sample.status === 'rejected' ? 'var(--danger)' : 'var(--gray-600)',
                      }}>
                        {status?.label || sample.status}
                      </span>
                      <span className="text-sm">
                        #{sample.round_number}
                        {sample.colorway && ` - ${sample.colorway}`}
                        {sample.size && ` (${sample.size})`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {sample.people?.name && (
                        <span className="text-sm text-muted">{sample.people.name}</span>
                      )}
                      {sample.expected_date && (
                        <span className="text-sm text-muted">
                          Due {new Date(sample.expected_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {sample.photos?.length > 0 && (
                        <span className="tag">{sample.photos.length} photos</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showForm && (
        <SampleForm
          styleId={styleId}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadSamples() }}
        />
      )}

      {selectedSampleId && (
        <SampleDetail
          sampleId={selectedSampleId}
          onClose={() => setSelectedSampleId(null)}
          onUpdate={loadSamples}
        />
      )}
    </div>
  )
}
