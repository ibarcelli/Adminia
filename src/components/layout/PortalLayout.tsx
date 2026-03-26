import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../AuthProvider'
import { supabase } from '../../lib/supabase'
import type { Building, Unit } from '../../types/database'

const tabs = [
  { label: 'Estado de cuenta', path: '/portal' },
  { label: 'Historial', path: '/portal/history' },
  { label: 'Edificio', path: '/portal/building' },
]

export function PortalLayout() {
  const { profile, signOut } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [building, setBuilding] = useState<Building | null>(null)

  useEffect(() => {
    async function fetch() {
      if (!profile?.unit_id) return

      const { data: u } = await supabase
        .from('units')
        .select('*')
        .eq('id', profile.unit_id)
        .single()

      if (u) {
        setUnit(u as Unit)
        const { data: b } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', (u as Unit).building_id)
          .single()

        if (b) setBuilding(b as Building)
      }
    }
    fetch()
  }, [profile?.unit_id])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">{building?.name ?? 'Adminia'}</h1>
              <p className="text-xs text-slate-500">
                {unit ? `Depto ${unit.unit_number} — ${unit.owner_name}` : profile?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-red-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <nav className="flex overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
