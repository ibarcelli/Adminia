import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'

function BuildingDetail() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Detalle del Edificio</h1></div>
}

function BuildingPeriod() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Wizard Mensual</h1></div>
}

function BuildingReconcile() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Conciliación Bancaria</h1></div>
}

function BuildingArrears() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Morosidad</h1></div>
}

function BuildingSettings() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Configuración del Edificio</h1></div>
}

function PortalHome() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Portal Condómino</h1></div>
}

function PortalHistory() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Historial de Pagos</h1></div>
}

function PortalBuilding() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Ingresos y Egresos del Edificio</h1></div>
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
              <Route path="/admin/buildings/:id" element={<BuildingDetail />} />
              <Route path="/admin/buildings/:id/period" element={<BuildingPeriod />} />
              <Route path="/admin/buildings/:id/reconcile" element={<BuildingReconcile />} />
              <Route path="/admin/buildings/:id/arrears" element={<BuildingArrears />} />
              <Route path="/admin/buildings/:id/settings" element={<BuildingSettings />} />
            </Route>
          </Route>

          {/* Portal Condómino (no protection yet — STORY-015) */}
          <Route path="/portal" element={<PortalHome />} />
          <Route path="/portal/history" element={<PortalHistory />} />
          <Route path="/portal/building" element={<PortalBuilding />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
