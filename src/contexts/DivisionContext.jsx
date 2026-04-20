import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getDivisions } from '../lib/supabase'
import { useApp } from '../App'

const DivisionContext = createContext({})

export function useDivision() {
  return useContext(DivisionContext)
}

export function DivisionProvider({ children }) {
  const { currentPerson } = useApp()
  const [divisions, setDivisions] = useState([])
  const [currentDivision, setCurrentDivision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const switchTimerRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const allowedCodes = currentPerson?.roles?.division_codes || null

  useEffect(() => {
    loadDivisions()
  }, [currentPerson?.roles?.id])

  async function loadDivisions() {
    try {
      const all = await getDivisions()
      const data = allowedCodes ? all.filter(d => allowedCodes.includes(d.code)) : all
      setDivisions(data)

      const divisionParam = searchParams.get('division')
      if (divisionParam) {
        const found = data.find(s => s.id === parseInt(divisionParam))
        if (found) {
          setCurrentDivision(found)
          setLoading(false)
          return
        }
      }

      // Default to first active division
      const activeDivision = data.find(s => s.is_active) || data[0]
      if (activeDivision) {
        setCurrentDivision(activeDivision)
        setSearchParams(prev => {
          prev.set('division', activeDivision.id.toString())
          return prev
        }, { replace: true })
      }
    } catch (err) {
      console.error('Failed to load divisions:', err)
    } finally {
      setLoading(false)
    }
  }

  function changeDivision(division) {
    if (division?.id === currentDivision?.id) return
    setIsSwitching(true)
    setCurrentDivision(division)
    setSearchParams(prev => {
      prev.set('division', division.id.toString())
      return prev
    }, { replace: true })
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current)
    // Give page effects a beat to start their fetches, then release the bar.
    // Individual pages still show their own refreshing state if they're slow.
    switchTimerRef.current = setTimeout(() => setIsSwitching(false), 800)
  }

  useEffect(() => () => { if (switchTimerRef.current) clearTimeout(switchTimerRef.current) }, [])

  return (
    <DivisionContext.Provider value={{
      divisions,
      currentDivision,
      changeDivision,
      loading,
      isSwitching,
      refreshDivisions: loadDivisions,
    }}>
      {children}
    </DivisionContext.Provider>
  )
}
