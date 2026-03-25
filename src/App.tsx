import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Login() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Adminia</h1><p className="mt-2 text-gray-600">Iniciar sesión</p></div>
}

function AdminDashboard() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Dashboard Admin</h1></div>
}

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
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/buildings/:id" element={<BuildingDetail />} />
        <Route path="/admin/buildings/:id/period" element={<BuildingPeriod />} />
        <Route path="/admin/buildings/:id/reconcile" element={<BuildingReconcile />} />
        <Route path="/admin/buildings/:id/arrears" element={<BuildingArrears />} />
        <Route path="/admin/buildings/:id/settings" element={<BuildingSettings />} />

        {/* Portal Condómino */}
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/history" element={<PortalHistory />} />
        <Route path="/portal/building" element={<PortalBuilding />} />
      </Routes>
    </BrowserRouter>
  )
}
