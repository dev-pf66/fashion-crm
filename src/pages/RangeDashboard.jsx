import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../App'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../contexts/ToastContext'
import {
  getRanges,
  getMultiRangeDashboardData,
  getPriceBrackets,
  getDivisionCellTargets,
  upsertDivisionCellTarget,
} from '../lib/supabase'
import { useDivision } from '../contexts/DivisionContext'
import { BarChart3, Target, Users, AlertTriangle, TrendingUp, ChevronDown } from 'lucide-react'
import { DashboardSkeleton } from '../components/PageSkeleton'
import { thumbUrl } from '../lib/imgUrl'

export default function RangeDashboard() {
  const { currentPerson, people } = useApp()
  const { role, isAdmin } = usePermissions()
  const { addToast } = useToast()
  const { currentDivision } = useDivision()

  const [ranges, setRanges] = useState([])
  const [allStyles, setAllStyles] = useState([])
  const [stages, setStages] = useState([])
  const [priceBrackets, setPriceBrackets] = useState([])
  const [cellTargets, setCellTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedMerch, setExpandedMerch] = useState(null)

  useEffect(() => {
    loadAll()
  }, [currentDivision])

  async function loadAll() {
    setLoading(true)
    try {
      const rangeList = await getRanges(currentDivision?.id)
      setRanges(rangeList)
      const rangeIds = rangeList.map(r => r.id)
      const [dashData, brackets, targets] = await Promise.all([
        getMultiRangeDashboardData(rangeIds),
        getPriceBrackets(),
        getDivisionCellTargets(currentDivision?.id),
      ])
      setAllStyles(dashData.styles)
      setStages(dashData.stages)
      setPriceBrackets(brackets)
      setCellTargets(targets)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      addToast('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const completedStage = stages.find(s => s.name === 'Finishing')
  const today = new Date().toISOString().split('T')[0]

  // Aggregated stats across all ranges
  const totalPunched = allStyles.length
  const completedCount = allStyles.filter(s => s.production_stage_id === completedStage?.id).length
  const completionPct = totalPunched > 0 ? Math.round((completedCount / totalPunched) * 100) : 0
  const overdueStyles = allStyles.filter(s =>
    s.due_date && s.due_date < today && s.production_stage_id !== completedStage?.id
  )

  // Merchandiser performance aggregated across all ranges
  const merchPerformance = useMemo(() => {
    const assignedPeople = [...new Set(allStyles.filter(s => s.assigned_to).map(s => s.assigned_to))]
    return assignedPeople.map(personId => {
      const person = people.find(p => p.id === personId)
      const myStyles = allStyles.filter(s => s.assigned_to === personId)
      const completed = myStyles.filter(s => s.production_stage_id === completedStage?.id).length
      const overdue = myStyles.filter(s =>
        s.due_date && s.due_date < today && s.production_stage_id !== completedStage?.id
      ).length
      const inProgress = myStyles.length - completed
      return {
        personId,
        name: person?.name || 'Unknown',
        assigned: myStyles.length,
        completed,
        inProgress,
        overdue,
        pct: myStyles.length > 0 ? Math.round((completed / myStyles.length) * 100) : 0,
        styles: myStyles,
      }
    }).sort((a, b) => b.assigned - a.assigned)
  }, [allStyles, people, completedStage, today])

  const mostBehind = merchPerformance.length > 0
    ? merchPerformance.reduce((worst, m) => m.pct < worst.pct ? m : worst, merchPerformance[0])
    : null

  const allCategories = useMemo(() => {
    const set = new Set()
    for (const r of ranges) for (const c of r.categories || []) set.add(c)
    return [...set]
  }, [ranges])

  const isMerchandiser = role?.name === 'merchandiser' && currentPerson
  const visibleMerchPerf = isMerchandiser
    ? merchPerformance.filter(m => m.personId === currentPerson.id)
    : merchPerformance

  if (!ranges.length && !loading) {
    return (
      <div className="page-header">
        <h2>Range Dashboard</h2>
        <p className="empty-state">No ranges found. Create a range plan first.</p>
      </div>
    )
  }

  return (
    <div className="range-dashboard">
      <div className="page-header">
        <div>
          <h2>Range Dashboard</h2>
          <p className="page-subtitle">All ranges in {currentDivision?.name || 'this division'} — pieces by category × price</p>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Aggregated Quick Stats */}
          <div className="rd-stats-grid">
            <div className="rd-stat-card">
              <div className="rd-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><Target size={20} /></div>
              <div className="rd-stat-info">
                <div className="rd-stat-value">{totalPunched}</div>
                <div className="rd-stat-label">Total Pieces</div>
              </div>
            </div>
            <div className="rd-stat-card">
              <div className="rd-stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}><TrendingUp size={20} /></div>
              <div className="rd-stat-info">
                <div className="rd-stat-value">{completionPct}%</div>
                <div className="rd-stat-label">Completion</div>
              </div>
            </div>
            <div className="rd-stat-card">
              <div className="rd-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><AlertTriangle size={20} /></div>
              <div className="rd-stat-info">
                <div className="rd-stat-value">{overdueStyles.length}</div>
                <div className="rd-stat-label">Overdue</div>
              </div>
            </div>
            <div className="rd-stat-card">
              <div className="rd-stat-icon" style={{ background: '#fefce8', color: '#eab308' }}><Users size={20} /></div>
              <div className="rd-stat-info">
                <div className="rd-stat-value">{mostBehind?.name?.split(' ')[0] || '—'}</div>
                <div className="rd-stat-label">Most Behind</div>
              </div>
            </div>
          </div>

          {/* Consolidated division-wide matrix: category × price bracket */}
          <div className="rd-section">
            <h3><BarChart3 size={18} /> Pieces by Category × Price</h3>
            <ConsolidatedMatrix
              styles={allStyles}
              categories={allCategories}
              priceBrackets={priceBrackets}
              cellTargets={cellTargets}
              canEdit={isAdmin}
              onSaveTarget={async (category, price_bracket, target_value) => {
                if (!currentDivision?.id) return
                try {
                  const saved = await upsertDivisionCellTarget({
                    division_id: currentDivision.id,
                    category,
                    price_bracket,
                    target_value,
                    updated_by: currentPerson?.id,
                  })
                  setCellTargets(prev => {
                    const others = prev.filter(t =>
                      !(t.category === category && t.price_bracket === price_bracket)
                    )
                    return [...others, saved]
                  })
                } catch (err) {
                  console.error('Failed to save target:', err)
                  addToast('Failed to save target', 'error')
                }
              }}
            />
          </div>

          {/* Merchandiser Performance */}
          <div className="rd-section">
            <h3><Users size={18} /> Merchandiser Performance</h3>
            {visibleMerchPerf.length === 0 ? (
              <p className="empty-state">No pieces assigned yet.</p>
            ) : (
              <div className="rd-merch-table-wrap">
                <table className="rd-merch-table">
                  <thead>
                    <tr>
                      <th>Merchandiser</th>
                      <th>Assigned</th>
                      <th>Completed</th>
                      <th>In Progress</th>
                      <th>Overdue</th>
                      <th>Completion %</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMerchPerf.map(m => (
                      <MerchRow
                        key={m.personId}
                        m={m}
                        expanded={expandedMerch === m.personId}
                        onToggle={() => setExpandedMerch(expandedMerch === m.personId ? null : m.personId)}
                        stages={stages}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ConsolidatedMatrix({ styles, categories, priceBrackets, cellTargets, canEdit, onSaveTarget }) {
  const norm = v => (v || '').trim().toLowerCase()

  const catByKey = new Map()
  for (const c of categories || []) {
    const k = norm(c)
    if (k && !catByKey.has(k)) catByKey.set(k, c)
  }
  for (const s of styles) {
    const k = norm(s.category)
    if (k && !catByKey.has(k)) catByKey.set(k, s.category)
  }
  for (const t of cellTargets || []) {
    const k = norm(t.category)
    if (k && !catByKey.has(k)) catByKey.set(k, t.category)
  }

  const bracketByKey = new Map()
  for (const b of priceBrackets) {
    const k = norm(b.label)
    if (k && !bracketByKey.has(k)) bracketByKey.set(k, b.label)
  }
  for (const s of styles) {
    const k = norm(s.price_category)
    if (k && !bracketByKey.has(k)) bracketByKey.set(k, s.price_category)
  }

  const targetByKey = useMemo(() => {
    const m = new Map()
    for (const t of cellTargets || []) {
      m.set(`${norm(t.category)}::${norm(t.price_bracket)}`, t.target_value)
    }
    return m
  }, [cellTargets])

  function cellCount(catKey, bracketKey) {
    return styles.filter(s => norm(s.category) === catKey && norm(s.price_category) === bracketKey).length
  }
  function cellTarget(catKey, bracketKey) {
    return targetByKey.get(`${catKey}::${bracketKey}`) || 0
  }
  function rowTotal(catKey) {
    return styles.filter(s => norm(s.category) === catKey).length
  }
  function colTotal(bracketKey) {
    return styles.filter(s => norm(s.price_category) === bracketKey).length
  }

  // Show every category that's defined on a range, used by a piece, or has a
  // target — so admins can set targets even when no pieces are punched yet.
  // For brackets, only show ones with pieces or a target — full bracket list
  // would be too wide.
  const activeCatRows = [...catByKey.entries()]
    .map(([catKey, display]) => ({ catKey, display }))
    .sort((a, b) => a.display.localeCompare(b.display))

  const activeBracketCols = [...bracketByKey.entries()]
    .filter(([bracketKey]) =>
      colTotal(bracketKey) > 0 ||
      activeCatRows.some(row => cellTarget(row.catKey, bracketKey) > 0)
    )
    .map(([bracketKey, display]) => ({ bracketKey, display }))

  const matrixTotal = activeBracketCols.reduce((sum, col) => sum + colTotal(col.bracketKey), 0)
  const orphanCount = styles.length - matrixTotal

  const grandTarget = activeCatRows.reduce(
    (sum, row) => sum + activeBracketCols.reduce((s, col) => s + cellTarget(row.catKey, col.bracketKey), 0),
    0
  )

  const maxCellValue = Math.max(
    1,
    ...activeCatRows.flatMap(row => activeBracketCols.map(col => cellCount(row.catKey, col.bracketKey)))
  )
  const cellHeat = count => count > 0 ? `rgba(99, 102, 241, ${0.06 + (count / maxCellValue) * 0.34})` : undefined

  if (activeCatRows.length === 0 && activeBracketCols.length === 0) {
    return <p className="empty-state" style={{ fontSize: '0.85rem' }}>No pieces with category or price bracket yet.</p>
  }

  return (
    <div className="rd-matrix-wrap">
      {orphanCount > 0 && (
        <div className="rd-matrix-note">
          {orphanCount} piece{orphanCount === 1 ? '' : 's'} missing category or price bracket — not shown below.
        </div>
      )}
      {canEdit && (
        <div className="rd-matrix-note rd-matrix-hint">
          Tap any cell to set or update its target.
        </div>
      )}
      <table className="rd-matrix">
        <thead>
          <tr>
            <th className="rd-matrix-corner">Category \ Price</th>
            {activeBracketCols.map(b => (
              <th key={b.bracketKey}>{b.display}</th>
            ))}
            <th className="rd-matrix-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {activeCatRows.map(row => {
            const rowTargetSum = activeBracketCols.reduce(
              (s, col) => s + cellTarget(row.catKey, col.bracketKey),
              0
            )
            return (
              <tr key={row.catKey}>
                <th className="rd-matrix-rowlabel">{row.display}</th>
                {activeBracketCols.map(col => (
                  <TargetCell
                    key={col.bracketKey}
                    count={cellCount(row.catKey, col.bracketKey)}
                    target={cellTarget(row.catKey, col.bracketKey)}
                    heatBg={cellHeat(cellCount(row.catKey, col.bracketKey))}
                    canEdit={canEdit}
                    onSave={value => onSaveTarget(row.display, col.display, value)}
                  />
                ))}
                <td className="rd-matrix-cell rd-matrix-total">
                  <strong>{rowTotal(row.catKey)}</strong>
                  {rowTargetSum > 0 && <span className="rd-cell-target-label"> / {rowTargetSum}</span>}
                </td>
              </tr>
            )
          })}
          <tr className="rd-matrix-totalrow">
            <th className="rd-matrix-rowlabel">Total</th>
            {activeBracketCols.map(col => {
              const colTargetSum = activeCatRows.reduce(
                (s, row) => s + cellTarget(row.catKey, col.bracketKey),
                0
              )
              return (
                <td key={col.bracketKey} className="rd-matrix-cell">
                  <strong>{colTotal(col.bracketKey)}</strong>
                  {colTargetSum > 0 && <span className="rd-cell-target-label"> / {colTargetSum}</span>}
                </td>
              )
            })}
            <td className="rd-matrix-cell rd-matrix-grandtotal">
              <strong>{matrixTotal}</strong>
              {grandTarget > 0 && <span className="rd-cell-target-label"> / {grandTarget}</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function TargetCell({ count, target, heatBg, canEdit, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(target || ''))
  const committedRef = useRef(false)

  const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0
  const fillColor = target === 0
    ? '#cbd5e1'
    : pct >= 100 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444'

  function startEdit() {
    setVal(String(target || ''))
    committedRef.current = false
    setEditing(true)
  }

  function commitSave() {
    if (committedRef.current) return
    committedRef.current = true
    const n = parseInt(val, 10)
    const next = Number.isFinite(n) && n >= 0 ? n : 0
    if (next !== (target || 0)) onSave(next)
    setEditing(false)
  }

  function commitCancel() {
    if (committedRef.current) return
    committedRef.current = true
    setVal(String(target || ''))
    setEditing(false)
  }

  if (editing) {
    return (
      <td className="rd-matrix-cell rd-matrix-cell-editing" style={{ background: heatBg }}>
        <input
          type="number"
          min="0"
          autoFocus
          className="rd-target-input-compact"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commitSave}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitSave() }
            else if (e.key === 'Escape') { e.preventDefault(); commitCancel() }
          }}
        />
      </td>
    )
  }

  return (
    <td
      className={`rd-matrix-cell ${canEdit ? 'rd-matrix-cell-editable' : ''}`}
      style={{ background: heatBg }}
      onClick={canEdit ? startEdit : undefined}
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onKeyDown={canEdit ? e => { if (e.key === 'Enter') startEdit() } : undefined}
    >
      <div className="rd-cell-count">
        {count}
        {target > 0 && <span className="rd-cell-target-label"> / {target}</span>}
        {canEdit && target === 0 && <span className="rd-cell-target-add">+</span>}
      </div>
      {target > 0 && (
        <div className="rd-cell-progress">
          <div
            className="rd-cell-progress-fill"
            style={{ width: `${pct}%`, background: fillColor }}
          />
        </div>
      )}
    </td>
  )
}

function MerchRow({ m, expanded, onToggle, stages }) {
  return (
    <>
      <tr className="rd-merch-row" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td>
          <div className="rd-merch-name">
            <span className="rp-assignee-avatar">{m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
            {m.name}
          </div>
        </td>
        <td>{m.assigned}</td>
        <td>{m.completed}</td>
        <td>{m.inProgress}</td>
        <td className={m.overdue > 0 ? 'rd-gap-negative' : ''}>{m.overdue}</td>
        <td>
          <div className="rd-merch-pct">
            <div className="rd-mini-progress">
              <div className="rd-mini-fill" style={{ width: `${m.pct}%` }} />
            </div>
            <span>{m.pct}%</span>
          </div>
        </td>
        <td><ChevronDown size={14} className={expanded ? 'rd-chevron-open' : ''} /></td>
      </tr>
      {expanded && (
        <tr className="rd-merch-detail-row">
          <td colSpan={7}>
            <div className="rd-merch-pieces">
              {m.styles.map(s => (
                <div key={s.id} className="rd-merch-piece">
                  {s.thumbnail_url && <img src={thumbUrl(s.thumbnail_url, { w: 120 })} alt="" className="rd-piece-thumb" />}
                  <div className="rd-piece-info">
                    <span className="rd-piece-name">{s.name || s.category}</span>
                    {s.stage && (
                      <span className="rd-piece-stage" style={{ background: s.stage.color + '22', color: s.stage.color }}>
                        {s.stage.name}
                      </span>
                    )}
                    {s.due_date && (
                      <span className={`rd-piece-due ${s.due_date < new Date().toISOString().split('T')[0] && s.production_stage_id !== stages.find(st => st.name === 'Finishing')?.id ? 'overdue' : ''}`}>
                        Due: {new Date(s.due_date + 'T00:00:00').toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
