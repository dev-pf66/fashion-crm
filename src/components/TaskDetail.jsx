import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getTask, deleteTask } from '../lib/supabase'
import { TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import CommentSection from './CommentSection'
import TaskForm from './TaskForm'
import { Pencil, Trash2, Calendar, User, Flag, Tag } from 'lucide-react'

export default function TaskDetail({ taskId, onClose, onUpdate }) {
  const { currentPerson } = useApp()
  const toast = useToast()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadTask()
  }, [taskId])

  async function loadTask() {
    try {
      setLoading(true)
      const data = await getTask(taskId)
      setTask(data)
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
