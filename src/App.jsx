import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SeasonProvider } from './contexts/SeasonContext'
import { ToastProvider } from './contexts/ToastContext'
import { getPeople, getPersonByEmail, getPersonByUserId, createPerson, updatePerson } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'

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
      <SeasonProvider>
        <Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="styles" element={<Styles />} />
            <Route path="styles/:id" element={<StyleDetail />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/:id" element={<SupplierDetail />} />
            <Route path="materials" element={<Materials />} />
            <Route path="samples" element={<Samples />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="team" element={<Team />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="requests" element={<StyleRequests />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="range-planning" element={<RangePlanning />} />
            <Route path="range-planning/:id" element={<RangeDetail />} />
            <Route path="activity" element={<Activity />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
        </Suspense>
      </SeasonProvider>
      </ToastProvider>
    </AppContext.Provider>
  )
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
