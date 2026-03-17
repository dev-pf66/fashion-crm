import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/supabase'
import { useApp } from '../App'

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

export default function SidebarNotifications() {
  const { currentPerson } = useApp()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const [notifications, setNotifications] = useState([])

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!currentPerson?.id) return
    try {
      const data = await getNotifications(currentPerson.id)
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [currentPerson?.id])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
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

  async function handleMarkAllRead(e) {
    e.stopPropagation()
    if (!currentPerson?.id || unreadCount === 0) return
    try {
      await markAllNotificationsRead(currentPerson.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const displayNotifications = notifications.slice(0, 8)

  return (
    <div className="sidebar-notifications">
      <button
        className="sidebar-notifications-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="sidebar-notifications-title">
          <Bell size={14} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="sidebar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </div>
        <div className="sidebar-notifications-actions">
          {unreadCount > 0 && (
            <button
              className="sidebar-notif-mark-all"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <Check size={12} />
            </button>
          )}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="sidebar-notifications-list">
          {displayNotifications.length === 0 ? (
            <div className="sidebar-notif-empty">No notifications</div>
          ) : (
            displayNotifications.map(n => (
              <button
                key={n.id}
                className={`sidebar-notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className="sidebar-notif-avatar">
                  {n.from_person?.name ? getInitials(n.from_person.name) : '?'}
                </div>
                <div className="sidebar-notif-content">
                  <div className="sidebar-notif-title">{n.title}</div>
                  <div className="sidebar-notif-meta">
                    {n.from_person?.name && (
                      <span className="sidebar-notif-from">{n.from_person.name}</span>
                    )}
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                </div>
                {!n.read && <span className="sidebar-notif-dot" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
