import { usePermissions } from '../hooks/usePermissions'
import NoAccessScreen from './NoAccessScreen'

export default function ProtectedRoute({ action, children }) {
  const { can, hasRole } = usePermissions()

  if (!hasRole) {
    return <NoAccessScreen message="Your account has no role assigned. Contact your admin to get access." />
  }

  if (action && !can(action)) {
    return <NoAccessScreen />
  }

  return children
}
