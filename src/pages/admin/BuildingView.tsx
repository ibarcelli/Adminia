import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import type { Building, PeriodStatus } from '../../types/database'

function getNavItems(periodStatus: PeriodStatus | null) {
  const periodLabel = periodStatus === 'published' || periodStatus === 'closed' ? 'Ver periodo' : 'Periodo mensual'
  const periodDesc = periodStatus === 'published' ? 'Periodo publicado' : periodStatus === 'closed' ? 'Periodo cerrado' : 'Lectura de agua, gastos y prorrateo'

  return [
    { label: periodLabel, path: 'period', description: periodDesc },
    { label: 'Conciliación', path: 'reconcile', description: 'Importar extracto y confirmar pagos' },
    { label: 'Morosidad', path: 'arrears', description: 'Departamentos con saldo pendiente' },
    { label: 'Configuración', path: 'settings', description: 'Datos del edificio y departamentos' },
  ]
}

export function BuildingView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [building, setBuilding] = useState<Building | null>(null)
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      if (!id) return

      const { data: buildingData } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', id)
        .single()

      if (buildingData) setBuilding(buildingData as Building)

      const { data: periodData } = await supabase
        .from('periods')
        .select('status')
        .eq('building_id', id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()

      setPeriodStatus((periodData?.status as PeriodStatus) ?? null)
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return <div className="p-8"><p className="text-slate-500">Cargando...</p></div>
  }

  if (!building) {
    return <div className="p-8"><p className="text-red-600">Edificio no encontrado.</p></div>
  }

  return (
    <div className="p-8">
      <Breadcrumb buildingName={building.name} />
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-800">{building.name}</h1>
          <StatusBadge type="period" status={periodStatus ?? 'none'} />
        </div>
        <p className="text-sm text-slate-500">{building.address}</p>
        <p className="text-sm text-slate-500 mt-1">
          {building.total_units} departamentos &middot; Pago hasta el día {building.payment_deadline_day}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {getNavItems(periodStatus).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(`/admin/buildings/${id}/${item.path}`)}
            className="text-left bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="text-base font-semibold text-slate-800">{item.label}</h3>
            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
