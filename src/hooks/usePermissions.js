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
  // without the admin panel itself. admin_viewer is read-only oversight —
  // gets full visibility but no edit permissions, so any *.edit gate still
  // blocks them.
  const isAllAccess = isAdmin || ['social_media', 'design', 'marketing', 'admin_viewer'].includes(role?.name)

  return { role, can, isAdmin, isAllAccess, hasRole }
}
