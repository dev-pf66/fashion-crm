import { createContext, useContext, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSeasons } from '../lib/supabase'

const SeasonContext = createContext({})

export function useSeason() {
  return useContext(SeasonContext)
}

export function SeasonProvider({ children }) {
  const [seasons, setSeasons] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    loadSeasons()
  }, [])

  async function loadSeasons() {
    try {
      const data = await getSeasons()
      setSeasons(data)

      const seasonParam = searchParams.get('season')
      if (seasonParam) {
        const found = data.find(s => s.id === parseInt(seasonParam))
        if (found) {
          setCurrentSeason(found)
          setLoading(false)
          return
        }
      }

      // Default to first active season
      const activeSeason = data.find(s => s.is_active) || data[0]
      if (activeSeason) {
        setCurrentSeason(activeSeason)
        setSearchParams(prev => {
          prev.set('season', activeSeason.id.toString())
          return prev
        }, { replace: true })
      }
    } catch (err) {
      console.error('Failed to load seasons:', err)
    } finally {
      setLoading(false)
    }
  }

  function changeSeason(season) {
    setCurrentSeason(season)
    setSearchParams(prev => {
      prev.set('season', season.id.toString())
      return prev
    }, { replace: true })
  }

  return (
    <SeasonContext.Provider value={{
      seasons,
      currentSeason,
      changeSeason,
      loading,
      refreshSeasons: loadSeasons,
    }}>
      {children}
    </SeasonContext.Provider>
  )
}
