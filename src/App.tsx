import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './components/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import { PortalLayout } from './components/layout/PortalLayout'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { BuildingView } from './pages/admin/BuildingView'
import { PeriodWizard } from './pages/admin/PeriodWizard'
import { ReconcilePage } from './pages/admin/ReconcilePage'
import { ArrearsPage } from './pages/admin/ArrearsPage'
import { BuildingSettings } from './pages/admin/BuildingSettings'
import { PortalStatement } from './pages/portal/PortalStatement'
import { PortalHistory } from './pages/portal/PortalHistory'
import { PortalBuilding } from './pages/portal/PortalBuilding'

function RootRedirect() {
  const { user, profile, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Cargando...</p>
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role === 'admin') return <Navigate to="/admin" replace />
  if (profile.role === 'condo') return <Navigate to="/portal" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Smart root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin (protected + layout) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/buildings/new/settings" element={<BuildingSettings />} />
              <Route path="/admin/buildings/:id" element={<BuildingView />} />
              <Route path="/admin/buildings/:id/period" element={<PeriodWizard />} />
              <Route path="/admin/buildings/:id/reconcile" element={<ReconcilePage />} />
              <Route path="/admin/buildings/:id/arrears" element={<ArrearsPage />} />
              <Route path="/admin/buildings/:id/settings" element={<BuildingSettings />} />
            </Route>
          </Route>

          {/* Portal Condómino (protected) */}
          <Route element={<ProtectedRoute allowedRoles={['condo']} />}>
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<PortalStatement />} />
              <Route path="/portal/history" element={<PortalHistory />} />
              <Route path="/portal/building" element={<PortalBuilding />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
