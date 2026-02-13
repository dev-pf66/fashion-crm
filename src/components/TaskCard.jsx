import { memo } from 'react'
import { Clock, User, Link2, CheckSquare } from 'lucide-react'
import { TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'

function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const TaskCard = memo(function TaskCard({ task, onClick, subtaskCount }) {
  const priority = TASK_PRIORITIES.find(p => p.value === task.priority) || TASK_PRIORITIES[1]
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const tags = (task.tags || []).slice(0, 3)

  const linkedEntity = task.styles
    ? `${task.styles.style_number}`
    : task.suppliers
    ? task.suppliers.name
    : task.purchase_orders
    ? task.purchase_orders.po_number
    : null

  return (
    <div
      className={`task-card priority-${task.priority}`}
      onClick={() => onClick(task.id)}
    >
      <div className="task-card-header">
        <span
          className="task-card-priority"
          style={{ background: priority.color, color: priority.textColor }}
        >
          {priority.label}
        </span>
      </div>
      <div className="task-card-title">{task.title}</div>
      {linkedEntity && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
          <Link2 size={11} />
          <span>{linkedEntity}</span>
        </div>
      )}
      {tags.length > 0 && (
        <div className="task-card-tags">
          {tags.map(tag => {
            const tagConfig = TASK_TAGS.find(t => t.value === tag)
            return (
              <span
                key={tag}
                className="task-card-tag"
                style={{ background: tagConfig?.color || '#94a3b8', color: '#fff' }}
              >
                {tagConfig?.label || tag}
              </span>
            )
          })}
        </div>
      )}
      <div className="task-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {task.due_date ? (
            <span className={`task-card-date ${isOverdue ? 'overdue' : ''}`}>
              <Clock size={12} />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ) : <span />}
          {subtaskCount && subtaskCount.total > 0 && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.6875rem',
              color: subtaskCount.done === subtaskCount.total ? 'var(--success)' : 'var(--gray-500)',
            }}>
              <CheckSquare size={11} />
              {subtaskCount.done}/{subtaskCount.total}
            </span>
          )}
        </div>
        {task.people ? (
          <span className="task-card-avatar" title={task.people.name}>
            {getInitials(task.people.name)}
          </span>
        ) : (
          <span className="task-card-avatar unassigned" title="Unassigned">
            <User size={12} />
          </span>
        )}
      </div>
    </div>
  )
})

export default TaskCard
