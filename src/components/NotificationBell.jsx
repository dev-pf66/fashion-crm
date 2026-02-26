import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
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

export default function NotificationBell() {
  const { currentPerson } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!currentPerson?.id) return
    try {
      const data = await getNotifications(currentPerson.id)
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      toast.error('Failed to load notifications')
    }
  }, [currentPerson?.id])

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    setOpen(prev => !prev)
    if (!open) fetchNotifications()
  }

  function close() {
    setOpen(false)
  }

  async function handleClick(notification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        )
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
        toast.error('Failed to update notification')
      }
    }
    setOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  async function handleMarkAllRead() {
    if (!currentPerson?.id) return
    try {
      setLoading(true)
      await markAllNotificationsRead(currentPerson.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      toast.error('Failed to mark all as read')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={toggle} title="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <>
          <div className="notif-overlay" onClick={close} />
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <h4>Notifications</h4>
              <div className="notif-dropdown-header-actions">
                {unreadCount > 0 && (
                  <button
                    className="notif-mark-all-btn"
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    title="Mark all as read"
                  >
                    <Check size={14} />
                    Mark all read
                  </button>
                )}
                <button className="notif-close-btn" onClick={close} title="Close">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="notif-dropdown-list">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="notif-item-avatar">
                    {n.from_person?.name ? getInitials(n.from_person.name) : '?'}
                  </div>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-meta">
                      {n.from_person?.name && (
                        <span className="notif-item-from">{n.from_person.name}</span>
                      )}
                      <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.read && <span className="notif-unread-dot" />}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="notif-empty">No notifications</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
