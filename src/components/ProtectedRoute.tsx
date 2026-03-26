import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from './AuthProvider'
import type { UserRole } from '../types/database'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
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

  if (!user || !profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
