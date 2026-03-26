import { useEffect, useState } from 'react'
import { useAuthContext } from '../../components/AuthProvider'
import { useCondoData } from '../../hooks/useCondoData'
import type { StatementWithPeriod } from '../../hooks/useCondoData'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatMoney } from '../../lib/formatters'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PortalHistory() {
  const { profile } = useAuthContext()
  const { history, fetchHistory, loading, error } = useCondoData(profile?.unit_id)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      fetchHistory().then(() => setLoaded(true))
    }
  }, [loaded, fetchHistory])

  if (loading && !loaded) return <p className="text-slate-500">Cargando...</p>
  if (error) return <p className="text-red-600">{error}</p>

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <p className="text-slate-500">No hay historial disponible.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {history.map((stmt) => (
        <HistoryRow key={stmt.id} stmt={stmt} />
      ))}
    </div>
  )
}

function HistoryRow({ stmt }: { stmt: StatementWithPeriod }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-slate-800">{monthNames[stmt.month]} {stmt.year}</p>
          <p className="text-lg font-semibold tabular-nums text-slate-800">{formatMoney(stmt.total_due)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge type="statement" status={stmt.status} />
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Agua</span>
            <span className="tabular-nums">{formatMoney(stmt.water_charge)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Gastos</span>
            <span className="tabular-nums">{formatMoney(stmt.expenses_charge)}</span>
          </div>
          {stmt.previous_balance > 0 && (
            <div className="flex justify-between text-sm text-amber-700">
              <span>Saldo anterior</span>
              <span className="tabular-nums">{formatMoney(stmt.previous_balance)}</span>
            </div>
          )}
          {stmt.receipt_number && (
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-500">Recibo</span>
              <span className="text-slate-700">{stmt.receipt_number}</span>
            </div>
          )}
          {stmt.status === 'paid' && (
            <button disabled className="w-full mt-2 py-2 px-4 bg-slate-100 text-slate-400 text-sm rounded-md cursor-not-allowed">
              Descargar recibo (próximamente)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
