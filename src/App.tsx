import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import { PortalLayout } from './components/layout/PortalLayout'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { BuildingView } from './pages/admin/BuildingView'
import { PeriodWizard } from './pages/admin/PeriodWizard'
import { ReconcilePage } from './pages/admin/ReconcilePage'
import { ArrearsPage } from './pages/admin/ArrearsPage'
import { PortalStatement } from './pages/portal/PortalStatement'
import { PortalHistory } from './pages/portal/PortalHistory'
import { PortalBuilding } from './pages/portal/PortalBuilding'

function BuildingSettings() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Configuración del Edificio</h1></div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin (protected + layout) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
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
