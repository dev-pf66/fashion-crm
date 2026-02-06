import { useState, useRef, useEffect } from 'react'

const STATUS_CONFIG = {
  concept: { label: 'Concept', bg: '#e0e7ff', color: '#4338ca' },
  development: { label: 'Development', bg: '#dbeafe', color: '#1d4ed8' },
  sampling: { label: 'Sampling', bg: '#fef3c7', color: '#b45309' },
  costing: { label: 'Costing', bg: '#fce7f3', color: '#be185d' },
  approved: { label: 'Approved', bg: '#dcfce7', color: '#15803d' },
  production: { label: 'Production', bg: '#cffafe', color: '#0e7490' },
  shipped: { label: 'Shipped', bg: '#e0e7ff', color: '#4338ca' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' },
  active: { label: 'Active', bg: '#dcfce7', color: '#15803d' },
  pending_approval: { label: 'Pending', bg: '#fef3c7', color: '#b45309' },
  inactive: { label: 'Inactive', bg: '#f3f4f6', color: '#4b5563' },
  blacklisted: { label: 'Blacklisted', bg: '#fee2e2', color: '#b91c1c' },
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#4b5563' },
  issued: { label: 'Issued', bg: '#dbeafe', color: '#1d4ed8' },
  confirmed: { label: 'Confirmed', bg: '#dcfce7', color: '#15803d' },
  in_production: { label: 'In Production', bg: '#cffafe', color: '#0e7490' },
  received: { label: 'Received', bg: '#d1fae5', color: '#047857' },
  requested: { label: 'Requested', bg: '#f3f4f6', color: '#4b5563' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
  under_review: { label: 'Under Review', bg: '#fef3c7', color: '#b45309' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c' },
  revised: { label: 'Revised', bg: '#fce7f3', color: '#be185d' },
}

export default function InlineStatusSelect({ status, statuses, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const config = STATUS_CONFIG[status] || { label: status, bg: '#f3f4f6', color: '#4b5563' }

  function handleSelect(value) {
    if (value !== status) {
      onChange(value)
    }
    setOpen(false)
  }

  return (
    <div className="inline-status-select" ref={ref}>
      <button
        className="inline-status-trigger"
        style={{ background: config.bg, color: config.color }}
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
      >
        {config.label}
      </button>
      {open && (
        <div className="inline-status-dropdown" onClick={e => e.stopPropagation()}>
          {statuses.map(s => {
            const sc = STATUS_CONFIG[s.value] || { label: s.label, bg: '#f3f4f6', color: '#4b5563' }
            return (
              <button
                key={s.value}
                className={`inline-status-option ${s.value === status ? 'current' : ''}`}
                onClick={() => handleSelect(s.value)}
              >
                <span className="inline-status-dot" style={{ background: sc.color }} />
                {s.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
