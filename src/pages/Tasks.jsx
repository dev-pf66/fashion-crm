import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { useToast } from '../contexts/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import { getTasks, updateTask, updateTaskOrder, getTaskSubtaskCounts } from '../lib/supabase'
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TAGS } from '../lib/constants'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import TaskDetail from '../components/TaskDetail'
import StatusBadge from '../components/StatusBadge'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import usePagination, { PaginationBar } from '../lib/usePagination'
import { KanbanSkeleton } from '../components/PageSkeleton'
import EmptyState from '../components/EmptyState'
import { Plus, CheckSquare, LayoutGrid, List, X, Clock, User, Timer } from 'lucide-react'

export default function Tasks() {
  const { people } = useApp()
  const { currentDivision } = useDivision()
  const toast = useToast()
  const { can } = usePermissions()
  const canEdit = can('tasks.edit')
  const [tasks, setTasks] = useState([])
  const [subtaskCounts, setSubtaskCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedTaskId, setSelectedTaskId] = useState(() => {
    const p = searchParams.get('task')
    return p ? parseInt(p) : null
  })
  const [view, setView] = useState('board')

  // Open task detail when ?task=<id> changes in URL
  useEffect(() => {
    const taskParam = searchParams.get('task')
    if (taskParam) {
      setSelectedTaskId(parseInt(taskParam))
    } else {
      setSelectedTaskId(null)
    }
  }, [searchParams])

  const [filters, setFilters] = useState({
    search: '',
    assigned_to: '',
    priority: '',
    status: '',
    tag: '',
  })

  useEffect(() => {
    loadTasks()
  }, [currentDivision])

  async function loadTasks() {
    setLoading(true)
    try {
      const [data, counts] = await Promise.all([
        getTasks({ division_id: currentDivision?.id }),
        getTaskSubtaskCounts(),
      ])
      setTasks(data || [])
      setSubtaskCounts(counts || {})
    } catch (err) {
      console.error('Failed to load tasks:', err)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const hasActiveFilters = filters.search || filters.assigned_to || filters.priority || filters.status || filters.tag

  function clearFilters() {
    setFilters({ search: '', assigned_to: '', priority: '', status: '', tag: '' })
  }

  function filterTasks(taskList) {
    return taskList.filter(t => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!(t.title || '').toLowerCase().includes(q)) return false
      }
      if (filters.assigned_to && t.people?.id !== parseInt(filters.assigned_to)) return false
      if (filters.priority && t.priority !== filters.priority) return false
      if (filters.status && t.status !== filters.status) return false
      if (filters.tag && !(t.tags || []).includes(filters.tag)) return false
      return true
    })
  }

  const filtered = useMemo(() => filterTasks(tasks), [tasks, filters])
  const pagination = usePagination(filtered)

  const columns = useMemo(() => TASK_STATUSES.map(status => ({
    ...status,
    tasks: filtered.filter(t => t.status === status.value),
  })), [filtered])

  const handleTaskClick = useCallback((taskId) => {
    setSelectedTaskId(taskId)
    setSearchParams(taskId ? { task: taskId } : {}, { replace: true })
  }, [setSearchParams])

  async function handleDragEnd(result) {
    if (!canEdit) return
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const taskId = parseInt(draggableId.replace('task-', ''))
    const newStatus = destination.droppableId

    // Build updated task list with new status and sort orders
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)

    // Get tasks in the destination column (after status update)
    const destTasks = updatedTasks
      .filter(t => t.status === newStatus && t.id !== taskId)

    // Insert the moved task at the correct index
    const movedTask = updatedTasks.find(t => t.id === taskId)
    destTasks.splice(destination.index, 0, movedTask)

    // Assign sort_order to all tasks in destination column
    const orderUpdates = destTasks.map((t, i) => ({ id: t.id, sort_order: i }))

    // Optimistic update
    const newTasks = tasks.map(t => {
      const orderItem = orderUpdates.find(o => o.id === t.id)
      if (t.id === taskId) return { ...t, status: newStatus, sort_order: destination.index }
      if (orderItem) return { ...t, sort_order: orderItem.sort_order }
      return t
    })
    setTasks(newTasks)

    try {
      await Promise.all([
        updateTask(taskId, { status: newStatus }),
        updateTaskOrder(orderUpdates),
      ])
    } catch (err) {
      console.error('Failed to update task:', err)
      toast.error('Failed to update status')
      loadTasks()
    }
  }

  function getInitials(name) {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  if (loading) return <KanbanSkeleton />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="subtitle">Manage and track team tasks</p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')} title="Board view">
              <LayoutGrid size={16} />
            </button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view">
              <List size={16} />
            </button>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        <select
          value={filters.assigned_to}
          onChange={e => setFilters(prev => ({ ...prev, assigned_to: e.target.value }))}
        >
          <option value="">All Assignees</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value }))}
        >
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {TASK_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.tag}
          onChange={e => setFilters(prev => ({ ...prev, tag: e.target.value }))}
        >
          <option value="">All Tags</option>
          {TASK_TAGS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} title="Clear filters">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description={canEdit ? 'Create a task to get started.' : 'Nothing here yet.'}
            cta={canEdit ? { label: 'New Task', onClick: () => setShowForm(true) } : undefined}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CheckSquare}
            title="No tasks match your filters"
            description="Try adjusting your filter criteria."
            cta={{ label: 'Clear Filters', onClick: clearFilters, variant: 'secondary' }}
          />
        </div>
      ) : view === 'board' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {columns.map(col => (
              <Droppable key={col.value} droppableId={col.value}>
                {(provided, snapshot) => (
                  <div
                    className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    <div className="kanban-column-header">
                      <span>{col.label}</span>
                      <span className="kanban-count">{col.tasks.length}</span>
                    </div>
                    <div
                      className="kanban-column-body"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {col.tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={`task-${task.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'task-card-dragging' : ''}
                            >
                              <TaskCard
                                task={task}
                                onClick={handleTaskClick}
                                subtaskCount={subtaskCounts[task.id]}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Age</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {pagination.paged.map(task => {
                const priority = TASK_PRIORITIES.find(p => p.value === task.priority)
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                const sc = subtaskCounts[task.id]
                return (
                  <tr
                    key={task.id}
                    className="clickable"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <td style={{ fontWeight: 500 }}>
                      {task.title}
                      {sc && sc.total > 0 && (
                        <span className="text-muted text-sm" style={{ marginLeft: '0.5rem' }}>
                          ✓ {sc.done}/{sc.total}
                        </span>
                      )}
                    </td>
                    <td><StatusBadge status={task.status} /></td>
                    <td>
                      {priority && (
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: priority.color,
                          color: priority.textColor,
                        }}>
                          {priority.label}
                        </span>
                      )}
                    </td>
                    <td>
                      {task.status !== 'done' && (() => {
                        const age = Math.floor((new Date() - new Date(task.created_at)) / 86400000)
                        const isStale = task.status === 'todo' && age >= 7
                        return (
                          <span className={`task-age-badge ${isStale ? 'stale' : age >= 14 ? 'old' : ''}`}>
                            <Timer size={10} />
                            {age}d
                          </span>
                        )
                      })()}
                    </td>
                    <td>
                      {task.people ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="task-card-avatar" style={{ width: 24, height: 24, fontSize: '0.625rem' }}>
                            {getInitials(task.people.name)}
                          </span>
                          {task.people.name}
                        </span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {task.due_date ? (
                        <span style={{ color: isOverdue ? 'var(--danger)' : undefined, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {(task.tags || []).slice(0, 2).map(tag => {
                          const tagConfig = TASK_TAGS.find(t => t.value === tag)
                          return (
                            <span
                              key={tag}
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '8px',
                                fontSize: '0.6875rem',
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <PaginationBar {...pagination} />
        </div>
      )}

      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadTasks() }}
        />
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => { setSelectedTaskId(null); setSearchParams({}, { replace: true }) }}
          onUpdate={loadTasks}
        />
      )}
    </div>
  )
}
