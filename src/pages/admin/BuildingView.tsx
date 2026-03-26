import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import type { Building, Period, PeriodStatus } from '../../types/database'

const monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const monthNamesFull = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function BuildingView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [building, setBuilding] = useState<Building | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [newMonth, setNewMonth] = useState(0)
  const [newYear, setNewYear] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    async function fetch() {
      if (!id) return

      const { data: buildingData } = await supabase.from('buildings').select('*').eq('id', id).single()
      if (buildingData) setBuilding(buildingData as Building)

      const { data: periodData } = await supabase
        .from('periods')
        .select('*')
        .eq('building_id', id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      const p = (periodData ?? []) as Period[]
      setPeriods(p)

      // Pre-select next month for new period
      if (p.length > 0) {
        const latest = p[0]
        const nextM = latest.month === 12 ? 1 : latest.month + 1
        const nextY = latest.month === 12 ? latest.year + 1 : latest.year
        setNewMonth(nextM)
        setNewYear(nextY)
      } else {
        const now = new Date()
        setNewMonth(now.getMonth() + 1)
        setNewYear(now.getFullYear())
      }

      setLoading(false)
    }
    fetch()
  }, [id])

  async function handleCreatePeriod() {
    if (!id) return
    setCreateError('')

    // Validate no duplicate
    const exists = periods.find((p) => p.year === newYear && p.month === newMonth)
    if (exists) {
      setCreateError(`Ya existe un periodo para ${monthNamesFull[newMonth]} ${newYear}.`)
      return
    }

    setCreating(true)

    // Get previous reading from the period before
    const prevM = newMonth === 1 ? 12 : newMonth - 1
    const prevY = newMonth === 1 ? newYear - 1 : newYear
    const { data: prevPeriod } = await supabase
      .from('periods')
      .select('water_reading_current')
      .eq('building_id', id)
      .eq('year', prevY)
      .eq('month', prevM)
      .maybeSingle()

    const { data: newPeriod, error: insertError } = await supabase
      .from('periods')
      .insert({
        building_id: id,
        year: newYear,
        month: newMonth,
        water_reading_previous: prevPeriod?.water_reading_current ?? 0,
        water_reading_current: 0,
        water_total_cost: 0,
        fixed_fee: 0,
        status: 'draft',
      })
      .select()
      .single()

    setCreating(false)

    if (insertError) {
      setCreateError(insertError.message)
      return
    }

    navigate(`/admin/buildings/${id}/period/${(newPeriod as Period).id}`)
  }

  if (loading) return <div className="p-8"><p className="text-slate-500">Cargando...</p></div>
  if (!building) return <div className="p-8"><p className="text-red-600">Edificio no encontrado.</p></div>

  const latestStatus = periods.length > 0 ? periods[0].status as PeriodStatus : null

  return (
    <div className="p-8">
      <Breadcrumb buildingName={building.name} />
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-800">{building.name}</h1>
          <StatusBadge type="period" status={latestStatus ?? 'none'} />
        </div>
        <p className="text-sm text-slate-500">{building.address}</p>
        <p className="text-sm text-slate-500 mt-1">
          {building.total_units} departamentos &middot; Pago hasta el día {building.payment_deadline_day}
        </p>
      </div>

      {/* Periods section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">Periodos</h2>
          <button
            onClick={() => setShowNewPeriod(!showNewPeriod)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            + Nuevo periodo
          </button>
        </div>

        {/* New period form */}
        {showNewPeriod && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mes</label>
              <select value={newMonth} onChange={(e) => setNewMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>{monthNamesFull[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año</label>
              <select value={newYear} onChange={(e) => setNewYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm">
                {[newYear - 1, newYear, newYear + 1].filter((y) => y >= 2024).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button onClick={handleCreatePeriod} disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creando...' : 'Crear'}
            </button>
            <button onClick={() => { setShowNewPeriod(false); setCreateError('') }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
              Cancelar
            </button>
            {createError && <p className="w-full text-sm text-red-600">{createError}</p>}
          </div>
        )}

        {/* Periods list */}
        {periods.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500">
            No hay periodos. Crea el primero para empezar.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {periods.slice(0, 12).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-800 w-24">
                    {monthNames[p.month]} {p.year}
                  </span>
                  <StatusBadge type="period" status={p.status} />
                </div>
                <button
                  onClick={() => navigate(`/admin/buildings/${id}/period/${p.id}`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {p.status === 'draft' ? 'Continuar' : 'Ver reporte'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other nav items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => navigate(`/admin/buildings/${id}/reconcile`)}
          className="text-left bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-slate-800">Conciliación</h3>
          <p className="text-sm text-slate-500 mt-1">Importar extracto y confirmar pagos</p>
        </button>
        <button onClick={() => navigate(`/admin/buildings/${id}/arrears`)}
          className="text-left bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-slate-800">Morosidad</h3>
          <p className="text-sm text-slate-500 mt-1">Departamentos con saldo pendiente</p>
        </button>
        <button onClick={() => navigate(`/admin/buildings/${id}/settings`)}
          className="text-left bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-slate-800">Configuración</h3>
          <p className="text-sm text-slate-500 mt-1">Datos del edificio y departamentos</p>
        </button>
      </div>
    </div>
  )
}
