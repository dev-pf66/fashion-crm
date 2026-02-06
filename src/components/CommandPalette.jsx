import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeason } from '../contexts/SeasonContext'
import { globalSearch } from '../lib/supabase'
import { Search, Scissors, Factory, ClipboardList, FlaskConical, Users, X } from 'lucide-react'

const ICON_MAP = {
  style: Scissors,
  supplier: Factory,
  purchase_order: ClipboardList,
  sample: FlaskConical,
  person: Users,
}

const QUICK_LINKS = [
  { label: 'Dashboard', path: '/', section: 'Pages' },
  { label: 'Styles', path: '/styles', section: 'Pages' },
  { label: 'Suppliers', path: '/suppliers', section: 'Pages' },
  { label: 'Orders', path: '/orders', section: 'Pages' },
  { label: 'Materials', path: '/materials', section: 'Pages' },
  { label: 'Samples', path: '/samples', section: 'Pages' },
  { label: 'Team', path: '/team', section: 'Pages' },
  { label: 'Activity', path: '/activity', section: 'Pages' },
  { label: 'Help', path: '/help', section: 'Pages' },
]

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { currentSeason } = useSeason()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await globalSearch(query.trim(), currentSeason?.id)
        setResults(data)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query, currentSeason?.id])

  const allItems = query.trim()
    ? results
    : QUICK_LINKS.map(l => ({ type: 'page', label: l.label, path: l.path }))

  const handleSelect = useCallback((item) => {
    onClose()
    if (item.path) {
      navigate(item.path)
    } else if (item.type === 'style') {
      navigate(`/styles/${item.id}`)
    } else if (item.type === 'supplier') {
      navigate(`/suppliers/${item.id}`)
    } else if (item.type === 'purchase_order') {
      navigate(`/orders/${item.id}`)
    } else if (item.type === 'person') {
      navigate('/team')
    } else if (item.type === 'sample') {
      navigate('/samples')
    }
  }, [navigate, onClose])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(allItems[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-wrap">
          <Search size={16} className="command-palette-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search styles, suppliers, orders, people..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="command-palette-input"
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>

        <div className="command-palette-results">
          {loading && <div className="command-palette-loading">Searching...</div>}

          {!loading && allItems.length === 0 && query.trim() && (
            <div className="command-palette-empty">No results found</div>
          )}

          {!loading && allItems.map((item, i) => {
            const Icon = ICON_MAP[item.type] || Search
            return (
              <div
                key={`${item.type}-${item.id || item.label}-${i}`}
                className={`command-palette-item ${i === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon size={14} />
                <div className="command-palette-item-content">
                  <span className="command-palette-item-label">{item.label}</span>
                  {item.sub && <span className="command-palette-item-sub">{item.sub}</span>}
                </div>
                <span className="command-palette-item-type">{item.type === 'page' ? '' : item.type?.replace('_', ' ')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
