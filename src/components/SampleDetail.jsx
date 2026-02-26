import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { getSample, updateSample } from '../lib/supabase'
import { SAMPLE_ROUNDS, SAMPLE_STATUSES } from '../lib/constants'
import MeasurementTable from './MeasurementTable'
import PhotoGallery from './PhotoGallery'
import SampleForm from './SampleForm'
import CommentThread from './CommentThread'
import { useToast } from '../contexts/ToastContext'
import { X, Edit, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

export default function SampleDetail({ sampleId, onClose, onUpdate }) {
  const { currentPerson } = useApp()
  const [sample, setSample] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [showEdit, setShowEdit] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadSample()
  }, [sampleId])

  async function loadSample() {
    setLoading(true)
    try {
      const data = await getSample(sampleId)
      setSample(data)
      setReviewNotes(data.review_notes || '')
    } catch (err) {
      console.error('Failed to load sample:', err)
      toast.error('Failed to load sample')
    } finally {
      setLoading(false)
    }
  }

  async function handleMeasurementsSave(measurements) {
    setSaving(true)
    try {
      const updated = await updateSample(sample.id, { measurements })
      setSample(updated)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to save measurements:', err)
      toast.error('Failed to save measurements')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotosChange(photos) {
    try {
      const updated = await updateSample(sample.id, { photos })
      setSample(updated)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to update photos:', err)
      toast.error('Failed to update photos')
    }
  }

  async function handleReview(action) {
    setSaving(true)
    try {
      const updates = {
        review_notes: reviewNotes,
        reviewed_by: currentPerson?.id || null,
        reviewed_date: new Date().toISOString().split('T')[0],
      }

      if (action === 'approve') {
        updates.status = 'approved'
      } else if (action === 'reject') {
        updates.status = 'rejected'
      } else if (action === 'revise') {
        updates.status = 'revised'
      }

      const updated = await updateSample(sample.id, updates)
      setSample(updated)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to review sample:', err)
      toast.error('Failed to submit review')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="loading-container"><div className="loading-spinner" /></div>
        </div>
      </div>
    )
  }

  if (!sample) return null

  const round = SAMPLE_ROUNDS.find(r => r.value === sample.round)
  const status = SAMPLE_STATUSES.find(s => s.value === sample.status)

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2>
                {sample.styles?.style_number} — {round?.label} #{sample.round_number}
              </h2>
              <span className="badge" style={{ background: round?.color || '#e5e7eb', color: '#1f2937' }}>
                {status?.label || sample.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                <Edit size={14} /> Edit
              </button>
              <button className="modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="tabs" style={{ padding: '0 1.25rem', marginBottom: 0 }}>
            <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Details</button>
            <button className={`tab ${activeTab === 'measurements' ? 'active' : ''}`} onClick={() => setActiveTab('measurements')}>Measurements</button>
            <button className={`tab ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>Photos {sample.photos?.length ? `(${sample.photos.length})` : ''}</button>
            <button className={`tab ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>Review</button>
            <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Comments</button>
          </div>

          <div className="modal-body" style={{ minHeight: 300 }}>
            {activeTab === 'details' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="meta-item"><span className="meta-label">Style</span><span className="meta-value">{sample.styles?.style_number} - {sample.styles?.name}</span></div>
                  <div className="meta-item"><span className="meta-label">Supplier</span><span className="meta-value">{sample.suppliers?.name || '-'}</span></div>
                  <div className="meta-item"><span className="meta-label">Round</span><span className="meta-value">{round?.label} #{sample.round_number}</span></div>
                  <div className="meta-item"><span className="meta-label">Status</span><span className="meta-value">{status?.label || sample.status}</span></div>
                  <div className="meta-item"><span className="meta-label">Colorway</span><span className="meta-value">{sample.colorway || '-'}</span></div>
                  <div className="meta-item"><span className="meta-label">Size</span><span className="meta-value">{sample.size || '-'}</span></div>
                  <div className="meta-item"><span className="meta-label">Assigned To</span><span className="meta-value">{sample.people?.name || '-'}</span></div>
                  <div className="meta-item"><span className="meta-label">Tracking</span><span className="meta-value">{sample.tracking_number || '-'} {sample.courier ? `(${sample.courier})` : ''}</span></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                  <div className="meta-item"><span className="meta-label">Requested</span><span className="meta-value">{sample.requested_date || '-'}</span></div>
                  <div className="meta-item"><span className="meta-label">Expected</span><span className="meta-value">{sample.expected_date || '-'}</span></div>
                  <div className="meta-item"><span className="meta-label">Received</span><span className="meta-value">{sample.received_date || '-'}</span></div>
                </div>

                {sample.notes && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <span className="meta-label">Notes</span>
                    <p style={{ marginTop: '0.25rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{sample.notes}</p>
                  </div>
                )}
                {sample.fit_comments && (
                  <div style={{ marginTop: '1rem' }}>
                    <span className="meta-label">Fit Comments</span>
                    <p style={{ marginTop: '0.25rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap' }}>{sample.fit_comments}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'measurements' && (
              <div>
                <MeasurementTable
                  measurements={sample.measurements || []}
                  onChange={handleMeasurementsSave}
                />
                {saving && <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>Saving...</p>}
              </div>
            )}

            {activeTab === 'photos' && (
              <PhotoGallery
                photos={sample.photos || []}
                sampleId={sample.id}
                onPhotosChange={handlePhotosChange}
              />
            )}

            {activeTab === 'comments' && (
              <CommentThread entityType="sample" entityId={sample.id} />
            )}

            {activeTab === 'review' && (
              <div>
                {sample.reviewed_by && (
                  <div className="card" style={{ marginBottom: '1rem', background: 'var(--gray-50)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="meta-label">Reviewed By</span>
                        <div className="meta-value">{sample.reviewer?.name || 'Unknown'}</div>
                      </div>
                      <div>
                        <span className="meta-label">Date</span>
                        <div className="meta-value">{sample.reviewed_date || '-'}</div>
                      </div>
                      <span className="badge" style={{
                        background: sample.status === 'approved' ? 'var(--success-light)' : sample.status === 'rejected' ? 'var(--danger-light)' : 'var(--warning-light)',
                        color: sample.status === 'approved' ? 'var(--success)' : sample.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                      }}>
                        {status?.label || sample.status}
                      </span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Review Notes</label>
                  <textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Enter review notes, fit comments, revision requests..."
                    rows={4}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleReview('approve')}
                    disabled={saving}
                    style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReview('reject')}
                    disabled={saving}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleReview('revise')}
                    disabled={saving}
                    style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                  >
                    <RotateCcw size={16} /> Request Revision
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <SampleForm
          sample={sample}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); loadSample(); onUpdate?.() }}
        />
      )}
    </>
  )
}
