import { SAMPLE_ROUNDS } from '../lib/constants'
import { ImageOff, Clock } from 'lucide-react'

export default function SampleCard({ sample, onClick }) {
  const round = SAMPLE_ROUNDS.find(r => r.value === sample.round)
  const isOverdue = sample.expected_date
    && new Date(sample.expected_date) < new Date()
    && !['approved', 'rejected'].includes(sample.status)
  const assignee = sample.people

  const initials = assignee
    ? assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <div className="sample-card" onClick={onClick}>
      <div className="sample-card-header">
        <div className="sample-card-thumbnail">
          {sample.styles?.thumbnail_url
            ? <img src={sample.styles.thumbnail_url} alt="" />
            : <ImageOff size={16} />
          }
        </div>
        <div>
          <div className="sample-card-style-number">{sample.styles?.style_number}</div>
          <div className="sample-card-style-name">{sample.styles?.name}</div>
        </div>
      </div>

      <div className="sample-card-meta">
        <span className="badge" style={{ background: round?.color || '#e5e7eb', color: '#1f2937', fontSize: '0.625rem' }}>
          {round?.label || sample.round} #{sample.round_number}
        </span>
        {sample.colorway && <span className="text-sm text-muted">{sample.colorway}</span>}
      </div>

      {sample.suppliers?.name && (
        <div className="sample-card-supplier text-sm text-muted">{sample.suppliers.name}</div>
      )}

      <div className="sample-card-footer">
        {sample.expected_date && (
          <span className={`sample-card-date ${isOverdue ? 'overdue' : ''}`}>
            <Clock size={12} />
            {new Date(sample.expected_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {initials && (
          <div className="assignee-avatar" title={assignee.name}>{initials}</div>
        )}
      </div>
    </div>
  )
}
