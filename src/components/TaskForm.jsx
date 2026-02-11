import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { createTask, updateTask, createNotification } from '../lib/supabase'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'
import Modal from './Modal'

export default function TaskForm({ task, onClose, onSave }) {
  const { currentPerson, people } = useApp()
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
  })
  const [saving, setSaving] = useState(false)

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
      })
    }
  }, [task])

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
