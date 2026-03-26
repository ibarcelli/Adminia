import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from './AuthProvider'
import type { UserRole } from '../types/database'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

function getHomeForRole(role: UserRole): string {
  return role === 'admin' ? '/admin' : '/portal'
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Cargando...</p>
      </div>
    )
  }

  // Not logged in → login page
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role → redirect to their correct home
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={getHomeForRole(profile.role)} replace />
  }

  return <Outlet />
}
