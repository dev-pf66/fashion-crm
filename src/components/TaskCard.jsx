import { Clock, User } from 'lucide-react'
import { TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'

function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function TaskCard({ task, onClick }) {
  const priority = TASK_PRIORITIES.find(p => p.value === task.priority) || TASK_PRIORITIES[1]
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const tags = (task.tags || []).slice(0, 3)

  return (
    <div
      className={`task-card priority-${task.priority}`}
      onClick={onClick}
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
        {task.due_date ? (
          <span className={`task-card-date ${isOverdue ? 'overdue' : ''}`}>
            <Clock size={12} />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : <span />}
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
}
