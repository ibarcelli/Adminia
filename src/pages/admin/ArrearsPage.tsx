import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useArrears } from '../../hooks/useArrears'
import { formatMoney } from '../../lib/formatters'
import type { Building } from '../../types/database'

const monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function ArrearsPage() {
  const { id } = useParams<{ id: string }>()
  const [building, setBuilding] = useState<Building | null>(null)

  const {
    arrears, allPeriods, filterPeriodId, setFilterPeriodId,
    loading, error, totalOwed, totalDebtors,
  } = useArrears(id)

  useEffect(() => {
    async function fetch() {
      if (!id) return
      const { data } = await supabase.from('buildings').select('*').eq('id', id).single()
      if (data) setBuilding(data as Building)
    }
    fetch()
  }, [id])

  if (loading) return <div className="p-8"><p className="text-slate-500">Cargando...</p></div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{building?.name} — Morosidad</h1>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterPeriodId ?? ''}
          onChange={(e) => setFilterPeriodId(e.target.value || null)}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los periodos</option>
          {allPeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {monthNames[p.month]} {p.year}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {totalDebtors === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800 font-medium">Todos los departamentos están al día</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-800 tabular-nums">{totalDebtors}</p>
              <p className="text-xs text-red-600">{totalDebtors === 1 ? 'departamento con saldo pendiente' : 'departamentos con saldo pendiente'}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-800 tabular-nums">{formatMoney(totalOwed)}</p>
              <p className="text-xs text-red-600">Total pendiente</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2.5 px-3 font-medium text-slate-600 w-8"></th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-600">Depto</th>
                    <th className="text-left py-2.5 px-3 font-medium text-slate-600">Propietario</th>
                    <th className="text-right py-2.5 px-3 font-medium text-slate-600">Periodos</th>
                    <th className="text-right py-2.5 px-3 font-medium text-slate-600">Total pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {arrears.map((unit) => (
                    <ArrearRow key={unit.unitId} unit={unit} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ArrearRow({ unit }: { unit: { unitNumber: string; ownerName: string; periodsOwed: number; totalOwed: number; periods: { year: number; month: number; totalDue: number }[] } }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2 px-3 text-slate-400">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </td>
        <td className="py-2 px-3 font-medium text-slate-800">{unit.unitNumber}</td>
        <td className="py-2 px-3 text-slate-600">{unit.ownerName}</td>
        <td className="py-2 px-3 text-right tabular-nums">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            unit.periodsOwed >= 3 ? 'bg-red-100 text-red-800' :
            unit.periodsOwed >= 2 ? 'bg-amber-100 text-amber-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {unit.periodsOwed} {unit.periodsOwed === 1 ? 'mes' : 'meses'}
          </span>
        </td>
        <td className="py-2 px-3 text-right font-semibold text-red-700 tabular-nums">{formatMoney(unit.totalOwed)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-8 py-2">
            <div className="space-y-1">
              {unit.periods.map((p) => (
                <div key={`${p.year}-${p.month}`} className="flex justify-between text-sm">
                  <span className="text-slate-600">{monthNames[p.month]} {p.year}</span>
                  <span className="tabular-nums text-slate-800">{formatMoney(p.totalDue)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
