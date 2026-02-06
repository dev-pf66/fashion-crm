import { useState, useCallback } from 'react'

export default function useStickyFilters(key, defaultFilters) {
  const storageKey = `filters_${key}`

  const [filters, setFiltersState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to handle new filter keys
        return { ...defaultFilters, ...parsed }
      }
    } catch {}
    return defaultFilters
  })

  const setFilters = useCallback((updater) => {
    setFiltersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [storageKey])

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {}
  }, [storageKey, defaultFilters])

  return [filters, setFilters, resetFilters]
}
