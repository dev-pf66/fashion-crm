import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DivisionProvider } from './contexts/DivisionContext'
import { ToastProvider } from './contexts/ToastContext'
import { getPeople, getPersonByEmail, getPersonByUserId, createPerson, updatePerson } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import OnboardingWizard from './components/OnboardingWizard'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Styles = lazy(() => import('./pages/Styles'))
const StyleDetail = lazy(() => import('./pages/StyleDetail'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const SupplierDetail = lazy(() => import('./pages/SupplierDetail'))
const Materials = lazy(() => import('./pages/Materials'))
const Team = lazy(() => import('./pages/Team'))
const Samples = lazy(() => import('./pages/Samples'))
const Settings = lazy(() => import('./pages/Settings'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Activity = lazy(() => import('./pages/Activity'))
const Help = lazy(() => import('./pages/Help'))
const Calendar = lazy(() => import('./pages/Calendar'))
const StyleRequests = lazy(() => import('./pages/StyleRequests'))
const RangePlanning = lazy(() => import('./pages/RangePlanning'))
const RangeDetail = lazy(() => import('./pages/RangeDetail'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Notifications = lazy(() => import('./pages/Notifications'))
const ByEmbroidery = lazy(() => import('./pages/ByEmbroidery'))
const ProductionBoard = lazy(() => import('./pages/ProductionBoard'))
const ContentCalendar = lazy(() => import('./pages/ContentCalendar'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const MyWork = lazy(() => import('./pages/MyWork'))
const RangeDashboard = lazy(() => import('./pages/RangeDashboard'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

export const AppContext = createContext()

export function useApp() {
  return useContext(AppContext)
}

function AppRoutes() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [currentPerson, setCurrentPerson] = useState(null)
  const [people, setPeople] = useState([])
  const [appLoading, setAppLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAppData()
    } else if (!authLoading) {
      setAppLoading(false)
    }
  }, [isAuthenticated, user, authLoading])

  async function loadAppData() {
    try {
      const allPeople = await getPeople()
      setPeople(allPeople)

      // Primary lookup: by Supabase Auth user_id
      let person = allPeople.find(p => p.user_id === user.id)

      // Fallback: match by email (legacy records without user_id)
      if (!person) {
        person = allPeople.find(p => p.email === user.email)
        // Backfill user_id on the legacy record
        if (person && !person.user_id) {
          try {
            await updatePerson(person.id, { user_id: user.id })
            person.user_id = user.id
          } catch (err) {
            console.error('Failed to backfill user_id:', err)
          }
        }
      }

      // No record at all — create new person
      if (!person) {
        person = await createPerson({
          name: user.email.split('@')[0],
          email: user.email,
          user_id: user.id,
        })
        setPeople([...allPeople, person])
      }
      setCurrentPerson(person)
    } catch (err) {
      console.error('Failed to load app data:', err)
    } finally {
      setAppLoading(false)
    }
  }

  async function refreshPeople() {
    try {
      const data = await getPeople()
      setPeople(data)
      if (currentPerson) {
        const updated = data.find(p => p.id === currentPerson.id)
        if (updated) setCurrentPerson(updated)
      }
    } catch (err) {
      console.error('Failed to refresh people:', err)
    }
  }

  if (authLoading || appLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <AppContext.Provider value={{ currentPerson, people, setPeople, refreshPeople }}>
      <ToastProvider>
      <DivisionProvider>
        <OnboardingGate />
        <Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="styles" element={<Styles />} />
            <Route path="styles/:id" element={<StyleDetail />} />
            <Route path="suppliers" element={<ProtectedRoute action="suppliers.view"><Suppliers /></ProtectedRoute>} />
            <Route path="suppliers/:id" element={<ProtectedRoute action="suppliers.view"><SupplierDetail /></ProtectedRoute>} />
            <Route path="materials" element={<Materials />} />
            <Route path="samples" element={<Samples />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="team" element={<ProtectedRoute action="team.view"><Team /></ProtectedRoute>} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="requests" element={<StyleRequests />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="range-planning" element={<RangePlanning />} />
            <Route path="range-planning/:id" element={<RangeDetail />} />
            <Route path="by-embroidery" element={<ByEmbroidery />} />
            <Route path="production" element={<ProductionBoard />} />
            <Route path="my-work" element={<MyWork />} />
            <Route path="range-dashboard" element={<RangeDashboard />} />
            <Route path="content" element={<ContentCalendar />} />
            <Route path="admin" element={<ProtectedRoute action="admin.access"><AdminDashboard /></ProtectedRoute>} />
            <Route path="activity" element={<ProtectedRoute action="activity.view"><Activity /></ProtectedRoute>} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<ProtectedRoute action="settings.view"><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
        </Suspense>
      </DivisionProvider>
      </ToastProvider>
    </AppContext.Provider>
  )
}

function OnboardingGate() {
  const { currentPerson } = useApp()
  const [open, setOpen] = useState(true)
  if (!currentPerson || currentPerson.onboarded_at || !open) return null
  return <OnboardingWizard onClose={() => setOpen(false)} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
