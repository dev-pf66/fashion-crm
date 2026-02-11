import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'
import { getTasks, updateTask } from '../lib/supabase'
import { TASK_STATUSES, TASK_PRIORITIES } from '../lib/constants'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import TaskDetail from '../components/TaskDetail'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, CheckSquare } from 'lucide-react'

export default function Tasks() {
  const { people } = useApp()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  const [filters, setFilters] = useState({
    search: '',
    assigned_to: '',
    priority: '',
  })

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    setLoading(true)
    try {
      const data = await getTasks()
      setTasks(data || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  function filterTasks(taskList) {
    return taskList.filter(t => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!(t.title || '').toLowerCase().includes(q)) return false
      }
      if (filters.assigned_to && t.assigned_to !== parseInt(filters.assigned_to)) return false
      if (filters.priority && t.priority !== filters.priority) return false
      return true
    })
  }

  const filtered = filterTasks(tasks)

  const columns = TASK_STATUSES.map(status => ({
    ...status,
    tasks: filtered.filter(t => t.status === status.value),
  }))

  async function handleDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const taskId = parseInt(draggableId.replace('task-', ''))
    const newStatus = destination.droppableId

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    )

    try {
      await updateTask(taskId, { status: newStatus })
    } catch (err) {
      console.error('Failed to update task status:', err)
      toast.error('Failed to update status')
      loadTasks()
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="subtitle">Manage and track team tasks</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Task
          </button>
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
      </div>

      {filtered.length === 0 && tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CheckSquare size={48} />
            <h3>No tasks yet</h3>
            <p>Create a task to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Task
            </button>
          </div>
        </div>
      ) : (
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
                                onClick={() => setSelectedTaskId(task.id)}
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
          onClose={() => setSelectedTaskId(null)}
          onUpdate={loadTasks}
        />
      )}
    </div>
  )
}
