export function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="skeleton skeleton-text lg" />
        <div className="skeleton skeleton-text sm" style={{ marginTop: '0.25rem' }} />
      </div>
      <div className="skeleton-stat-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-text sm" />
            <div className="skeleton skeleton-text xl" style={{ marginTop: '0.5rem' }} />
            <div className="skeleton skeleton-text sm" style={{ marginTop: '0.5rem' }} />
          </div>
        ))}
      </div>
      <div className="skeleton-row">
        <div className="skeleton-card">
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div className="skeleton skeleton-text sm" style={{ width: '25%', marginBottom: 0 }} />
              <div className="skeleton" style={{ flex: 1, height: 12, borderRadius: 6 }} />
              <div className="skeleton skeleton-text sm" style={{ width: '10%', marginBottom: 0 }} />
            </div>
          ))}
        </div>
        <div className="skeleton-card">
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div className="skeleton skeleton-text sm" style={{ width: '25%', marginBottom: 0 }} />
              <div className="skeleton" style={{ flex: 1, height: 12, borderRadius: 6 }} />
              <div className="skeleton skeleton-text sm" style={{ width: '10%', marginBottom: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="skeleton skeleton-text lg" />
        <div className="skeleton skeleton-text sm" style={{ marginTop: '0.25rem' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="skeleton skeleton-img" />
            <div style={{ padding: '0.75rem' }}>
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text sm" />
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 10 }} />
                <div className="skeleton" style={{ width: 40, height: 20, borderRadius: 10 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="skeleton skeleton-text lg" />
        <div className="skeleton skeleton-text sm" style={{ marginTop: '0.25rem' }} />
      </div>
      <div className="skeleton-card" style={{ padding: 0 }}>
        <div className="skeleton-table-row" style={{ background: 'var(--gray-50)' }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text sm" style={{ marginBottom: 0 }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-table-row">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="skeleton skeleton-text" style={{ marginBottom: 0, width: `${50 + Math.random() * 40}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function KanbanSkeleton({ columns = 4 }) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="skeleton skeleton-text lg" />
        <div className="skeleton skeleton-text sm" style={{ marginTop: '0.25rem' }} />
      </div>
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} style={{ minWidth: 260, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div className="skeleton skeleton-text" style={{ width: 80, marginBottom: 0 }} />
              <div className="skeleton" style={{ width: 24, height: 20, borderRadius: 10 }} />
            </div>
            {Array.from({ length: 2 + Math.floor(Math.random() * 2) }).map((_, j) => (
              <div key={j} className="skeleton-card" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
                <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                <div className="skeleton skeleton-text sm" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <div className="skeleton" style={{ width: 50, height: 16, borderRadius: 8 }} />
                  <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
