import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { useApp } from '../App'
import FeedbackButton from './FeedbackButton'
import NotificationBell from './NotificationBell'
import CommandPalette from './CommandPalette'
import {
  LayoutDashboard, Scissors, Factory, Palette,
  FlaskConical, Users, Settings, LogOut,
  ClipboardList, Clock, HelpCircle, Menu, X, Search, CalendarDays, FileText, Layers, CheckSquare
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Sourcing',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/styles', icon: Scissors, label: 'Styles' },
      { to: '/suppliers', icon: Factory, label: 'Suppliers' },
      { to: '/orders', icon: ClipboardList, label: 'Orders' },
      { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    ]
  },
  {
    label: 'Development',
    items: [
      { to: '/materials', icon: Palette, label: 'Materials' },
      { to: '/samples', icon: FlaskConical, label: 'Samples' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      { to: '/requests', icon: FileText, label: 'Requests' },
      { to: '/range-planning', icon: Layers, label: 'Range Plan' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { to: '/team', icon: Users, label: 'Team' },
      { to: '/activity', icon: Clock, label: 'Activity' },
      { to: '/help', icon: HelpCircle, label: 'Help' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

export default function Layout() {
  const { currentPerson } = useApp()
  const { user, signOut } = useAuth()
  const { seasons, currentSeason, changeSeason, loading: seasonsLoading } = useSeason()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

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
    ? currentPerson.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

        <button className="sidebar-search-btn" onClick={() => setCommandPaletteOpen(true)}>
          <Search size={14} />
          <span>Search...</span>
          <kbd>&#8984;K</kbd>
        </button>

        {!seasonsLoading && seasons.length > 0 && (
          <div className="season-selector">
            <select
              value={currentSeason?.id || ''}
              onChange={e => {
                const season = seasons.find(s => s.id.toString() === e.target.value)
                if (season) changeSeason(season)
              }}
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              <ul className="sidebar-nav">
                {section.items.map(item => (
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
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentPerson?.name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
            <NotificationBell />
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
        {[
          { to: '/', icon: LayoutDashboard, label: 'Home' },
          { to: '/styles', icon: Scissors, label: 'Styles' },
          { to: '/range-planning', icon: Layers, label: 'Ranges' },
          { to: '/samples', icon: FlaskConical, label: 'Samples' },
          { to: '/orders', icon: ClipboardList, label: 'Orders' },
        ].map(tab => (
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
