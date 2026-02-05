const STATUS_CONFIG = {
  // Style statuses
  concept: { label: 'Concept', bg: '#e0e7ff', color: '#4338ca' },
  development: { label: 'Development', bg: '#dbeafe', color: '#1d4ed8' },
  sampling: { label: 'Sampling', bg: '#fef3c7', color: '#b45309' },
  costing: { label: 'Costing', bg: '#fce7f3', color: '#be185d' },
  approved: { label: 'Approved', bg: '#dcfce7', color: '#15803d' },
  production: { label: 'Production', bg: '#cffafe', color: '#0e7490' },
  shipped: { label: 'Shipped', bg: '#e0e7ff', color: '#4338ca' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' },
  // Supplier statuses
  active: { label: 'Active', bg: '#dcfce7', color: '#15803d' },
  pending_approval: { label: 'Pending', bg: '#fef3c7', color: '#b45309' },
  inactive: { label: 'Inactive', bg: '#f3f4f6', color: '#4b5563' },
  blacklisted: { label: 'Blacklisted', bg: '#fee2e2', color: '#b91c1c' },
  // PO statuses
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#4b5563' },
  issued: { label: 'Issued', bg: '#dbeafe', color: '#1d4ed8' },
  confirmed: { label: 'Confirmed', bg: '#dcfce7', color: '#15803d' },
  in_production: { label: 'In Production', bg: '#cffafe', color: '#0e7490' },
  received: { label: 'Received', bg: '#d1fae5', color: '#047857' },
  // Sample statuses
  requested: { label: 'Requested', bg: '#f3f4f6', color: '#4b5563' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
  under_review: { label: 'Under Review', bg: '#fef3c7', color: '#b45309' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c' },
  revised: { label: 'Revised', bg: '#fce7f3', color: '#be185d' },
  // Inspection
  scheduled: { label: 'Scheduled', bg: '#f3f4f6', color: '#4b5563' },
  pass: { label: 'Pass', bg: '#dcfce7', color: '#15803d' },
  fail: { label: 'Fail', bg: '#fee2e2', color: '#b91c1c' },
  conditional_pass: { label: 'Conditional', bg: '#fef3c7', color: '#b45309' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, bg: '#f3f4f6', color: '#4b5563' }
  return (
    <span className="badge" style={{ background: config.bg, color: config.color }}>
      {config.label}
    </span>
  )
}
