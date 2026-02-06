import { useState, useEffect } from 'react'
import { getStyleCosting, upsertStyleCosting } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { COST_CATEGORIES } from '../lib/constants'
import { DollarSign, Save, RotateCcw } from 'lucide-react'

export default function CostingSheet({ styleId, targetFob, targetRetail, targetMargin }) {
  const toast = useToast()
  const [costing, setCosting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(getDefaultForm())

  function getDefaultForm() {
    return {
      fabric: '', trims: '', labor: '', washing: '',
      printing: '', embroidery: '', packaging: '', other: '',
      duty_pct: '', freight: '', agent_commission_pct: '',
      notes: '',
    }
  }

  useEffect(() => { loadCosting() }, [styleId])

  async function loadCosting() {
    setLoading(true)
    try {
      const data = await getStyleCosting(styleId)
      if (data) {
        setCosting(data)
        setForm({
          fabric: data.fabric || '',
          trims: data.trims || '',
          labor: data.labor || '',
          washing: data.washing || '',
          printing: data.printing || '',
          embroidery: data.embroidery || '',
          packaging: data.packaging || '',
          other: data.other || '',
          duty_pct: data.duty_pct || '',
          freight: data.freight || '',
          agent_commission_pct: data.agent_commission_pct || '',
          notes: data.notes || '',
        })
      }
    } catch (err) {
      console.error('Failed to load costing:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculations
  const costs = COST_CATEGORIES.map(c => parseFloat(form[c.key]) || 0)
  const totalFob = costs.reduce((sum, v) => sum + v, 0)
  const dutyPct = parseFloat(form.duty_pct) || 0
  const freight = parseFloat(form.freight) || 0
  const agentPct = parseFloat(form.agent_commission_pct) || 0
  const dutyAmount = totalFob * (dutyPct / 100)
  const agentAmount = totalFob * (agentPct / 100)
  const landedCost = totalFob + dutyAmount + freight + agentAmount
  const retailPrice = parseFloat(targetRetail) || 0
  const actualMargin = retailPrice > 0 ? ((retailPrice - landedCost) / retailPrice * 100) : 0
  const markup = landedCost > 0 ? ((retailPrice - landedCost) / landedCost * 100) : 0
  const fobTarget = parseFloat(targetFob) || 0
  const fobVariance = fobTarget > 0 ? totalFob - fobTarget : 0
  const marginTarget = parseFloat(targetMargin) || 0

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {}
      for (const cat of COST_CATEGORIES) {
        payload[cat.key] = form[cat.key] ? parseFloat(form[cat.key]) : null
      }
      payload.duty_pct = form.duty_pct ? parseFloat(form.duty_pct) : null
      payload.freight = form.freight ? parseFloat(form.freight) : null
      payload.agent_commission_pct = form.agent_commission_pct ? parseFloat(form.agent_commission_pct) : null
      payload.total_fob = totalFob
      payload.landed_cost = landedCost
      payload.notes = form.notes || null

      await upsertStyleCosting(styleId, payload)
      toast.success('Costing saved')
      loadCosting()
    } catch (err) {
      console.error('Failed to save costing:', err)
      toast.error('Failed to save costing')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div className="costing-sheet">
      <div className="card">
        <div className="card-header">
          <h3><DollarSign size={16} style={{ verticalAlign: 'middle' }} /> Cost Breakdown</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setForm(getDefaultForm())}>
              <RotateCcw size={14} /> Reset
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="costing-grid">
          <div className="costing-inputs">
            <h4 className="costing-section-title">Direct Costs</h4>
            {COST_CATEGORIES.map(cat => (
              <div key={cat.key} className="costing-row">
                <label>{cat.label}</label>
                <div className="costing-input-wrap">
                  <span className="costing-currency">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form[cat.key]}
                    onChange={e => setForm(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  />
                </div>
              </div>
            ))}

            <div className="costing-subtotal">
              <span>Total FOB</span>
              <span className="costing-subtotal-value">${totalFob.toFixed(2)}</span>
            </div>

            <h4 className="costing-section-title" style={{ marginTop: '1rem' }}>Landed Cost Additions</h4>
            <div className="costing-row">
              <label>Duty</label>
              <div className="costing-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={form.duty_pct}
                  onChange={e => setForm(prev => ({ ...prev, duty_pct: e.target.value }))}
                  style={{ textAlign: 'right' }}
                />
                <span className="costing-suffix">%</span>
              </div>
              <span className="costing-calc">${dutyAmount.toFixed(2)}</span>
            </div>
            <div className="costing-row">
              <label>Freight</label>
              <div className="costing-input-wrap">
                <span className="costing-currency">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.freight}
                  onChange={e => setForm(prev => ({ ...prev, freight: e.target.value }))}
                />
              </div>
            </div>
            <div className="costing-row">
              <label>Agent Commission</label>
              <div className="costing-input-wrap">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={form.agent_commission_pct}
                  onChange={e => setForm(prev => ({ ...prev, agent_commission_pct: e.target.value }))}
                  style={{ textAlign: 'right' }}
                />
                <span className="costing-suffix">%</span>
              </div>
              <span className="costing-calc">${agentAmount.toFixed(2)}</span>
            </div>

            <div className="costing-subtotal costing-total">
              <span>Landed Cost</span>
              <span className="costing-subtotal-value">${landedCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="costing-summary">
            <h4 className="costing-section-title">Summary</h4>
            <div className="costing-summary-cards">
              <div className="costing-summary-card">
                <div className="costing-summary-label">Total FOB</div>
                <div className="costing-summary-value">${totalFob.toFixed(2)}</div>
                {fobTarget > 0 && (
                  <div className={`costing-summary-variance ${fobVariance > 0 ? 'over' : fobVariance < 0 ? 'under' : ''}`}>
                    {fobVariance > 0 ? '+' : ''}{fobVariance.toFixed(2)} vs target ${fobTarget.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="costing-summary-card">
                <div className="costing-summary-label">Landed Cost</div>
                <div className="costing-summary-value">${landedCost.toFixed(2)}</div>
              </div>

              <div className="costing-summary-card">
                <div className="costing-summary-label">Margin</div>
                <div className="costing-summary-value">{retailPrice > 0 ? `${actualMargin.toFixed(1)}%` : '-'}</div>
                {marginTarget > 0 && retailPrice > 0 && (
                  <div className={`costing-summary-variance ${actualMargin < marginTarget ? 'over' : 'under'}`}>
                    {actualMargin >= marginTarget ? 'On target' : `${(marginTarget - actualMargin).toFixed(1)}% below target`}
                  </div>
                )}
              </div>

              <div className="costing-summary-card">
                <div className="costing-summary-label">Markup</div>
                <div className="costing-summary-value">{landedCost > 0 ? `${markup.toFixed(1)}%` : '-'}</div>
              </div>
            </div>

            {totalFob > 0 && (
              <div className="costing-breakdown-chart">
                <h4 className="costing-section-title" style={{ marginTop: '1rem' }}>Cost Breakdown</h4>
                {COST_CATEGORIES.map(cat => {
                  const val = parseFloat(form[cat.key]) || 0
                  if (val === 0) return null
                  const pct = (val / totalFob) * 100
                  return (
                    <div key={cat.key} className="costing-bar-row">
                      <div className="costing-bar-label">{cat.label}</div>
                      <div className="costing-bar-track">
                        <div className="costing-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="costing-bar-value">{pct.toFixed(0)}%</div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Costing notes, negotiation details..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
