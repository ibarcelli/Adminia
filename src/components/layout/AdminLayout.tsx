import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../AuthProvider'
import { useBuildings } from '../../hooks/useBuildings'

export function AdminLayout() {
  const { profile, signOut } = useAuthContext()
  const { buildings } = useBuildings(profile?.organization_id ?? null)
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={() => { navigate('/admin'); setSidebarOpen(false) }}
          className="text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
        >
          Adminia
        </button>
        <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
          Edificios
        </p>
        {buildings.map((b) => {
          const isActive = location.pathname.includes(b.id)
          return (
            <button
              key={b.id}
              onClick={() => { navigate(`/admin/buildings/${b.id}`); setSidebarOpen(false) }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {b.name}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-600 hover:text-slate-800"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-slate-800">Adminia</span>
        <div className="w-6" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg z-50">
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-screen shrink-0">
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
