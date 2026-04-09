import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDivision } from '../contexts/DivisionContext'
import { useApp } from '../App'
import { usePermissions } from '../hooks/usePermissions'
import FeedbackButton from './FeedbackButton'
import NotificationBell from './NotificationBell'
import CommandPalette from './CommandPalette'
import {
  LayoutDashboard, Scissors, Factory, Palette,
  FlaskConical, Users, Settings, LogOut,
  ClipboardList, Clock, HelpCircle, Menu, X, Search, CalendarDays, FileText, Layers, CheckSquare, Shield,
  Moon, Sun, Bell, Gem, PackageCheck, Sparkles, Briefcase, BarChart3
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Sourcing',
    hideForSocial: true,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', requiredAction: 'dashboard.view' },
      { to: '/styles', icon: Scissors, label: 'Styles', requiredAction: 'styles.view' },
      { to: '/suppliers', icon: Factory, label: 'Suppliers', requiredAction: 'suppliers.view' },
      { to: '/orders', icon: ClipboardList, label: 'Orders', requiredAction: 'orders.view' },
      { to: '/tasks', icon: CheckSquare, label: 'Tasks', requiredAction: 'tasks.view' },
      { to: '/notifications', icon: Bell, label: 'Notifications', requiredAction: 'notifications.view' },
    ]
  },
  {
    label: 'Development',
    hideForSocial: true,
    items: [
      { to: '/materials', icon: Palette, label: 'Materials', requiredAction: 'materials.view' },
      { to: '/samples', icon: FlaskConical, label: 'Samples', requiredAction: 'samples.view' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar', requiredAction: 'calendar.view' },
      { to: '/requests', icon: FileText, label: 'Requests', requiredAction: 'styles.view' },
      { to: '/range-planning', icon: Layers, label: 'Range Plan', requiredAction: 'range_plan.view' },
      { to: '/by-embroidery', icon: Gem, label: 'By Embroidery', requiredAction: 'range_plan.view' },
      { to: '/range-dashboard', icon: BarChart3, label: 'Dashboard', requiredAction: 'range_plan.view' },
      { to: '/my-work', icon: Briefcase, label: 'My Work' },
      { to: '/production', icon: PackageCheck, label: 'Production', requiredAction: 'production.view' },
    ]
  },
  {
    label: 'Social',
    socialOnly: true,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', requiredAction: 'dashboard.view' },
      { to: '/content', icon: Sparkles, label: 'Content Hub', requiredAction: 'content.view' },
      { to: '/tasks', icon: CheckSquare, label: 'Tasks', requiredAction: 'tasks.view' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar', requiredAction: 'calendar.view' },
      { to: '/notifications', icon: Bell, label: 'Notifications', requiredAction: 'notifications.view' },
    ]
  },
  {
    label: 'Content',
    hideForSocial: true,
    items: [
      { to: '/content', icon: Sparkles, label: 'Content Hub', requiredAction: 'content.view' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin', icon: Shield, label: 'Command Center', requiredAction: 'admin.access' },
      { to: '/team', icon: Users, label: 'Team', requiredAction: 'team.view' },
      { to: '/activity', icon: Clock, label: 'Activity', requiredAction: 'activity.view' },
      { to: '/help', icon: HelpCircle, label: 'Help' },
      { to: '/settings', icon: Settings, label: 'Settings', requiredAction: 'settings.view' },
    ]
  },
]

export default function Layout() {
  const { currentPerson } = useApp()
  const { user, signOut } = useAuth()
  const { can, hasRole } = usePermissions()
  const { divisions, currentDivision, changeDivision, loading: divisionsLoading } = useDivision()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => {
      if (prev === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return isDark ? 'light' : 'dark'
      }
      return prev === 'dark' ? 'light' : 'dark'
    })
  }

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = currentPerson
    ? currentPerson.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    : (user?.email?.[0] || '?').toUpperCase()

  return (
    <div className="app-layout">
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">&#9986;</div>
          <h1>Sourcing CRM</h1>
        </div>

        <button className="sidebar-search-btn" onClick={() => setCommandPaletteOpen(true)} aria-label="Search (Cmd+K)">
          <Search size={14} />
          <span>Search...</span>
          <kbd>&#8984;K</kbd>
        </button>

        {!divisionsLoading && divisions.length > 0 && (
          <div className="division-selector">
            <select
              value={currentDivision?.id || ''}
              onChange={e => {
                const div = divisions.find(s => s.id.toString() === e.target.value)
                if (div) changeDivision(div)
              }}
            >
              {divisions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav>
          {NAV_SECTIONS.map(section => {
            const isSocial = currentDivision?.code === 'SOCIAL'
            if (isSocial && section.hideForSocial) return null
            if (!isSocial && section.socialOnly) return null
            const items = section.items.filter(item => {
              if (item.requiredAction) return can(item.requiredAction)
              return true
            })
            if (items.length === 0) return null
            return (
            <div key={section.label} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              <ul className="sidebar-nav">
                {items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )})}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentPerson?.name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
            <NotificationBell />
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="sidebar-logout" onClick={handleSignOut} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="mobile-tab-bar">
        {(currentDivision?.code === 'SOCIAL'
          ? [
              { to: '/', icon: LayoutDashboard, label: 'Home' },
              { to: '/content', icon: Sparkles, label: 'Content' },
              { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
              { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
              { to: '/notifications', icon: Bell, label: 'Alerts' },
            ]
          : [
              { to: '/', icon: LayoutDashboard, label: 'Home' },
              { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
              { to: '/range-planning', icon: Layers, label: 'Ranges' },
              { to: '/notifications', icon: Bell, label: 'Alerts' },
              { to: '/orders', icon: ClipboardList, label: 'Orders' },
            ]
        ).map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className="mobile-tab"
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <FeedbackButton />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
