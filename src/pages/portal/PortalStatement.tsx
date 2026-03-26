import { useAuthContext } from '../../components/AuthProvider'
import { useCondoData } from '../../hooks/useCondoData'
import { useReceipt } from '../../hooks/useReceipt'
import { formatMoney } from '../../lib/formatters'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PortalStatement() {
  const { profile } = useAuthContext()
  const { unit, building, currentStatement, currentPeriod, loading, error } = useCondoData(profile?.unit_id)
  const { loading: receiptLoading, getReceiptDataByPayment, downloadReceipt } = useReceipt()

  if (loading) return <p className="text-slate-500">Cargando...</p>
  if (error) return <p className="text-red-600">{error}</p>

  if (!currentPeriod || !currentStatement) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
        <p className="text-slate-500">No hay estado de cuenta disponible aún.</p>
      </div>
    )
  }

  const periodLabel = `${monthNames[currentPeriod.month]} ${currentPeriod.year}`
  const isPaid = currentStatement.status === 'paid'

  return (
    <div className="space-y-4">
      {/* Building & unit info */}
      <div className="text-center">
        <p className="text-sm text-slate-500">{building?.name} — Depto {unit?.unit_number}</p>
        <p className="text-sm text-slate-500">{periodLabel}</p>
      </div>

      {/* Status indicator */}
      <div className={`rounded-lg p-6 text-center ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {isPaid ? (
          <>
            <svg className="w-10 h-10 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold text-green-800">Al día</p>
            {currentStatement.receipt_number && (
              <p className="text-sm text-green-600 mt-1">Recibo: {currentStatement.receipt_number}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-red-600 mb-1">Saldo pendiente</p>
            <p className="text-3xl font-bold text-red-800">{formatMoney(currentStatement.total_due)}</p>
          </>
        )}
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Desglose</h3>

        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-sm text-slate-600">Agua</span>
          <span className="text-sm font-medium tabular-nums">{formatMoney(currentStatement.water_charge)}</span>
        </div>

        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-sm text-slate-600">Gastos de mantenimiento</span>
          <span className="text-sm font-medium tabular-nums">{formatMoney(currentStatement.expenses_charge)}</span>
        </div>

        {currentStatement.previous_balance > 0 && (
          <div className="flex justify-between py-1.5 border-b border-slate-100 bg-amber-50 -mx-5 px-5">
            <span className="text-sm text-amber-700 font-medium">Saldo anterior</span>
            <span className="text-sm font-medium text-amber-700 tabular-nums">{formatMoney(currentStatement.previous_balance)}</span>
          </div>
        )}

        <div className="flex justify-between py-2 pt-3">
          <span className="text-base font-semibold text-slate-800">Total</span>
          <span className="text-base font-bold text-slate-800 tabular-nums">{formatMoney(currentStatement.total_due)}</span>
        </div>
      </div>

      {/* Download receipt */}
      {isPaid && (
        <button
          onClick={async () => {
            const data = await getReceiptDataByPayment(currentStatement.id)
            if (data) await downloadReceipt(data)
          }}
          disabled={receiptLoading}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {receiptLoading ? 'Generando...' : 'Descargar recibo'}
        </button>
      )}
    </div>
  )
}
