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
  // Roles with cross-team visibility (see everyone's work, assign pieces, etc.)
  // without the admin panel itself. Expands as we add team roles.
  const isAllAccess = isAdmin || ['social_media', 'design', 'marketing'].includes(role?.name)

  return { role, can, isAdmin, isAllAccess, hasRole }
}
