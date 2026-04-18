import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../App'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../contexts/ToastContext'
import {
  getRanges,
  getRangeDashboardData,
  upsertDashboardTarget,
  getPriceBrackets,
  getSilhouettes,
} from '../lib/supabase'
import { useDivision } from '../contexts/DivisionContext'
import { BarChart3, Target, Users, AlertTriangle, TrendingUp, ChevronDown, Pencil } from 'lucide-react'

export default function RangeDashboard() {
  const { currentPerson, people } = useApp()
  const { isAdmin, can } = usePermissions()
  const { addToast } = useToast()
  const { currentDivision } = useDivision()

  const [ranges, setRanges] = useState([])
  const [selectedRangeId, setSelectedRangeId] = useState(null)
  const [styles, setStyles] = useState([])
  const [targets, setTargets] = useState([])
  const [stages, setStages] = useState([])
  const [priceBrackets, setPriceBrackets] = useState([])
  const [silhouettes, setSilhouettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTarget, setEditingTarget] = useState(null)
  const [expandedMerch, setExpandedMerch] = useState(null)

  // Load ranges
  useEffect(() => {
    loadRanges()
  }, [currentDivision])

  async function loadRanges() {
    try {
      const data = await getRanges(currentDivision?.id)
      setRanges(data)
      if (data.length && !selectedRangeId) {
        setSelectedRangeId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load ranges:', err)
    }
  }

  // Load dashboard data when range changes
  useEffect(() => {
    if (selectedRangeId) loadDashboardData()
  }, [selectedRangeId])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const [dashData, brackets, sils] = await Promise.all([
        getRangeDashboardData(selectedRangeId),
        getPriceBrackets(),
        getSilhouettes(),
      ])
      setStyles(dashData.styles)
      setTargets(dashData.targets)
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

  // Helper: get target value
  function getTarget(type, key = '_total') {
    const t = targets.find(t => t.target_type === type && t.target_key === key)
    return t?.target_value || 0
  }

  // Save target
  async function saveTarget(type, key, value) {
    try {
      await upsertDashboardTarget({
        range_id: selectedRangeId,
        target_type: type,
        target_key: key || '_total',
        target_value: parseInt(value) || 0,
        updated_by: currentPerson?.id,
      })
      await loadDashboardData()
      setEditingTarget(null)
      addToast('Target updated', 'success')
    } catch (err) {
      addToast('Failed to update target', 'error')
    }
  }

  // Computed stats
  const totalTarget = getTarget('total')
  const totalPunched = styles.length
  const completedStage = stages.find(s => s.name === 'Finishing')
  const completedCount = styles.filter(s => s.production_stage_id === completedStage?.id).length
  const completionPct = totalPunched > 0 ? Math.round((completedCount / totalPunched) * 100) : 0
  const today = new Date().toISOString().split('T')[0]
  const overdueStyles = styles.filter(s =>
    s.due_date && s.due_date < today && s.production_stage_id !== completedStage?.id
  )

  // Breakdown grouped by silhouette, each with price bracket + embroidery rows
  const silhouetteBreakdown = useMemo(() => {
    // Get all silhouettes in use
    const usedSilhouettes = [...new Set(styles.map(s => s.silhouette).filter(Boolean))]
    const allSilhouettes = [...new Set([
      ...silhouettes.map(s => s.name),
      ...usedSilhouettes,
    ])]

    // All price bracket labels
    const bracketLabels = priceBrackets.map(b => b.label)

    return allSilhouettes.map(silName => {
      const silStyles = styles.filter(s => s.silhouette === silName)
      const totalPunched = silStyles.length

      // Get all embroidery types used in this silhouette
      const embTypes = [...new Set(silStyles.map(s => s.embroidery).filter(Boolean))]
      if (embTypes.length === 0) embTypes.push('') // show at least one row per bracket

      // Build rows: one per price bracket + embroidery combo
      const rows = []
      for (const bracket of bracketLabels) {
        const bracketStyles = silStyles.filter(s => s.price_category === bracket)
        if (embTypes.length === 0 || (embTypes.length === 1 && embTypes[0] === '')) {
          // No embroidery data — one row per bracket
          const targetKey = `${silName}::${bracket}`
          rows.push({
            bracket,
            embroidery: '—',
            target: getTarget('silhouette_bracket', targetKey),
            punched: bracketStyles.length,
            targetKey,
          })
        } else {
          for (const emb of embTypes) {
            const targetKey = `${silName}::${bracket}::${emb}`
            rows.push({
              bracket,
              embroidery: emb,
              target: getTarget('silhouette_bracket', targetKey),
              punched: bracketStyles.filter(s => s.embroidery === emb).length,
              targetKey,
            })
          }
        }
      }

      // Also include brackets not in the lookup but used in data
      const usedBrackets = [...new Set(silStyles.map(s => s.price_category).filter(Boolean))]
      for (const bracket of usedBrackets) {
        if (bracketLabels.includes(bracket)) continue
        const bracketStyles = silStyles.filter(s => s.price_category === bracket)
        for (const emb of embTypes) {
          const targetKey = emb ? `${silName}::${bracket}::${emb}` : `${silName}::${bracket}`
          rows.push({
            bracket,
            embroidery: emb || '—',
            target: getTarget('silhouette_bracket', targetKey),
            punched: bracketStyles.filter(s => emb ? s.embroidery === emb : true).length,
            targetKey,
          })
        }
      }

      return { silName, totalPunched, rows }
    }).filter(s => s.totalPunched > 0 || s.rows.some(r => r.target > 0))
  }, [styles, targets, silhouettes, priceBrackets])

  // Merchandiser performance
  const merchPerformance = useMemo(() => {
    const assignedPeople = [...new Set(styles.filter(s => s.assigned_to).map(s => s.assigned_to))]
    return assignedPeople.map(personId => {
      const person = people.find(p => p.id === personId)
      const myStyles = styles.filter(s => s.assigned_to === personId)
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
  }, [styles, people, stages])

  // Find most behind merchandiser
  const mostBehind = merchPerformance.length > 0
    ? merchPerformance.reduce((worst, m) => m.pct < worst.pct ? m : worst, merchPerformance[0])
    : null

  // Filter for merchandiser role (non-admin sees only their own)
  const isMerchandiser = !isAdmin && currentPerson
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
          <p className="page-subtitle">Track range completion and merchandiser performance</p>
        </div>
        <div className="rd-range-selector">
          <select
            value={selectedRangeId || ''}
            onChange={e => setSelectedRangeId(e.target.value)}
          >
            {ranges.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : (
        <>
          {/* Section C: Quick Stats */}
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

          {/* Section A: Range Completion Tracker */}
          <div className="rd-section">
            <h3><BarChart3 size={18} /> Range Completion</h3>

            {/* Overall progress */}
            <div className="rd-progress-block">
              <div className="rd-progress-header">
                <span>Total Progress</span>
                <span className="rd-progress-nums">
                  {totalPunched} / {totalTarget > 0 ? totalTarget : '—'}
                  {totalTarget > 0 && ` (${Math.round((totalPunched / totalTarget) * 100)}%)`}
                </span>
                {isAdmin && (
                  <EditableTarget
                    value={totalTarget}
                    editing={editingTarget === 'total'}
                    onEdit={() => setEditingTarget('total')}
                    onSave={val => saveTarget('total', '_total', val)}
                    onCancel={() => setEditingTarget(null)}
                  />
                )}
              </div>
              {totalTarget > 0 && (
                <div className="rd-progress-bar">
                  <div
                    className="rd-progress-fill"
                    style={{ width: `${Math.min(100, (totalPunched / totalTarget) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Silhouette Breakdown Tables */}
            {silhouetteBreakdown.map(sil => (
              <SilhouetteTable
                key={sil.silName}
                sil={sil}
                isAdmin={isAdmin}
                editingTarget={editingTarget}
                setEditingTarget={setEditingTarget}
                saveTarget={saveTarget}
              />
            ))}
            {silhouetteBreakdown.length === 0 && (
              <p className="empty-state" style={{ fontSize: '0.85rem' }}>No silhouette data yet. Add silhouettes to pieces in the range plan.</p>
            )}
          </div>

          {/* Section B: Merchandiser Performance */}
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

function SilhouetteTable({ sil, isAdmin, editingTarget, setEditingTarget, saveTarget }) {
  return (
    <div className="rd-breakdown">
      <h4>{sil.silName} <span className="rd-sil-count">({sil.totalPunched} pieces)</span></h4>
      <table className="rd-breakdown-table">
        <thead>
          <tr>
            <th>Price Bracket</th>
            <th>Target</th>
            <th>Embroidery</th>
            <th>Punched</th>
          </tr>
        </thead>
        <tbody>
          {sil.rows.map(row => {
            const editKey = `sil_bracket:${row.targetKey}`
            return (
              <tr key={row.targetKey}>
                <td>{row.bracket}</td>
                <td>
                  {isAdmin ? (
                    <EditableTarget
                      value={row.target}
                      editing={editingTarget === editKey}
                      onEdit={() => setEditingTarget(editKey)}
                      onSave={val => saveTarget('silhouette_bracket', row.targetKey, val)}
                      onCancel={() => setEditingTarget(null)}
                      inline
                    />
                  ) : (
                    row.target || '—'
                  )}
                </td>
                <td>{row.embroidery}</td>
                <td>{row.punched}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EditableTarget({ value, editing, onEdit, onSave, onCancel, inline }) {
  const [val, setVal] = useState(value)

  useEffect(() => { setVal(value) }, [value])

  if (editing) {
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
      <span className="rd-target-clickable" onClick={onEdit} title="Click to edit target">
        {value || '—'} <Pencil size={12} />
      </span>
    )
  }

  return (
    <button className="rd-set-target-btn" onClick={onEdit}>
      <Pencil size={12} /> Set Target
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
