import { ShieldOff } from 'lucide-react'

export default function NoAccessScreen({ message }) {
  return (
    <div className="no-access-screen">
      <ShieldOff size={48} />
      <h2>Access Restricted</h2>
      <p>{message || 'You don\'t have permission to access this page. Contact your admin for access.'}</p>
    </div>
  )
}
