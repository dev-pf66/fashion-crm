import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../App'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../contexts/ToastContext'
import {
  getRanges,
  getMultiRangeDashboardData,
  upsertDashboardTarget,
  getPriceBrackets,
  getSilhouettes,
} from '../lib/supabase'
import { useDivision } from '../contexts/DivisionContext'
import { BarChart3, Target, Users, AlertTriangle, TrendingUp, ChevronDown, Pencil } from 'lucide-react'
import { DashboardSkeleton } from '../components/PageSkeleton'

export default function RangeDashboard() {
  const { currentPerson, people } = useApp()
  const { role, can } = usePermissions()
  const canEditTargets = can('dashboard.edit_targets')
  const { addToast } = useToast()
  const { currentDivision } = useDivision()

  const [ranges, setRanges] = useState([])
  const [allStyles, setAllStyles] = useState([])
  const [allTargets, setAllTargets] = useState([])
  const [stages, setStages] = useState([])
  const [priceBrackets, setPriceBrackets] = useState([])
  const [silhouettes, setSilhouettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTarget, setEditingTarget] = useState(null) // "rangeId:type:key"
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
      const [dashData, brackets, sils] = await Promise.all([
        getMultiRangeDashboardData(rangeIds),
        getPriceBrackets(),
        getSilhouettes(),
      ])
      setAllStyles(dashData.styles)
      setAllTargets(dashData.targets)
      setStages(dashData.stages)
      setPriceBrackets(brackets)
      setSilhouettes(sils)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      addToast('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveTarget(rangeId, type, key, value) {
    try {
      await upsertDashboardTarget({
        range_id: rangeId,
        target_type: type,
        target_key: key || '_total',
        target_value: parseInt(value) || 0,
        updated_by: currentPerson?.id,
      })
      await loadAll()
      setEditingTarget(null)
      addToast('Target updated', 'success')
    } catch (err) {
      addToast('Failed to update target', 'error')
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
          <p className="page-subtitle">All ranges in {currentDivision?.name || 'this division'} — pieces by silhouette × price</p>
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

          {/* Per-range Excel-style matrix: silhouette × price bracket */}
          <div className="rd-section">
            <h3><BarChart3 size={18} /> Pieces by Silhouette × Price</h3>
            {ranges.map(range => (
              <RangeMatrix
                key={range.id}
                range={range}
                styles={allStyles.filter(s => s.range_id === range.id)}
                targets={allTargets.filter(t => t.range_id === range.id)}
                silhouettes={silhouettes}
                priceBrackets={priceBrackets}
                canEditTargets={canEditTargets}
                editingTarget={editingTarget}
                setEditingTarget={setEditingTarget}
                saveTarget={saveTarget}
                completedStage={completedStage}
                today={today}
              />
            ))}
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

function RangeMatrix({
  range, styles, targets, silhouettes, priceBrackets,
  canEditTargets, editingTarget, setEditingTarget, saveTarget,
  completedStage, today,
}) {
  const totalPunched = styles.length
  const completed = styles.filter(s => s.production_stage_id === completedStage?.id).length
  const overdue = styles.filter(s =>
    s.due_date && s.due_date < today && s.production_stage_id !== completedStage?.id
  ).length
  const pct = totalPunched > 0 ? Math.round((completed / totalPunched) * 100) : 0

  function getTarget(type, key) {
    const t = targets.find(t => t.target_type === type && t.target_key === key)
    return t?.target_value || 0
  }

  const norm = v => (v || '').trim().toLowerCase()

  // Dedupe silhouettes case-insensitively; prefer lookup label, else data value
  const silByKey = new Map()
  for (const s of silhouettes) {
    const k = norm(s.name)
    if (k && !silByKey.has(k)) silByKey.set(k, s.name)
  }
  for (const s of styles) {
    const k = norm(s.silhouette)
    if (k && !silByKey.has(k)) silByKey.set(k, s.silhouette)
  }

  // Dedupe brackets case-insensitively
  const bracketByKey = new Map()
  for (const b of priceBrackets) {
    const k = norm(b.label)
    if (k && !bracketByKey.has(k)) bracketByKey.set(k, b.label)
  }
  for (const s of styles) {
    const k = norm(s.price_category)
    if (k && !bracketByKey.has(k)) bracketByKey.set(k, s.price_category)
  }

  function cellCount(silKey, bracketKey) {
    return styles.filter(s => norm(s.silhouette) === silKey && norm(s.price_category) === bracketKey).length
  }
  function rowTotal(silKey) {
    return styles.filter(s => norm(s.silhouette) === silKey).length
  }
  function colTotal(bracketKey) {
    return styles.filter(s => norm(s.price_category) === bracketKey).length
  }

  const activeSilRows = [...silByKey.entries()]
    .filter(([silKey, display]) => {
      if (rowTotal(silKey) > 0) return true
      return [...bracketByKey.values()].some(b => getTarget('silhouette_bracket', `${display}::${b}`) > 0)
    })
    .map(([silKey, display]) => ({ silKey, display }))

  const activeBracketCols = [...bracketByKey.entries()]
    .filter(([bracketKey, display]) => {
      if (colTotal(bracketKey) > 0) return true
      return activeSilRows.some(r => getTarget('silhouette_bracket', `${r.display}::${display}`) > 0)
    })
    .map(([bracketKey, display]) => ({ bracketKey, display }))

  // Grand total = sum of matrix cells (styles with both silhouette + bracket set).
  // Pieces missing either dimension are excluded so row/col totals reconcile.
  const matrixTotal = activeBracketCols.reduce((sum, col) => sum + colTotal(col.bracketKey), 0)
  const orphanCount = totalPunched - matrixTotal

  // Heatmap intensity scaled to the busiest cell in this matrix
  const maxCellValue = Math.max(
    1,
    ...activeSilRows.flatMap(row => activeBracketCols.map(col => cellCount(row.silKey, col.bracketKey)))
  )
  const cellHeat = count => count > 0 ? `rgba(99, 102, 241, ${0.06 + (count / maxCellValue) * 0.34})` : undefined
  const targetFillColor = pct => pct >= 100 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444'

  const rangeTarget = getTarget('total', '_total')
  const rangeEditKey = `${range.id}:total:_total`

  return (
    <div className="rd-range-block">
      <div className="rd-range-header">
        <div className="rd-range-title">
          <h4>{range.name}</h4>
          <div className="rd-range-meta">
            <span><strong>{totalPunched}</strong> punched{rangeTarget > 0 ? ` / ${rangeTarget}` : ''}</span>
            <span className="rd-meta-sep">•</span>
            <span>{pct}% complete</span>
            {overdue > 0 && (
              <>
                <span className="rd-meta-sep">•</span>
                <span className="rd-gap-negative">{overdue} overdue</span>
              </>
            )}
          </div>
        </div>
        {canEditTargets && (
          <EditableTarget
            value={rangeTarget}
            editing={editingTarget === rangeEditKey}
            onEdit={() => setEditingTarget(rangeEditKey)}
            onSave={val => saveTarget(range.id, 'total', '_total', val)}
            onCancel={() => setEditingTarget(null)}
            label="Range target"
          />
        )}
      </div>

      {activeSilRows.length === 0 && activeBracketCols.length === 0 ? (
        <p className="empty-state" style={{ fontSize: '0.85rem' }}>No pieces with silhouette or price bracket yet.</p>
      ) : (
        <div className="rd-matrix-wrap">
          {orphanCount > 0 && (
            <div className="rd-matrix-note">
              {orphanCount} piece{orphanCount === 1 ? '' : 's'} missing silhouette or price bracket — not shown below.
            </div>
          )}
          <table className="rd-matrix">
            <thead>
              <tr>
                <th className="rd-matrix-corner">Silhouette \ Price</th>
                {activeBracketCols.map(b => (
                  <th key={b.bracketKey}>{b.display}</th>
                ))}
                <th className="rd-matrix-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {activeSilRows.map(row => (
                <tr key={row.silKey}>
                  <th className="rd-matrix-rowlabel">{row.display}</th>
                  {activeBracketCols.map(col => {
                    const count = cellCount(row.silKey, col.bracketKey)
                    const key = `${row.display}::${col.display}`
                    const target = getTarget('silhouette_bracket', key)
                    const editKey = `${range.id}:silhouette_bracket:${key}`
                    const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : null
                    return (
                      <td key={col.bracketKey} className="rd-matrix-cell" style={{ background: cellHeat(count) }}>
                        <div className="rd-cell-count">{count}</div>
                        {canEditTargets ? (
                          <EditableTarget
                            value={target}
                            editing={editingTarget === editKey}
                            onEdit={() => setEditingTarget(editKey)}
                            onSave={val => saveTarget(range.id, 'silhouette_bracket', key, val)}
                            onCancel={() => setEditingTarget(null)}
                            inline
                            compact
                          />
                        ) : target > 0 ? (
                          <div className="rd-cell-target">/ {target}</div>
                        ) : null}
                        {target > 0 && (
                          <div className="rd-cell-progress" title={`${count} of ${target} (${pct}%)`}>
                            <div
                              className="rd-cell-progress-fill"
                              style={{ width: `${pct}%`, background: targetFillColor(pct) }}
                            />
                          </div>
                        )}
                      </td>
                    )
                  })}
                  <td className="rd-matrix-cell rd-matrix-total"><strong>{rowTotal(row.silKey)}</strong></td>
                </tr>
              ))}
              <tr className="rd-matrix-totalrow">
                <th className="rd-matrix-rowlabel">Total</th>
                {activeBracketCols.map(col => (
                  <td key={col.bracketKey} className="rd-matrix-cell"><strong>{colTotal(col.bracketKey)}</strong></td>
                ))}
                <td className="rd-matrix-cell rd-matrix-grandtotal"><strong>{matrixTotal}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EditableTarget({ value, editing, onEdit, onSave, onCancel, inline, compact, label }) {
  const [val, setVal] = useState(value)
  const committedRef = useRef(false)

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => { if (editing) committedRef.current = false }, [editing])

  const commitSave = () => {
    if (committedRef.current) return
    committedRef.current = true
    onSave(val)
  }
  const commitCancel = () => {
    if (committedRef.current) return
    committedRef.current = true
    onCancel()
  }

  if (editing) {
    if (compact) {
      return (
        <input
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { commitSave(); e.preventDefault() }
            if (e.key === 'Escape') { commitCancel(); e.preventDefault() }
          }}
          onBlur={commitSave}
          autoFocus
          min="0"
          className="rd-target-input-compact"
          title="Enter to save, Esc to cancel"
        />
      )
    }
    return (
      <span className="rd-editable-target">
        <input
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave(val)
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          min="0"
          className="rd-target-input"
        />
        <button className="btn btn-sm btn-primary" onClick={() => onSave(val)}>Save</button>
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
      </span>
    )
  }

  if (inline) {
    return (
      <span
        className={compact ? 'rd-cell-target-edit' : 'rd-target-clickable'}
        onClick={onEdit}
        title="Click to edit target"
      >
        {value > 0 ? `/ ${value}` : <>+ <Pencil size={10} /></>}
      </span>
    )
  }

  return (
    <button className="rd-set-target-btn" onClick={onEdit}>
      <Pencil size={12} /> {label || 'Set Target'}
    </button>
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
                  {s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="rd-piece-thumb" />}
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
