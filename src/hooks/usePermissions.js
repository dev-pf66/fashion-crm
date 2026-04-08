import { useMemo } from 'react'
import { useApp } from '../App'

export function usePermissions() {
  const { currentPerson } = useApp()

  const role = useMemo(() => {
    if (!currentPerson?.roles) return null
    return currentPerson.roles
  }, [currentPerson?.roles])

  const can = useMemo(() => {
    const permissions = role?.permissions || []
    return (action) => permissions.includes(action)
  }, [role])

  const isAdmin = can('admin.access')
  const hasRole = !!role

  return { role, can, isAdmin, hasRole }
}
