import { useState, useMemo } from 'react'

const PAGE_SIZE = 50

export default function usePagination(items, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safeCurrentPage = Math.min(page, totalPages)

  const paged = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safeCurrentPage, pageSize])

  // Reset to page 1 when items change significantly (e.g. filter)
  const resetPage = () => setPage(1)

  return {
    paged,
    page: safeCurrentPage,
    totalPages,
    totalItems: items.length,
    setPage,
    resetPage,
    hasPrev: safeCurrentPage > 1,
    hasNext: safeCurrentPage < totalPages,
    pageSize,
  }
}

export function PaginationBar({ page, totalPages, totalItems, setPage, hasPrev, hasNext, pageSize }) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      fontSize: '0.8125rem',
      color: 'var(--gray-500)',
      borderTop: '1px solid var(--gray-100)',
    }}>
      <span>{start}–{end} of {totalItems}</span>
      <div style={{ display: 'flex', gap: '0.375rem' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage(page - 1)}
          disabled={!hasPrev}
        >
          ← Prev
        </button>
        <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
          {page} / {totalPages}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage(page + 1)}
          disabled={!hasNext}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
