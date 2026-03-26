import { useAuthContext } from '../../components/AuthProvider'
import { useBuildings } from '../../hooks/useBuildings'
import { BuildingCard } from '../../components/ui/BuildingCard'

export function AdminDashboard() {
  const { profile } = useAuthContext()
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Edificios</h1>
        <p className="text-sm text-slate-500 mt-1">
          {buildings.length} {buildings.length === 1 ? 'edificio administrado' : 'edificios administrados'}
        </p>
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
