import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { getComplianceTests, createComplianceTest, updateComplianceTest, deleteComplianceTest } from '../lib/supabase'
import { TEST_TYPES, TEST_STATUSES } from '../lib/constants'
import { useToast } from '../contexts/ToastContext'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { Plus, Trash2, Edit, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

const STATUS_ICONS = {
  pass: <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />,
  fail: <XCircle size={14} style={{ color: 'var(--danger)' }} />,
  conditional: <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />,
}

export default function ComplianceTracker({ styleId }) {
  const { currentPerson } = useApp()
  const toast = useToast()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTest, setEditingTest] = useState(null)

  useEffect(() => { loadTests() }, [styleId])

  async function loadTests() {
    setLoading(true)
    try {
      const data = await getComplianceTests(styleId)
      setTests(data || [])
    } catch (err) {
      console.error('Failed to load compliance tests:', err)
      toast.error('Failed to load compliance tests')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this test record?')) return
    try {
      await deleteComplianceTest(id)
      toast.success('Test deleted')
      loadTests()
    } catch (err) {
      toast.error('Failed to delete test')
    }
  }

  function handleEdit(test) {
    setEditingTest(test)
    setShowForm(true)
  }

  const passCount = tests.filter(t => t.status === 'pass').length
  const failCount = tests.filter(t => t.status === 'fail').length
  const pendingCount = tests.filter(t => ['pending', 'submitted', 'in_testing'].includes(t.status)).length

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3><ShieldCheck size={16} style={{ verticalAlign: 'middle' }} /> Compliance Testing</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTest(null); setShowForm(true) }}>
            <Plus size={14} /> Add Test
          </button>
        </div>

        {tests.length > 0 && (
          <div className="compliance-summary">
            <div className="compliance-stat">
              <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
              <span>{passCount} Pass</span>
            </div>
            <div className="compliance-stat">
              <XCircle size={14} style={{ color: 'var(--danger)' }} />
              <span>{failCount} Fail</span>
            </div>
            <div className="compliance-stat">
              <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
              <span>{pendingCount} Pending</span>
            </div>
          </div>
        )}

        {tests.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <ShieldCheck size={40} />
            <h3>No compliance tests</h3>
            <p>Add testing requirements for this style.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingTest(null); setShowForm(true) }}>
              <Plus size={14} /> Add Test
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Test Type</th>
                <th>Lab</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Result Date</th>
                <th>Report #</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {STATUS_ICONS[test.status] || null}
                      {test.test_type}
                    </div>
                  </td>
                  <td>{test.lab_name || '-'}</td>
                  <td><StatusBadge status={test.status} /></td>
                  <td>{test.submitted_date ? new Date(test.submitted_date).toLocaleDateString() : '-'}</td>
                  <td>{test.result_date ? new Date(test.result_date).toLocaleDateString() : '-'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{test.report_number || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(test)}><Edit size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(test.id)} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ComplianceTestForm
          test={editingTest}
          styleId={styleId}
          personId={currentPerson?.id}
          onClose={() => { setShowForm(false); setEditingTest(null) }}
          onSave={() => { setShowForm(false); setEditingTest(null); loadTests() }}
        />
      )}
    </div>
  )
}

function ComplianceTestForm({ test, styleId, personId, onClose, onSave }) {
  const toast = useToast()
  const [form, setForm] = useState({
    test_type: test?.test_type || '',
    lab_name: test?.lab_name || '',
    status: test?.status || 'pending',
    submitted_date: test?.submitted_date || '',
    result_date: test?.result_date || '',
    report_number: test?.report_number || '',
    notes: test?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.test_type) return
    setSaving(true)
    try {
      if (test) {
        await updateComplianceTest(test.id, form)
      } else {
        await createComplianceTest({ ...form, style_id: styleId, submitted_by: personId })
      }
      toast.success(test ? 'Test updated' : 'Test added')
      onSave()
    } catch (err) {
      toast.error('Failed to save test')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={test ? 'Edit Compliance Test' : 'Add Compliance Test'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Test Type *</label>
            <select value={form.test_type} onChange={e => setForm(p => ({ ...p, test_type: e.target.value }))} required>
              <option value="">Select test...</option>
              {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {TEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Lab Name</label>
            <input type="text" value={form.lab_name} onChange={e => setForm(p => ({ ...p, lab_name: e.target.value }))} placeholder="e.g. SGS, Bureau Veritas" />
          </div>
          <div className="form-group">
            <label>Report Number</label>
            <input type="text" value={form.report_number} onChange={e => setForm(p => ({ ...p, report_number: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Submitted Date</label>
            <input type="date" value={form.submitted_date} onChange={e => setForm(p => ({ ...p, submitted_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Result Date</label>
            <input type="date" value={form.result_date} onChange={e => setForm(p => ({ ...p, result_date: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Test details, requirements..." />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : test ? 'Update' : 'Add Test'}</button>
        </div>
      </form>
    </Modal>
  )
}
