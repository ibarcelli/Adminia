import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useReceipt } from '../../hooks/useReceipt'
import { formatMoney, formatDate } from '../../lib/formatters'
import type { Period, Building, Expense, StatementStatus } from '../../types/database'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface ReportStatement {
  id: string
  unit_number: string
  owner_name: string
  water_charge: number
  expenses_charge: number
  previous_balance: number
  total_due: number
  status: StatementStatus
  receipt_number: string | null
}

interface PeriodReportProps {
  period: Period
  building: Building
  onReopen: () => Promise<boolean>
}

export function PeriodReport({ period, building, onReopen }: PeriodReportProps) {
  const navigate = useNavigate()
  const { getReceiptDataByPayment, downloadReceipt } = useReceipt()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [statements, setStatements] = useState<ReportStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopening, setReopening] = useState(false)

  useEffect(() => {
    async function fetch() {
      setLoading(true)

      // Fetch expenses
      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .eq('period_id', period.id)
        .order('created_at')
      setExpenses((expData ?? []) as Expense[])

      // Fetch statements with unit info
      const { data: stmtData } = await supabase
        .from('statements')
        .select('*, units(unit_number, owner_name)')
        .eq('period_id', period.id)

      // Get receipts for paid statements
      const paidIds = (stmtData ?? []).filter((s: { status: string }) => s.status === 'paid').map((s: { id: string }) => s.id)
      const receiptMap = new Map<string, string>()

      if (paidIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('statement_id, receipts(receipt_number)')
          .in('statement_id', paidIds)

        for (const p of (payments ?? []) as unknown as { statement_id: string; receipts: { receipt_number: string }[] }[]) {
          const receipt = Array.isArray(p.receipts) ? p.receipts[0] : p.receipts
          if (receipt) receiptMap.set(p.statement_id, receipt.receipt_number)
        }
      }

      const rows: ReportStatement[] = ((stmtData ?? []) as unknown as {
        id: string; water_charge: number; expenses_charge: number; previous_balance: number;
        total_due: number; status: StatementStatus; units: { unit_number: string; owner_name: string }[]
      }[]).map((s) => {
        const unit = Array.isArray(s.units) ? s.units[0] : s.units
        return {
          id: s.id,
          unit_number: unit?.unit_number ?? '',
          owner_name: unit?.owner_name ?? '',
          water_charge: s.water_charge,
          expenses_charge: s.expenses_charge,
          previous_balance: s.previous_balance,
          total_due: s.total_due,
          status: s.status,
          receipt_number: receiptMap.get(s.id) ?? null,
        }
      })

      rows.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
      setStatements(rows)
      setLoading(false)
    }
    fetch()
  }, [period.id])

  if (loading) return <div className="p-8"><p className="text-slate-500">Cargando reporte...</p></div>

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalBilled = statements.reduce((s, st) => s + st.total_due, 0)
  const totalCollected = statements.filter((s) => s.status === 'paid').reduce((s, st) => s + st.total_due, 0)
  const totalPending = statements.filter((s) => s.status !== 'paid').reduce((s, st) => s + st.total_due, 0)
  const totalWater = statements.reduce((s, st) => s + st.water_charge, 0)
  const totalExpensesCharge = statements.reduce((s, st) => s + st.expenses_charge, 0)
  const balance = totalCollected - totalExpenses
  const periodLabel = `${monthNames[period.month]} ${period.year}`

  return (
    <div className="p-8">
      <Breadcrumb buildingId={building.id} buildingName={building.name} currentPage={`Reporte ${periodLabel}`} />

      {/* Section 1: Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-800">Reporte — {periodLabel}</h1>
          <StatusBadge type="period" status={period.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Edificio</p>
            <p className="font-medium text-slate-800">{building.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Publicado</p>
            <p className="font-medium text-slate-800">{period.published_at ? formatDate(period.published_at.split('T')[0]) : '—'}</p>
          </div>
          <div>
            <p className="text-slate-500">Medidor</p>
            <p className="font-medium text-slate-800">{building.water_metering_type === 'individual' ? 'Individual' : 'General'}</p>
          </div>
          <div>
            <p className="text-slate-500">Departamentos</p>
            <p className="font-medium text-slate-800">{statements.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <p className="text-slate-500">Costo agua</p>
            <p className="font-semibold text-slate-800 tabular-nums">{formatMoney(period.water_total_cost)}</p>
          </div>
          <div>
            <p className="text-slate-500">Total gastos</p>
            <p className="font-semibold text-slate-800 tabular-nums">{formatMoney(totalExpenses)}</p>
          </div>
          {period.fixed_fee > 0 && (
            <div>
              <p className="text-slate-500">Cuota fija</p>
              <p className="font-semibold text-slate-800 tabular-nums">{formatMoney(period.fixed_fee)}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500">Total facturado</p>
            <p className="font-semibold text-slate-800 tabular-nums">{formatMoney(totalBilled)}</p>
          </div>
          <div>
            <p className="text-slate-500">Cobrado</p>
            <p className="font-semibold text-green-700 tabular-nums">{formatMoney(totalCollected)}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Income & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Income */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Ingresos</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Cobrado</span>
              <span className="font-medium text-green-700 tabular-nums">{formatMoney(totalCollected)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Pendiente</span>
              <span className="font-medium text-amber-700 tabular-nums">{formatMoney(totalPending)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span>Total facturado</span>
              <span className="tabular-nums">{formatMoney(totalBilled)}</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Egresos</h2>
          <div className="space-y-2 text-sm">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">{exp.concept}</span>
                <span className="tabular-nums">{formatMoney(exp.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-semibold">
              <span>Total egresos</span>
              <span className="tabular-nums">{formatMoney(totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance + Fixed fee info */}
      {period.fixed_fee > 0 && (() => {
        const feeTotal = period.fixed_fee * statements.length
        const feeDiff = feeTotal - totalExpenses
        return (
          <div className={`rounded-lg p-4 mb-3 text-sm ${feeDiff >= 0 ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
            Cuota fija {formatMoney(period.fixed_fee)} × {statements.length} deptos = {formatMoney(feeTotal)} vs gastos {formatMoney(totalExpenses)}
            {' — '}
            <span className="font-medium">
              {feeDiff >= 0 ? `Superávit ${formatMoney(feeDiff)}` : `Déficit ${formatMoney(Math.abs(feeDiff))}`}
            </span>
          </div>
        )
      })()}
      <div className={`rounded-lg p-4 mb-6 ${balance >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">Balance (cobrado - gastos)</span>
          <span className={`text-lg font-bold tabular-nums ${balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {formatMoney(balance)}
          </span>
        </div>
      </div>

      {/* Section 3: Statements by unit */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Estados de cuenta por departamento</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-medium text-slate-600">Depto</th>
                <th className="text-left py-2 px-2 font-medium text-slate-600 hidden sm:table-cell">Propietario</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Agua</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Gastos</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600 hidden sm:table-cell">Saldo ant.</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Total</th>
                <th className="text-left py-2 px-2 font-medium text-slate-600">Status</th>
                <th className="text-left py-2 px-2 font-medium text-slate-600 hidden sm:table-cell">Recibo</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((st) => (
                <tr
                  key={st.id}
                  className={`border-b border-slate-100 ${
                    st.status === 'paid' ? 'bg-green-50' : st.status === 'pending' ? 'bg-amber-50' : ''
                  }`}
                >
                  <td className="py-1.5 px-2 font-medium text-slate-800">{st.unit_number}</td>
                  <td className="py-1.5 px-2 text-slate-600 hidden sm:table-cell">{st.owner_name || '—'}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(st.water_charge)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(st.expenses_charge)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums hidden sm:table-cell">
                    {st.previous_balance > 0 ? formatMoney(st.previous_balance) : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold tabular-nums">{formatMoney(st.total_due)}</td>
                  <td className="py-1.5 px-2">
                    <StatusBadge type="statement" status={st.status} />
                  </td>
                  <td className="py-1.5 px-2 hidden sm:table-cell">
                    {st.receipt_number ? (
                      <button
                        onClick={async () => {
                          const data = await getReceiptDataByPayment(st.id)
                          if (data) await downloadReceipt(data)
                        }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {st.receipt_number}
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td className="py-2 px-2 font-semibold" colSpan={2}>Totales</td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums">{formatMoney(totalWater)}</td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums">{formatMoney(totalExpensesCharge)}</td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums hidden sm:table-cell">
                  {statements.reduce((s, st) => s + st.previous_balance, 0) > 0
                    ? formatMoney(statements.reduce((s, st) => s + st.previous_balance, 0))
                    : '—'}
                </td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums">{formatMoney(totalBilled)}</td>
                <td className="py-2 px-2" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Section 4: Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setShowReopenModal(true)}
          className="px-4 py-2 text-sm text-amber-700 border border-amber-300 rounded-md hover:bg-amber-50"
        >
          Reabrir periodo
        </button>
        <button
          onClick={() => navigate(`/admin/buildings/${building.id}`)}
          className="px-6 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100"
        >
          ← Volver al edificio
        </button>
      </div>

      {/* Reopen modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowReopenModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Reabrir periodo</h3>
            <p className="text-sm text-slate-600 mb-4">
              Los estados de cuenta volverán a borrador y dejarán de ser visibles para los condóminos. ¿Continuar?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setReopening(true)
                  const ok = await onReopen()
                  setReopening(false)
                  if (ok) setShowReopenModal(false)
                }}
                disabled={reopening}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {reopening ? 'Reabriendo...' : 'Sí, reabrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
