import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDivision } from '../contexts/DivisionContext'
import { useApp } from '../App'
import {
  Layers, CheckSquare, Scissors, PackageCheck, Sparkles,
  CalendarDays, Bell, ArrowRight, X
} from 'lucide-react'

const QUICK_LINKS = [
  { to: '/range-planning', icon: Layers, label: 'Range Plan', desc: 'Plan your collections', color: '#4f46e5' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks', desc: 'View assigned work', color: '#0891b2' },
  { to: '/styles', icon: Scissors, label: 'Styles', desc: 'Browse all styles', color: '#d97706' },
  { to: '/production', icon: PackageCheck, label: 'Production', desc: 'Track production status', color: '#16a34a' },
  { to: '/content', icon: Sparkles, label: 'Content Hub', desc: 'Manage content pipeline', color: '#8b5cf6' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', desc: 'View upcoming deadlines', color: '#ec4899' },
  { to: '/notifications', icon: Bell, label: 'Notifications', desc: 'Stay updated on changes', color: '#f59e0b' },
]

export default function OnboardingWelcome() {
  const { currentPerson } = useApp()
  const { currentDivision } = useDivision()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('onboarding_dismissed') === 'true'
  )

  if (dismissed) return null

  const firstName = currentPerson?.name?.split(' ')[0] || 'there'
  const isSocial = currentDivision?.code === 'SOCIAL'

  const links = isSocial
    ? QUICK_LINKS.filter(l => ['/tasks', '/content', '/calendar', '/notifications'].includes(l.to))
    : QUICK_LINKS.filter(l => l.to !== '/content')

  function handleDismiss() {
    localStorage.setItem('onboarding_dismissed', 'true')
    setDismissed(true)
  }

  function handleNavigate(to) {
    navigate(to)
  }

  return (
    <div className="onboarding-welcome">
      <button className="onboarding-dismiss" onClick={handleDismiss} title="Dismiss">
        <X size={16} />
      </button>

      <div className="onboarding-header">
        <div className="onboarding-emoji">👋</div>
        <h2>Welcome, {firstName}!</h2>
        <p>Here's a quick overview to help you get started with the CRM.</p>
      </div>

      <div className="onboarding-grid">
        {links.map(link => (
          <button
            key={link.to}
            className="onboarding-card"
            onClick={() => handleNavigate(link.to)}
          >
            <div className="onboarding-card-icon" style={{ background: link.color + '15', color: link.color }}>
              <link.icon size={20} />
            </div>
            <div className="onboarding-card-text">
              <div className="onboarding-card-label">{link.label}</div>
              <div className="onboarding-card-desc">{link.desc}</div>
            </div>
            <ArrowRight size={14} className="onboarding-card-arrow" />
          </button>
        ))}
      </div>

      <div className="onboarding-footer">
        <button className="btn btn-ghost btn-sm" onClick={handleDismiss}>
          Don't show again
        </button>
      </div>
    </div>
  )
}
