import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../components/AuthProvider'
import { useBankImport } from '../../hooks/useBankImport'
import { useReconciliation } from '../../hooks/useReconciliation'
import type { TransactionRow } from '../../hooks/useReconciliation'
import { FileUploader } from '../../components/ui/FileUploader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatMoney, formatDate } from '../../lib/formatters'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import type { Building, Period, MatchConfidence } from '../../types/database'

export function ReconcilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [building, setBuilding] = useState<Building | null>(null)
  const [publishedPeriod, setPublishedPeriod] = useState<Period | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [showConfirmAll, setShowConfirmAll] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income')

  useEffect(() => {
    async function fetch() {
      if (!id) return
      const { data: b } = await supabase.from('buildings').select('*').eq('id', id).single()
      if (b) setBuilding(b as Building)

      const { data: p } = await supabase
        .from('periods').select('*').eq('building_id', id).eq('status', 'published')
        .order('year', { ascending: false }).order('month', { ascending: false }).limit(1).maybeSingle()

      if (p) setPublishedPeriod(p as Period)
      setPageLoading(false)
    }
    fetch()
  }, [id])

  const periodId = publishedPeriod?.id
  const {
    bankImport, preview, allParsed, incomeCount, expenseCount,
    loading: importLoading, error: importError,
    parseFile, confirmImport, deleteImport, clearPreview,
  } = useBankImport(id, periodId)

  const {
    incomeTransactions, expenseTransactions,
    pendingStatements, loading: reconLoading, error: reconError, stats,
    fetchAll, runAutoMatch, manualMatch, rejectMatch, confirmMatch, confirmAllSuggested,
  } = useReconciliation(periodId, id)

  useEffect(() => {
    if (bankImport && periodId) fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankImport?.id, periodId])

  if (pageLoading) return <div className="p-8"><p className="text-slate-500">Cargando...</p></div>

  if (!publishedPeriod) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">{building?.name} — Conciliación</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-amber-800">Primero debes publicar un periodo para conciliar pagos.</p>
        </div>
      </div>
    )
  }

  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const periodLabel = `${monthNames[publishedPeriod.month]} ${publishedPeriod.year}`

  async function handleFileSelect(file: File) {
    setPendingFile(file)
    await parseFile(file)
  }

  async function handleConfirmImport() {
    if (pendingFile) { await confirmImport(pendingFile); setPendingFile(null) }
  }

  async function handleConfirmAll() {
    if (!user) return
    setShowConfirmAll(false)
    await confirmAllSuggested(user.id)
  }

  return (
    <div className="p-8">
      <Breadcrumb buildingId={id} buildingName={building?.name} currentPage="Conciliación" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{building?.name} — Conciliación</h1>
        <p className="text-sm text-slate-500 mt-1">Periodo: {periodLabel}</p>
      </div>

      {(importError || reconError) && (
        <p className="text-red-600 text-sm mb-4">{importError || reconError}</p>
      )}

      {/* No import yet */}
      {!bankImport && !preview && (
        <div className="max-w-md">
          <FileUploader onFileSelect={handleFileSelect} loading={importLoading} />
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && !bankImport && (
        <div className="max-w-3xl bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Vista previa del extracto</h2>
          <p className="text-sm text-slate-500">
            {allParsed.length} movimientos: <span className="text-green-700 font-medium">{incomeCount} ingresos</span>, <span className="text-red-600 font-medium">{expenseCount} egresos</span>. Primeras {preview.length} filas:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-medium text-slate-600">Fecha</th>
                  <th className="text-left py-2 px-2 font-medium text-slate-600">Tipo</th>
                  <th className="text-right py-2 px-2 font-medium text-slate-600">Monto</th>
                  <th className="text-left py-2 px-2 font-medium text-slate-600">Depto</th>
                  <th className="text-left py-2 px-2 font-medium text-slate-600">Descripción</th>
                  <th className="text-left py-2 px-2 font-medium text-slate-600">Concepto</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 px-2">{formatDate(row.date)}</td>
                    <td className="py-1.5 px-2">
                      <span className={`text-xs font-medium ${row.transaction_type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                        {row.transaction_type === 'income' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(row.amount)}</td>
                    <td className="py-1.5 px-2">{row.unit_number || '—'}</td>
                    <td className="py-1.5 px-2 text-slate-600 truncate max-w-[150px]">{row.description || '—'}</td>
                    <td className="py-1.5 px-2 text-slate-600 truncate max-w-[150px]">{row.concept || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={handleConfirmImport} disabled={importLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {importLoading ? 'Importando...' : `Confirmar importación (${allParsed.length} movimientos)`}
            </button>
            <button onClick={() => { clearPreview(); setPendingFile(null) }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Import exists */}
      {bankImport && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Ingresos" value={stats.totalIncome} />
            <StatCard label="Sugeridos" value={stats.suggested} color="blue" />
            <StatCard label="Confirmados" value={stats.confirmed} color="green" />
            <StatCard label="Sin asignar" value={stats.unmatched} color="amber" />
            <StatCard label="Egresos" value={stats.totalExpense} color="slate" />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {stats.unmatched > 0 && (
              <button onClick={() => runAutoMatch()} disabled={reconLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                Buscar coincidencias
              </button>
            )}
            {stats.suggested > 0 && (
              <button onClick={() => setShowConfirmAll(true)} disabled={reconLoading}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50">
                Confirmar todos los sugeridos ({stats.suggested})
              </button>
            )}
            <button onClick={() => bankImport && deleteImport(bankImport.id)} disabled={importLoading}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
              Reimportar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('income')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'income' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Ingresos ({stats.totalIncome})
            </button>
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'expense' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Egresos ({stats.totalExpense})
            </button>
          </div>

          {/* Income tab */}
          {activeTab === 'income' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Fecha</th>
                      <th className="text-right py-2.5 px-3 font-medium text-slate-600">Monto</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Depto (Excel)</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Descripción</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Match</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Confianza</th>
                      <th className="text-right py-2.5 px-3 font-medium text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeTransactions.map((txn) => (
                      <IncomeRow
                        key={txn.id}
                        txn={txn}
                        pendingStatements={pendingStatements}
                        onConfirm={() => user && confirmMatch(txn.id, user.id)}
                        onReject={() => rejectMatch(txn.id)}
                        onManualMatch={(unitId) => manualMatch(txn.id, unitId)}
                        loading={reconLoading}
                      />
                    ))}
                    {incomeTransactions.length === 0 && (
                      <tr><td colSpan={7} className="py-6 px-3 text-center text-slate-500">No hay ingresos importados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense tab */}
          {activeTab === 'expense' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Fecha</th>
                      <th className="text-right py-2.5 px-3 font-medium text-slate-600">Monto</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Descripción</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Concepto</th>
                      <th className="text-left py-2.5 px-3 font-medium text-slate-600">Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-slate-100">
                        <td className="py-2 px-3">{formatDate(txn.date)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-red-600">{formatMoney(txn.amount)}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]">{txn.description || '—'}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]">{txn.concept || '—'}</td>
                        <td className="py-2 px-3 text-slate-500">{txn.reference || '—'}</td>
                      </tr>
                    ))}
                    {expenseTransactions.length === 0 && (
                      <tr><td colSpan={5} className="py-6 px-3 text-center text-slate-500">No hay egresos importados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm all modal */}
      {showConfirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowConfirmAll(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Confirmar todos los sugeridos</h3>
            <p className="text-sm text-slate-600 mb-4">
              Se confirmarán {stats.suggested} pagos y se generarán sus recibos automáticamente.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirmAll(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">Cancelar</button>
              <button onClick={handleConfirmAll} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">Confirmar todos</button>
            </div>
          </div>
        </div>
      )}

      {/* Back to building button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => navigate(`/admin/buildings/${id}`)}
          className="px-6 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
        >
          ← Volver al edificio
        </button>
      </div>
    </div>
  )
}

// === Helpers ===

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-green-50 text-green-800',
    amber: 'bg-amber-50 text-amber-800',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className={`rounded-lg p-3 ${color ? colors[color] : 'bg-slate-50 text-slate-800'}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: MatchConfidence }) {
  if (!confidence) return <span className="text-xs text-slate-400">—</span>
  const cfg: Record<string, { label: string; cls: string }> = {
    high: { label: 'Alta', cls: 'bg-green-100 text-green-800' },
    medium_unit: { label: 'Media (depto)', cls: 'bg-amber-100 text-amber-800' },
    medium_amount: { label: 'Media (monto)', cls: 'bg-blue-100 text-blue-800' },
  }
  const { label, cls } = cfg[confidence] ?? { label: confidence, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

function IncomeRow({
  txn, pendingStatements, onConfirm, onReject, onManualMatch, loading,
}: {
  txn: TransactionRow
  pendingStatements: { unit_id: string; unit_number: string; total_due: number }[]
  onConfirm: () => void
  onReject: () => void
  onManualMatch: (unitId: string) => void
  loading: boolean
}) {
  const rowClass =
    txn.match_status === 'suggested' ? 'bg-green-50' :
    txn.match_status === 'confirmed' ? 'bg-slate-50 text-slate-400' :
    txn.match_status === 'rejected' ? 'bg-slate-50 text-slate-300 line-through' : ''

  return (
    <tr className={`border-b border-slate-100 ${rowClass}`}>
      <td className="py-2 px-3">{formatDate(txn.date)}</td>
      <td className="py-2 px-3 text-right tabular-nums">{formatMoney(txn.amount)}</td>
      <td className="py-2 px-3 text-slate-600">{txn.unit_number || '—'}</td>
      <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]" title={txn.concept || txn.description}>
        {txn.description || txn.concept || '—'}
      </td>
      <td className="py-2 px-3">
        {txn.matched_unit_number ? (
          <div>
            <span className="font-medium">{txn.matched_unit_number}</span>
            {txn.match_confidence === 'medium_unit' && (
              <span className="block text-xs text-amber-600">Monto no coincide</span>
            )}
            {txn.receipt_number && <span className="block text-xs text-slate-400">{txn.receipt_number}</span>}
          </div>
        ) : txn.match_status === 'unmatched' ? (
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) onManualMatch(e.target.value) }}
            disabled={loading}
            className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Asignar...</option>
            {pendingStatements.map((s) => (
              <option key={s.unit_id} value={s.unit_id}>{s.unit_number} — {formatMoney(s.total_due)}</option>
            ))}
          </select>
        ) : '—'}
      </td>
      <td className="py-2 px-3">
        {txn.match_status === 'confirmed' ? (
          <StatusBadge type="match" status="confirmed" />
        ) : txn.match_status === 'suggested' ? (
          <ConfidenceBadge confidence={txn.match_confidence} />
        ) : txn.match_status === 'rejected' ? (
          <StatusBadge type="match" status="rejected" />
        ) : (
          <StatusBadge type="match" status="unmatched" />
        )}
      </td>
      <td className="py-2 px-3 text-right">
        {txn.match_status === 'suggested' && (
          <div className="flex gap-1 justify-end">
            <button onClick={onConfirm} disabled={loading} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">Confirmar</button>
            <button onClick={onReject} disabled={loading} className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50">Rechazar</button>
          </div>
        )}
      </td>
    </tr>
  )
}
