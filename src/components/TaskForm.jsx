import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { createTask, updateTask, createNotification, getStyles, getSuppliers, getPurchaseOrders, getRanges } from '../lib/supabase'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'
import Modal from './Modal'

export default function TaskForm({ task, onClose, onSave }) {
  const { currentPerson, people } = useApp()
  const { divisions, currentDivision } = useDivision()
  const toast = useToast()
  const isEdit = !!task

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: '',
    collaborators: [],
    due_date: '',
    tags: [],
    style_id: '',
    supplier_id: '',
    purchase_order_id: '',
    range_id: '',
    division_id: currentDivision?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [styles, setStyles] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [ranges, setRanges] = useState([])

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        collaborators: task.collaborators || [],
        due_date: task.due_date || '',
        tags: task.tags || [],
        style_id: task.style_id || '',
        supplier_id: task.supplier_id || '',
        purchase_order_id: task.purchase_order_id || '',
        range_id: task.range_id || '',
        division_id: task.division_id || '',
      })
    }
  }, [task])

  useEffect(() => {
    loadEntities()
  }, [currentDivision])

  async function loadEntities() {
    try {
      const promises = [
        getSuppliers(),
        getRanges(),
      ]
      if (currentDivision) {
        promises.push(getStyles(currentDivision.id))
        promises.push(getPurchaseOrders(currentDivision.id))
      } else {
        promises.push(Promise.resolve([]))
        promises.push(Promise.resolve([]))
      }
      const [suppData, rangesData, styleData, poData] = await Promise.all(promises)
      setSuppliers(suppData || [])
      setStyles(styleData || [])
      setPurchaseOrders(poData || [])
      setRanges(rangesData || [])
    } catch (err) {
      console.error('Failed to load entities:', err)
    }
  }

  function toggleCollaborator(personId) {
    const id = parseInt(personId)
    setForm(prev => ({
      ...prev,
      collaborators: prev.collaborators.includes(id)
        ? prev.collaborators.filter(c => c !== id)
        : [...prev.collaborators, id],
    }))
  }

  function toggleTag(tagValue) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagValue)
        ? prev.tags.filter(t => t !== tagValue)
        : [...prev.tags, tagValue],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        collaborators: form.collaborators.length > 0 ? form.collaborators : [],
        due_date: form.due_date || null,
        tags: form.tags,
        style_id: form.style_id || null,
        supplier_id: form.supplier_id || null,
        purchase_order_id: form.purchase_order_id || null,
        range_id: form.range_id || null,
        division_id: form.division_id || currentDivision?.id || null,
      }

      if (isEdit) {
        await updateTask(task.id, payload)
        // Notify if reassigned
        if (form.assigned_to && form.assigned_to !== task.assigned_to && form.assigned_to !== currentPerson?.id) {
          await createNotification({
            person_id: form.assigned_to,
            type: 'assignment',
            title: `${currentPerson?.name || 'Someone'} assigned you a task`,
            message: form.title,
            link: `/tasks?task=${task.id}`,
            from_person_id: currentPerson?.id,
          })
        }
        toast.success('Task updated')
      } else {
        payload.created_by = currentPerson?.id || null
        const newTask = await createTask(payload)
        const taskLink = `/tasks?task=${newTask.id}`
        // Notify assignee
        if (form.assigned_to && form.assigned_to !== currentPerson?.id) {
          await createNotification({
            person_id: form.assigned_to,
            type: 'assignment',
            title: `${currentPerson?.name || 'Someone'} assigned you a task`,
            message: form.title,
            link: taskLink,
            from_person_id: currentPerson?.id,
          })
        }
        // Notify collaborators
        for (const collabId of form.collaborators) {
          if (collabId !== currentPerson?.id && collabId !== parseInt(form.assigned_to)) {
            await createNotification({
              person_id: collabId,
              type: 'assignment',
              title: `${currentPerson?.name || 'Someone'} added you to a task`,
              message: form.title,
              link: taskLink,
              from_person_id: currentPerson?.id,
            })
          }
        }
        toast.success('Task created')
      }
      onSave()
    } catch (err) {
      console.error('Failed to save task:', err)
      toast.error('Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Task title"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description..."
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select
              value={form.status}
              onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
            >
              {TASK_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
            >
              {TASK_PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Division</label>
          <select
            value={form.division_id}
            onChange={e => setForm(prev => ({ ...prev, division_id: e.target.value ? parseInt(e.target.value) : '' }))}
          >
            <option value="">Select Division</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Main POC</label>
            <select
              value={form.assigned_to}
              onChange={e => setForm(prev => ({ ...prev, assigned_to: e.target.value ? parseInt(e.target.value) : '' }))}
            >
              <option value="">Unassigned</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Collaborators <span className="text-muted text-sm" style={{ fontWeight: 400 }}>(optional)</span></label>
          <div className="tag-picker">
            {people.filter(p => p.id !== form.assigned_to).map(p => (
              <button
                key={p.id}
                type="button"
                className={`tag-picker-item ${form.collaborators.includes(p.id) ? 'selected' : ''}`}
                style={{
                  '--tag-color': '#6366f1',
                  background: form.collaborators.includes(p.id) ? '#6366f1' : 'transparent',
                  color: form.collaborators.includes(p.id) ? '#fff' : '#6366f1',
                  borderColor: '#6366f1',
                }}
                onClick={() => toggleCollaborator(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          {form.collaborators.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
              {form.collaborators.length} collaborator{form.collaborators.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            Linked To
            <span className="text-muted text-sm" style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <div className="form-row" style={{ gap: '0.5rem' }}>
            <select
              value={form.style_id}
              onChange={e => setForm(prev => ({ ...prev, style_id: e.target.value ? parseInt(e.target.value) : '' }))}
            >
              <option value="">No Style</option>
              {styles.map(s => (
                <option key={s.id} value={s.id}>{s.style_number} - {s.name}</option>
              ))}
            </select>
            <select
              value={form.supplier_id}
              onChange={e => setForm(prev => ({ ...prev, supplier_id: e.target.value ? parseInt(e.target.value) : '' }))}
            >
              <option value="">No Supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={form.purchase_order_id}
              onChange={e => setForm(prev => ({ ...prev, purchase_order_id: e.target.value ? parseInt(e.target.value) : '' }))}
            >
              <option value="">No PO</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>{po.po_number}</option>
              ))}
            </select>
            <select
              value={form.range_id}
              onChange={e => setForm(prev => ({ ...prev, range_id: e.target.value || '' }))}
            >
              <option value="">No Range</option>
              {ranges.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tag-picker">
            {TASK_TAGS.map(tag => (
              <button
                key={tag.value}
                type="button"
                className={`tag-picker-item ${form.tags.includes(tag.value) ? 'selected' : ''}`}
                style={{
                  '--tag-color': tag.color,
                  background: form.tags.includes(tag.value) ? tag.color : 'transparent',
                  color: form.tags.includes(tag.value) ? '#fff' : tag.color,
                  borderColor: tag.color,
                }}
                onClick={() => toggleTag(tag.value)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.title.trim()}>
            {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
