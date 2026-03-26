import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import type { Building, PeriodStatus } from '../../types/database'

const monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getNavItems(periodStatus: PeriodStatus | null, periodMonth?: number, periodYear?: number) {
  const periodInfo = periodMonth && periodYear ? ` — ${monthNames[periodMonth]} ${periodYear}` : ''
  let periodLabel: string
  let periodDesc: string

  if (periodStatus === 'draft') {
    periodLabel = `Continuar periodo${periodInfo}`
    periodDesc = 'Lectura de agua, gastos y prorrateo'
  } else if (periodStatus === 'published') {
    periodLabel = `Ver reporte${periodInfo}`
    periodDesc = 'Periodo publicado'
  } else if (periodStatus === 'closed') {
    periodLabel = `Ver reporte${periodInfo}`
    periodDesc = 'Periodo cerrado'
  } else {
    periodLabel = 'Iniciar periodo'
    periodDesc = 'Crear nuevo periodo mensual'
  }

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
  const [periodMonth, setPeriodMonth] = useState<number | undefined>()
  const [periodYear, setPeriodYear] = useState<number | undefined>()
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
        .select('status, month, year')
        .eq('building_id', id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()

      setPeriodStatus((periodData?.status as PeriodStatus) ?? null)
      setPeriodMonth(periodData?.month as number | undefined)
      setPeriodYear(periodData?.year as number | undefined)
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
        {getNavItems(periodStatus, periodMonth, periodYear).map((item) => (
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
