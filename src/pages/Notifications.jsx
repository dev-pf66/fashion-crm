import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Search } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/supabase'
import { useApp } from '../App'
import { useToast } from '../contexts/ToastContext'

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Notifications() {
  const { currentPerson } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'read'
  const [search, setSearch] = useState('')

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!currentPerson?.id) return
    try {
      setLoading(true)
      const data = await getNotifications(currentPerson.id)
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [currentPerson?.id])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function handleClick(notification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }

  async function handleMarkRead(e, notification) {
    e.stopPropagation()
    if (notification.read) return
    try {
      await markNotificationRead(notification.id)
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
    } catch (err) {
      toast.error('Failed to mark as read')
    }
  }

  async function handleMarkAllRead() {
    if (!currentPerson?.id || unreadCount === 0) return
    try {
      await markAllNotificationsRead(currentPerson.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error('Failed to mark all as read')
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    if (search) {
      const q = search.toLowerCase()
      if (!n.title?.toLowerCase().includes(q) &&
          !n.message?.toLowerCase().includes(q) &&
          !n.from_person?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="page-header-actions">
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>
              <CheckCheck size={16} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="notif-page-filters">
        {['all', 'unread', 'read'].map(f => (
          <button
            key={f}
            className={`notif-page-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'unread' && unreadCount > 0 && (
              <span className="notif-page-filter-count">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="notif-page-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search notifications..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="notif-page-empty">
          <Bell size={48} />
          <h3>{filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}</h3>
          <p>When you get mentions, task assignments, or updates, they'll show up here.</p>
        </div>
      ) : (
        <div className="notif-page-list">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`notif-page-item ${!n.read ? 'unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <div className="notif-page-item-avatar">
                {n.from_person?.name ? getInitials(n.from_person.name) : '?'}
              </div>
              <div className="notif-page-item-body">
                <div className="notif-page-item-title">{n.title}</div>
                {n.message && (
                  <div className="notif-page-item-message">{n.message}</div>
                )}
                <div className="notif-page-item-meta">
                  {n.from_person?.name && (
                    <span className="notif-page-item-from">{n.from_person.name}</span>
                  )}
                  <span className="notif-page-item-time">{timeAgo(n.created_at)}</span>
                  {n.type && (
                    <span className="notif-page-item-type">{n.type}</span>
                  )}
                </div>
              </div>
              <div className="notif-page-item-actions">
                {!n.read && (
                  <button
                    className="notif-page-mark-btn"
                    onClick={(e) => handleMarkRead(e, n)}
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                {!n.read && <span className="notif-page-unread-dot" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
