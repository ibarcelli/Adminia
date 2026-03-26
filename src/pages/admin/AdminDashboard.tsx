import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../components/AuthProvider'
import { useBuildings } from '../../hooks/useBuildings'
import { BuildingCard } from '../../components/ui/BuildingCard'

export function AdminDashboard() {
  const { profile } = useAuthContext()
  const navigate = useNavigate()
  const { buildings, loading, error } = useBuildings(profile?.organization_id ?? null)

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Cargando edificios...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edificios</h1>
          <p className="text-sm text-slate-500 mt-1">
            {buildings.length} {buildings.length === 1 ? 'edificio administrado' : 'edificios administrados'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/buildings/new/settings')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          + Nuevo edificio
        </button>
      </div>

      {buildings.length === 0 ? (
        <p className="text-slate-500">No hay edificios registrados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {buildings.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              periodStatus={building.currentPeriodStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
