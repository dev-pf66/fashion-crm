import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getTask, deleteTask, getTaskSubtasks, createTaskSubtask, updateTaskSubtask, deleteTaskSubtask } from '../lib/supabase'
import { TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import CommentSection from './CommentSection'
import TaskForm from './TaskForm'
import { Pencil, Trash2, Calendar, User, Flag, Tag, Link2, Plus, X, CheckSquare } from 'lucide-react'

export default function TaskDetail({ taskId, onClose, onUpdate }) {
  const { currentPerson } = useApp()
  const toast = useToast()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [subtasks, setSubtasks] = useState([])
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)

  useEffect(() => {
    loadTask()
  }, [taskId])

  async function loadTask() {
    try {
      setLoading(true)
      const [data, subs] = await Promise.all([
        getTask(taskId),
        getTaskSubtasks(taskId),
      ])
      setTask(data)
      setSubtasks(subs || [])
    } catch (err) {
      console.error('Failed to load task:', err)
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    try {
      await deleteTask(taskId)
      toast.success('Task deleted')
      onUpdate()
      onClose()
    } catch (err) {
      console.error('Failed to delete task:', err)
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddSubtask(e) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    try {
      const sub = await createTaskSubtask({
        task_id: taskId,
        title: newSubtask.trim(),
        sort_order: subtasks.length,
      })
      setSubtasks(prev => [...prev, sub])
      setNewSubtask('')
      setAddingSubtask(false)
      onUpdate()
    } catch (err) {
      console.error('Failed to add subtask:', err)
      toast.error('Failed to add subtask')
    }
  }

  async function handleToggleSubtask(sub) {
    try {
      const updated = await updateTaskSubtask(sub.id, { completed: !sub.completed })
      setSubtasks(prev => prev.map(s => s.id === sub.id ? updated : s))
      onUpdate()
    } catch (err) {
      console.error('Failed to toggle subtask:', err)
    }
  }

  async function handleDeleteSubtask(subId) {
    try {
      await deleteTaskSubtask(subId)
      setSubtasks(prev => prev.filter(s => s.id !== subId))
      onUpdate()
    } catch (err) {
      console.error('Failed to delete subtask:', err)
    }
  }

  if (showEdit && task) {
    return (
      <TaskForm
        task={task}
        onClose={() => setShowEdit(false)}
        onSave={() => {
          setShowEdit(false)
          loadTask()
          onUpdate()
        }}
      />
    )
  }

  const priority = task ? TASK_PRIORITIES.find(p => p.value === task.priority) : null
  const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const subtasksDone = subtasks.filter(s => s.completed).length
  const subtasksTotal = subtasks.length
  const subtaskPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0

  const linkedEntities = []
  if (task?.styles) linkedEntities.push({ label: task.styles.style_number, type: 'Style', color: 'var(--info)' })
  if (task?.suppliers) linkedEntities.push({ label: task.suppliers.name, type: 'Supplier', color: 'var(--warning)' })
  if (task?.purchase_orders) linkedEntities.push({ label: task.purchase_orders.po_number, type: 'PO', color: 'var(--primary)' })

  return (
    <Modal title={loading ? 'Loading...' : task?.title || 'Task'} onClose={onClose} large>
      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : !task ? (
        <p>Task not found.</p>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <StatusBadge status={task.status} />
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
              <Pencil size={14} /> Edit
            </button>
            <button
              className="btn btn-sm"
              style={{ color: 'var(--danger)' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>

          <div className="detail-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div>
              <div className="text-muted text-sm" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Flag size={12} /> Priority
              </div>
              {priority && (
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  background: priority.color,
                  color: priority.textColor,
                }}>
                  {priority.label}
                </span>
              )}
            </div>
            <div>
              <div className="text-muted text-sm" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={12} /> Assigned To
              </div>
              <div style={{ fontSize: '0.875rem' }}>{task.people?.name || 'Unassigned'}</div>
            </div>
            <div>
              <div className="text-muted text-sm" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={12} /> Due Date
              </div>
              <div style={{ fontSize: '0.875rem', color: isOverdue ? 'var(--danger)' : undefined }}>
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'No due date'}
              </div>
            </div>
            <div>
              <div className="text-muted text-sm" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={12} /> Created By
              </div>
              <div style={{ fontSize: '0.875rem' }}>{task.creator?.name || 'Unknown'}</div>
            </div>
          </div>

          {linkedEntities.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="text-muted text-sm" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Link2 size={12} /> Linked To
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {linkedEntities.map((e, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '3px 10px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: e.color,
                      color: '#fff',
                    }}
                  >
                    {e.type}: {e.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="text-muted text-sm" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Tag size={12} /> Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {task.tags.map(tag => {
                  const tagConfig = TASK_TAGS.find(t => t.value === tag)
                  return (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: tagConfig?.color || '#94a3b8',
                        color: '#fff',
                      }}
                    >
                      {tagConfig?.label || tag}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {task.description && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>Description</div>
              <div style={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                background: 'var(--gray-50)',
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
              }}>
                {task.description}
              </div>
            </div>
          )}

          {/* Subtasks / Checklist */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckSquare size={12} /> Subtasks
                {subtasksTotal > 0 && <span>({subtasksDone}/{subtasksTotal})</span>}
              </div>
              {!addingSubtask && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAddingSubtask(true)}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {subtasksTotal > 0 && (
              <div style={{
                height: 4,
                background: 'var(--gray-100)',
                borderRadius: 2,
                marginBottom: '0.5rem',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${subtaskPercent}%`,
                  background: subtaskPercent === 100 ? 'var(--success)' : 'var(--primary)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subtasks.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'var(--radius)',
                    background: 'var(--gray-50)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() => handleToggleSubtask(sub)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{
                    flex: 1,
                    fontSize: '0.8125rem',
                    textDecoration: sub.completed ? 'line-through' : 'none',
                    color: sub.completed ? 'var(--gray-400)' : 'var(--gray-700)',
                  }}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(sub.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: 'var(--gray-400)',
                      display: 'flex',
                    }}
                    title="Delete subtask"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {addingSubtask && (
              <form onSubmit={handleAddSubtask} style={{ marginTop: '0.375rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    placeholder="Subtask title..."
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtask('') } }}
                    style={{ flex: 1, fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newSubtask.trim()}>Add</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddingSubtask(false); setNewSubtask('') }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <CommentSection
            entityType="task"
            entityId={String(task.id)}
            linkPath="/tasks"
          />
        </div>
      )}
    </Modal>
  )
}
