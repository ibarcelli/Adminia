import { useEffect, useState } from 'react'
import { useAuthContext } from '../../components/AuthProvider'
import { useCondoData } from '../../hooks/useCondoData'
import type { BuildingFinances } from '../../hooks/useCondoData'
import { formatMoney } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PortalBuilding() {
  const { profile } = useAuthContext()
  const { building, loading: dataLoading, error: dataError, fetchBuildingFinances } = useCondoData(profile?.unit_id)

  const [periods, setPeriods] = useState<{ id: string; year: number; month: number }[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [finances, setFinances] = useState<BuildingFinances | null>(null)
  const [loadingFinances, setLoadingFinances] = useState(false)

  // Load published periods for this building
  useEffect(() => {
    async function fetch() {
      if (!building) return
      const { data } = await supabase
        .from('periods')
        .select('id, year, month')
        .eq('building_id', building.id)
        .in('status', ['published', 'closed'])
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      const p = (data ?? []) as { id: string; year: number; month: number }[]
      setPeriods(p)
      if (p.length > 0 && !selectedPeriodId) setSelectedPeriodId(p[0].id)
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id])

  // Load finances when period changes
  useEffect(() => {
    if (!selectedPeriodId) return
    setLoadingFinances(true)
    fetchBuildingFinances(selectedPeriodId).then((f) => {
      setFinances(f)
      setLoadingFinances(false)
    })
  }, [selectedPeriodId, fetchBuildingFinances])

  if (dataLoading) return <p className="text-slate-500">Cargando...</p>
  if (dataError) return <p className="text-red-600">{dataError}</p>

  if (periods.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <p className="text-slate-500">No hay información financiera disponible aún.</p>
      </div>
    )
  }

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
  const balance = finances ? finances.totalCollected - finances.totalExpenses : 0

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div>
        <select
          value={selectedPeriodId ?? ''}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{monthNames[p.month]} {p.year}</option>
          ))}
        </select>
      </div>

      {loadingFinances ? (
        <p className="text-slate-500">Cargando...</p>
      ) : finances ? (
        <>
          {/* Income */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Ingresos — {selectedPeriod ? `${monthNames[selectedPeriod.month]} ${selectedPeriod.year}` : ''}</h3>

            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-sm text-slate-600">Cuotas cobradas</span>
              <span className="text-sm font-medium text-green-700 tabular-nums">{formatMoney(finances.totalCollected)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-sm text-slate-600">Cuotas pendientes</span>
              <span className="text-sm font-medium text-amber-700 tabular-nums">{formatMoney(finances.totalPending)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm font-semibold text-slate-800">Total ingresos esperados</span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(finances.totalIncome)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Egresos</h3>

            {finances.expenses.map((exp, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-sm text-slate-600">{exp.concept}</span>
                <span className="text-sm tabular-nums">{formatMoney(exp.amount)}</span>
              </div>
            ))}

            <div className="flex justify-between py-1.5">
              <span className="text-sm font-semibold text-slate-800">Total egresos</span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(finances.totalExpenses)}</span>
            </div>
          </div>

          {/* Balance */}
          <div className={`rounded-lg p-5 ${balance >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Balance (cobrado - gastos)</span>
              <span className={`text-lg font-bold tabular-nums ${balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                {formatMoney(balance)}
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
