import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeason } from '../contexts/SeasonContext'
import { getCalendarEvents } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  FlaskConical, ClipboardList, Scissors, Truck, CheckSquare
} from 'lucide-react'

const EVENT_COLORS = {
  sample: 'var(--info)',
  po_exfactory: 'var(--warning)',
  po_delivery: 'var(--primary)',
  style_dev: 'var(--success)',
  style_delivery: '#8b5cf6',
  task: '#f97316',
}

const EVENT_ICONS = {
  sample: FlaskConical,
  po_exfactory: Truck,
  po_delivery: ClipboardList,
  style_dev: Scissors,
  style_delivery: Scissors,
  task: CheckSquare,
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Calendar() {
  const { currentSeason } = useSeason()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('month')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (currentSeason) loadEvents()
  }, [currentSeason, year, month])

  async function loadEvents() {
    setLoading(true)
    try {
      // Load 2 months around current view
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10)
      const end = new Date(year, month + 2, 0).toISOString().slice(0, 10)
      const data = await getCalendarEvents(currentSeason.id, start, end)
      setEvents(data)
    } catch (err) {
      console.error('Failed to load calendar events:', err)
    } finally {
      setLoading(false)
    }
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells = []
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) })
  }
  // Fill remaining cells
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) })
  }

  function getEventsForDate(date) {
    const dateStr = date.toISOString().slice(0, 10)
    return events.filter(e => e.date === dateStr)
  }

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Upcoming events list
  const upcoming = events
    .filter(e => e.date >= todayStr)
    .slice(0, 15)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p className="subtitle">Key dates and deadlines</p>
        </div>
        <div className="page-header-actions">
          <div className="view-toggle">
            <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Month</button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
          </div>
        </div>
      </div>

      <div className="calendar-controls">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <h2 className="calendar-title">{MONTHS[month]} {year}</h2>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
        <button className="btn btn-secondary btn-sm" onClick={goToday} style={{ marginLeft: '0.5rem' }}>Today</button>
      </div>

      {view === 'month' ? (
        <div className="calendar-grid card">
          <div className="calendar-header-row">
            {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
          </div>
          <div className="calendar-body">
            {cells.map((cell, i) => {
              const dateStr = cell.date.toISOString().slice(0, 10)
              const dayEvents = getEventsForDate(cell.date)
              const isToday = dateStr === todayStr
              return (
                <div
                  key={i}
                  className={`calendar-cell ${!cell.inMonth ? 'out-of-month' : ''} ${isToday ? 'today' : ''}`}
                >
                  <div className="calendar-cell-day">{cell.day}</div>
                  <div className="calendar-cell-events">
                    {dayEvents.slice(0, 3).map(evt => {
                      const Icon = EVENT_ICONS[evt.type] || CalendarIcon
                      return (
                        <div
                          key={evt.id}
                          className="calendar-event"
                          style={{ borderLeftColor: EVENT_COLORS[evt.type] || 'var(--gray-400)' }}
                          onClick={() => evt.link && navigate(evt.link)}
                          title={evt.title}
                        >
                          <Icon size={10} />
                          <span>{evt.title}</span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="calendar-event-more">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="calendar-list">
          {loading ? (
            <div className="loading-container"><div className="loading-spinner" /></div>
          ) : upcoming.length === 0 ? (
            <div className="card"><div className="empty-state">
              <CalendarIcon size={48} />
              <h3>No upcoming events</h3>
              <p>Add dates to styles, samples, and POs to see them here.</p>
            </div></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(evt => {
                    const Icon = EVENT_ICONS[evt.type] || CalendarIcon
                    const typeName = evt.type.replace(/_/g, ' ').replace('po ', 'PO ').replace('style ', 'Style ')
                    return (
                      <tr
                        key={evt.id}
                        className="clickable"
                        onClick={() => evt.link && navigate(evt.link)}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(evt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Icon size={14} style={{ color: EVENT_COLORS[evt.type] }} />
                            {evt.title}
                          </div>
                        </td>
                        <td>
                          <span className="tag" style={{ borderLeft: `3px solid ${EVENT_COLORS[evt.type]}` }}>{typeName}</span>
                        </td>
                        <td><StatusBadge status={evt.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'month' && (
        <div className="calendar-legend">
          {Object.entries(EVENT_COLORS).map(([type, color]) => (
            <div key={type} className="calendar-legend-item">
              <div className="calendar-legend-dot" style={{ background: color }} />
              <span>{type.replace(/_/g, ' ').replace('po ', 'PO ').replace('style ', 'Style ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
