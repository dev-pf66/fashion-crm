import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useSeason } from '../contexts/SeasonContext'
import { useToast } from '../contexts/ToastContext'
import { createTask, updateTask, createNotification, getStyles, getSuppliers, getPurchaseOrders } from '../lib/supabase'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'
import Modal from './Modal'

export default function TaskForm({ task, onClose, onSave }) {
  const { currentPerson, people } = useApp()
  const { currentSeason } = useSeason()
  const toast = useToast()
  const isEdit = !!task

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: '',
    due_date: '',
    tags: [],
    style_id: '',
    supplier_id: '',
    purchase_order_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [styles, setStyles] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        due_date: task.due_date || '',
        tags: task.tags || [],
        style_id: task.style_id || '',
        supplier_id: task.supplier_id || '',
        purchase_order_id: task.purchase_order_id || '',
      })
    }
  }, [task])

  useEffect(() => {
    loadEntities()
  }, [currentSeason])

  async function loadEntities() {
    try {
      const promises = [
        getSuppliers(),
      ]
      if (currentSeason) {
        promises.push(getStyles(currentSeason.id))
        promises.push(getPurchaseOrders(currentSeason.id))
      } else {
        promises.push(Promise.resolve([]))
        promises.push(Promise.resolve([]))
      }
      const [suppData, styleData, poData] = await Promise.all(promises)
      setSuppliers(suppData || [])
      setStyles(styleData || [])
      setPurchaseOrders(poData || [])
    } catch (err) {
      console.error('Failed to load entities:', err)
    }
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
        due_date: form.due_date || null,
        tags: form.tags,
        style_id: form.style_id || null,
        supplier_id: form.supplier_id || null,
        purchase_order_id: form.purchase_order_id || null,
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
            link: '/tasks',
            from_person_id: currentPerson?.id,
          })
        }
        toast.success('Task updated')
      } else {
        payload.created_by = currentPerson?.id || null
        await createTask(payload)
        // Notify assignee
        if (form.assigned_to && form.assigned_to !== currentPerson?.id) {
          await createNotification({
            person_id: form.assigned_to,
            type: 'assignment',
            title: `${currentPerson?.name || 'Someone'} assigned you a task`,
            message: form.title,
            link: '/tasks',
            from_person_id: currentPerson?.id,
          })
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

        <div className="form-row">
          <div className="form-group">
            <label>Assigned To</label>
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
