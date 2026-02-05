import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { useApp } from '../App'
import {
  LayoutDashboard, Scissors, Factory, Palette,
  FlaskConical, Users, Settings, LogOut
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Sourcing',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/styles', icon: Scissors, label: 'Styles' },
      { to: '/suppliers', icon: Factory, label: 'Suppliers' },
    ]
  },
  {
    label: 'Development',
    items: [
      { to: '/materials', icon: Palette, label: 'Materials' },
      { to: '/samples', icon: FlaskConical, label: 'Samples' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { to: '/team', icon: Users, label: 'Team' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
]

export default function Layout() {
  const { currentPerson } = useApp()
  const { user, signOut } = useAuth()
  const { seasons, currentSeason, changeSeason, loading: seasonsLoading } = useSeason()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = currentPerson
    ? currentPerson.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || '?').toUpperCase()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">✂</div>
          <h1>Sourcing CRM</h1>
        </div>

        {!seasonsLoading && seasons.length > 0 && (
          <div className="season-selector">
            <select
              value={currentSeason?.id || ''}
              onChange={e => changeSeason(e.target.value)}
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
                    <NavLink to={item.to} end={item.to === '/'}>
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
    </div>
  )
}
