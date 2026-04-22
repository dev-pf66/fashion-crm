import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { useDivision } from '../contexts/DivisionContext'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../contexts/ToastContext'
import { updatePerson } from '../lib/supabase'
import {
  X, ArrowRight, ArrowLeft, CheckCircle, Sun, Moon, Repeat, Clock,
  Layers, CheckSquare, Scissors, PackageCheck, Sparkles, CalendarDays,
  Activity as ActivityIcon, Users, LayoutDashboard, FlaskConical,
  Shield, Truck, Camera, Palette, Briefcase, Mail, ChevronRight,
} from 'lucide-react'

// Plain-English role descriptions. Keys are role.name from the DB.
const ROLE_INFO = {
  admin: {
    icon: Shield,
    label: 'Admin',
    tagline: 'You have full access across the CRM.',
    can: ['Manage divisions, teams, and roles', 'See everything across every division', 'Invite users and assign roles', 'Run reports and audit activity'],
    cant: [],
  },
  merchandiser: {
    icon: Truck,
    label: 'Merchandiser',
    tagline: 'You plan ranges, track production, and manage supplier orders.',
    can: ['Plan and edit ranges', 'Create and assign styles', 'Manage purchase orders and suppliers', 'Update production stages', 'Create tasks for the team'],
    cant: ['Access admin settings', 'Manage team roles'],
  },
  social_media: {
    icon: Camera,
    label: 'Social Media',
    tagline: 'You manage the content pipeline across divisions.',
    can: ['See every piece across every division', 'Mark pieces for shoots and update content status', 'Schedule posts in Content Hub', 'Create and edit tasks'],
    cant: ['Edit team roles', 'Access admin activity logs'],
  },
  design: {
    icon: Palette,
    label: 'Design',
    tagline: 'You shape styles and track samples across divisions.',
    can: ['See every piece across every division', 'Create and edit styles', 'Request and review samples', 'Manage task assignments'],
    cant: ['Edit team roles', 'Access admin activity logs'],
  },
  marketing: {
    icon: Briefcase,
    label: 'Marketing',
    tagline: 'You run campaigns and track content delivery.',
    can: ['See every piece across every division', 'Track content status and calendar', 'Coordinate with social and design', 'Create tasks'],
    cant: ['Edit team roles', 'Access admin activity logs'],
  },
  viewer: {
    icon: LayoutDashboard,
    label: 'Viewer',
    tagline: 'You have read access to most of the CRM.',
    can: ['Browse ranges, styles, and the range plan', 'Check tasks assigned to you', 'View the production board and calendar'],
    cant: ['Create or edit anything', 'See supplier details'],
  },
}

// 3 priority pages per role. Each page must be a route the role can actually reach.
const ROLE_STARTING_POINTS = {
  admin: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'Your division at a glance' },
    { to: '/team', icon: Users, label: 'Team', desc: 'People, roles, and access' },
    { to: '/activity', icon: ActivityIcon, label: 'Activity', desc: 'Audit every change' },
  ],
  merchandiser: [
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', desc: 'What you owe today' },
    { to: '/range-planning', icon: Layers, label: 'Range Plan', desc: 'Plan your collection' },
    { to: '/styles', icon: Scissors, label: 'Styles', desc: 'Every piece in development' },
  ],
  social_media: [
    { to: '/content', icon: Sparkles, label: 'Content Hub', desc: 'Pieces needing shoots or edits' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', desc: 'Your assigned work' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', desc: 'Shoot schedule and deadlines' },
  ],
  design: [
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', desc: 'Your assigned work' },
    { to: '/styles', icon: Scissors, label: 'Styles', desc: 'Every piece in development' },
    { to: '/samples', icon: FlaskConical, label: 'Samples', desc: 'Rounds to review' },
  ],
  marketing: [
    { to: '/content', icon: Sparkles, label: 'Content Hub', desc: 'Content pipeline status' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', desc: 'Campaign deadlines' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', desc: 'Your assigned work' },
  ],
  viewer: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', desc: 'Division overview' },
    { to: '/range-planning', icon: Layers, label: 'Range Plan', desc: 'Current collection' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', desc: 'Your assigned work' },
  ],
}

// Options for Step 3 ("About you")
const WORK_RHYTHM = [
  { value: 'start_of_day', icon: Sun, label: 'Start of the day', desc: 'I update things in the morning' },
  { value: 'end_of_day', icon: Moon, label: 'End of the day', desc: 'I wrap up here in the evening' },
  { value: 'throughout_day', icon: Repeat, label: 'Throughout the day', desc: 'I check in several times' },
  { value: 'on_demand', icon: Clock, label: 'Only when I need to', desc: 'I come in when something needs doing' },
]
const USAGE_FREQUENCY = [
  { value: 'multiple_daily', label: 'Multiple times a day' },
  { value: 'daily', label: 'About once a day' },
  { value: 'few_weekly', label: 'A few times a week' },
  { value: 'occasionally', label: 'Occasionally' },
]
const TECH_FAMILIARITY = [
  { value: 'very', label: 'Very comfortable', desc: 'I use tools like this every day' },
  { value: 'somewhat', label: 'Somewhat comfortable', desc: "I've used a few similar tools" },
  { value: 'not_very', label: 'Not very comfortable', desc: 'This is mostly new to me — show extra tips' },
]

export default function OnboardingWizard({ onClose }) {
  const { currentPerson, refreshPeople } = useApp()
  const { role } = usePermissions()
  const { divisions, currentDivision, changeDivision } = useDivision()
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState({
    work_rhythm: null,
    usage_frequency: null,
    tech_familiarity: null,
    default_division_id: currentDivision?.id || null,
    home_page: '/',
  })

  const firstName = currentPerson?.name?.split(' ')[0] || 'there'
  const roleInfo = role?.name ? ROLE_INFO[role.name] : null
  const startingPoints = role?.name ? ROLE_STARTING_POINTS[role.name] : ROLE_STARTING_POINTS.viewer
  const RoleIcon = roleInfo?.icon || Shield

  const totalSteps = 4
  const canGoNext = (() => {
    if (step === 3) {
      return prefs.work_rhythm && prefs.usage_frequency && prefs.tech_familiarity
    }
    return true
  })()

  function updatePref(key, value) {
    setPrefs(p => ({ ...p, [key]: value }))
  }

  async function handleFinish() {
    if (!currentPerson) return
    setSaving(true)
    try {
      const payload = {
        onboarded_at: new Date().toISOString(),
        preferences: {
          ...(currentPerson.preferences || {}),
          ...prefs,
        },
      }
      const saved = await updatePerson(currentPerson.id, payload)
      console.log('[onboarding] saved for', currentPerson.id, saved?.preferences)
      await refreshPeople()

      // Honor the user's division + home page choice immediately.
      if (prefs.default_division_id && prefs.default_division_id !== currentDivision?.id) {
        const next = divisions.find(d => d.id === prefs.default_division_id)
        if (next) changeDivision(next)
      }

      toast.success(`All set — welcome aboard, ${firstName}.`)
      onClose?.()
      if (prefs.home_page && prefs.home_page !== window.location.pathname) {
        navigate(prefs.home_page)
      }
    } catch (err) {
      console.error('Onboarding save failed:', err)
      toast.error('Could not save — try again')
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    // Don't set onboarded_at — they see the wizard again next login.
    onClose?.()
  }

  // Only show division picker if user has access to more than one.
  const showDivisionPicker = (divisions?.length || 0) > 1

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-modal">
        <button className="onboarding-close" onClick={handleSkip} aria-label="Close">
          <X size={18} />
        </button>

        <div className="onboarding-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`onboarding-progress-dot ${i + 1 <= step ? 'active' : ''}`} />
          ))}
          <span className="onboarding-progress-label">Step {step} of {totalSteps}</span>
        </div>

        <div className="onboarding-body">
          {step === 1 && (
            <div className="onboarding-step">
              <div className="onboarding-role-badge">
                <RoleIcon size={28} />
              </div>
              <h2 id="onboarding-title">Welcome, {firstName}.</h2>
              {roleInfo ? (
                <>
                  <p className="onboarding-lead">
                    You're logged in as a <strong>{roleInfo.label}</strong>. {roleInfo.tagline}
                  </p>
                  <div className="onboarding-role-card">
                    <div className="onboarding-role-col">
                      <div className="onboarding-role-col-head">
                        <CheckCircle size={14} /> You can
                      </div>
                      <ul>
                        {roleInfo.can.map(c => <li key={c}>{c}</li>)}
                      </ul>
                    </div>
                    {roleInfo.cant.length > 0 && (
                      <div className="onboarding-role-col">
                        <div className="onboarding-role-col-head muted">
                          <X size={14} /> You can't
                        </div>
                        <ul>
                          {roleInfo.cant.map(c => <li key={c}>{c}</li>)}
                        </ul>
                        <p className="onboarding-role-note">Need more? Ask an admin.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="onboarding-lead">
                    You don't have a role assigned yet. Ask an admin to set one up so the right
                    pages show up for you.
                  </p>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <h2>Where to start</h2>
              <p className="onboarding-lead">
                Here are the three pages you'll probably live in most. You can get to everything
                else from the sidebar.
              </p>
              <div className="onboarding-starting-points">
                {startingPoints.map(sp => {
                  const Icon = sp.icon
                  return (
                    <div key={sp.to} className="onboarding-sp-card">
                      <div className="onboarding-sp-icon">
                        <Icon size={20} />
                      </div>
                      <div className="onboarding-sp-text">
                        <div className="onboarding-sp-label">{sp.label}</div>
                        <div className="onboarding-sp-desc">{sp.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="onboarding-hint">
                Tip: anything you create or edit is saved immediately — no "save" button.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <h2>A little about you</h2>
              <p className="onboarding-lead">
                Tell us how you work so we can tailor reminders and hints. This stays private.
              </p>

              <div className="onboarding-email-notice">
                <Mail size={14} />
                <span>You'll get one email at 9am IST each day for anything overdue assigned to you.</span>
              </div>

              <div className="onboarding-question">
                <label>When do you typically update the CRM?</label>
                <div className="onboarding-chip-grid">
                  {WORK_RHYTHM.map(opt => {
                    const Icon = opt.icon
                    const selected = prefs.work_rhythm === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`onboarding-chip ${selected ? 'selected' : ''}`}
                        onClick={() => updatePref('work_rhythm', opt.value)}
                      >
                        <Icon size={16} />
                        <div>
                          <div className="onboarding-chip-label">{opt.label}</div>
                          <div className="onboarding-chip-desc">{opt.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="onboarding-question">
                <label>How often will you use this?</label>
                <div className="onboarding-chip-row">
                  {USAGE_FREQUENCY.map(opt => {
                    const selected = prefs.usage_frequency === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`onboarding-chip-pill ${selected ? 'selected' : ''}`}
                        onClick={() => updatePref('usage_frequency', opt.value)}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="onboarding-question">
                <label>How comfortable are you with software like this?</label>
                <div className="onboarding-chip-grid">
                  {TECH_FAMILIARITY.map(opt => {
                    const selected = prefs.tech_familiarity === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`onboarding-chip ${selected ? 'selected' : ''}`}
                        onClick={() => updatePref('tech_familiarity', opt.value)}
                      >
                        <div>
                          <div className="onboarding-chip-label">{opt.label}</div>
                          <div className="onboarding-chip-desc">{opt.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-step">
              <h2>One last thing</h2>
              <p className="onboarding-lead">
                Quick settings so the CRM opens where you need it. You can change these later in Help.
              </p>

              {showDivisionPicker && (
                <div className="onboarding-question">
                  <label>Default division</label>
                  <p className="onboarding-q-desc">We'll pre-select this when you sign in.</p>
                  <select
                    value={prefs.default_division_id || ''}
                    onChange={e => updatePref('default_division_id', e.target.value ? Number(e.target.value) : null)}
                  >
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="onboarding-question">
                <label>Home page</label>
                <p className="onboarding-q-desc">Where should we take you after login?</p>
                <div className="onboarding-chip-row">
                  {(startingPoints.some(sp => sp.to === '/')
                    ? startingPoints
                    : [{ to: '/', icon: LayoutDashboard, label: 'Dashboard' }, ...startingPoints]
                  ).map(sp => {
                    const selected = prefs.home_page === sp.to
                    return (
                      <button
                        key={sp.to}
                        type="button"
                        className={`onboarding-chip-pill ${selected ? 'selected' : ''}`}
                        onClick={() => updatePref('home_page', sp.to)}
                      >
                        <sp.icon size={14} /> {sp.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <div /> {/* spacer to keep nav buttons right-aligned */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step > 1 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setStep(step - 1)} disabled={saving}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext || saving}
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={handleFinish} disabled={saving}>
                {saving ? 'Saving…' : 'Finish'} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
