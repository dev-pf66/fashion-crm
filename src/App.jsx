import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SeasonProvider } from './contexts/SeasonContext'
import { getPeople, getPersonByEmail, createPerson } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Styles from './pages/Styles'
import StyleDetail from './pages/StyleDetail'
import Suppliers from './pages/Suppliers'
import SupplierDetail from './pages/SupplierDetail'
import Materials from './pages/Materials'
import Team from './pages/Team'
import Samples from './pages/Samples'
import Settings from './pages/Settings'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Activity from './pages/Activity'
import Help from './pages/Help'

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

      let person = allPeople.find(p => p.email === user.email)
      if (!person) {
        person = await createPerson({
          name: user.email.split('@')[0],
          email: user.email,
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
      <SeasonProvider>
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
            <Route path="activity" element={<Activity />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SeasonProvider>
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
