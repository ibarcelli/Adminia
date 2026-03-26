import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { WizardStepper } from '../../components/ui/WizardStepper'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { FileUploader } from '../../components/ui/FileUploader'
import { PeriodReport } from './PeriodReport'
import { usePeriod } from '../../hooks/usePeriod'
import { useExpenses } from '../../hooks/useExpenses'
import { useStatements } from '../../hooks/useStatements'
import { useExpenseImport } from '../../hooks/useExpenseImport'
import { formatMoney } from '../../lib/formatters'
import type { UnitReadingRow } from '../../hooks/usePeriod'
import type { Building, ExpenseCategory } from '../../types/database'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PeriodWizard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    period, previousReading, unitReadings, setUnitReadings,
    loading, error,
    currentYear, currentMonth,
    createPeriod, updateWaterReading,
    fetchUnitReadings, autoFillPreviousReadings, saveUnitReadings,
    reopenPeriod, publishPeriod,
  } = usePeriod(id)

  const [building, setBuilding] = useState<Building | null>(null)
  const [step, setStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  // General mode form state
  const [waterPrevious, setWaterPrevious] = useState('')
  const [waterCurrent, setWaterCurrent] = useState('')
  const [waterCost, setWaterCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Step 2: Expenses
  const {
    expenses, totalExpenses,
    error: expensesError,
    addExpense, updateExpense, deleteExpense,
    refetch: refetchExpenses,
  } = useExpenses(period?.id)

  const [newConcept, setNewConcept] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('fixed')

  // Step 2b: Expense import
  const {
    parsedExpenses, loading: importLoading, error: importError,
    parseExpensesFromFile, updateExpense: updateParsedExpense,
    importSelectedExpenses, clearParsed,
  } = useExpenseImport()
  const [showImportModal, setShowImportModal] = useState(false)

  // Step 4: Publish
  const [showConfirm, setShowConfirm] = useState(false)
  const [published, setPublished] = useState(false)

  // Step 3: Statements
  const {
    statements, totals: statementTotals,
    loading: statementsLoading, error: statementsError,
    generateStatements, fetchStatements,
  } = useStatements(period?.id)

  useEffect(() => {
    async function fetchBuilding() {
      if (!id) return
      const { data } = await supabase.from('buildings').select('*').eq('id', id).single()
      if (data) setBuilding(data as Building)
    }
    fetchBuilding()
  }, [id])

  // Sync general mode form with period data
  useEffect(() => {
    if (building?.water_metering_type !== 'general') return
    if (period) {
      setWaterPrevious(period.water_reading_previous > 0 ? String(period.water_reading_previous) : String(previousReading))
      setWaterCurrent(period.water_reading_current > 0 ? String(period.water_reading_current) : '')
      setWaterCost(period.water_total_cost > 0 ? String(period.water_total_cost) : '')
    } else {
      setWaterPrevious(previousReading > 0 ? String(previousReading) : '')
    }
  }, [period, previousReading, building?.water_metering_type])

  // Load individual readings when period exists and building is individual
  useEffect(() => {
    if (period && building?.water_metering_type === 'individual') {
      fetchUnitReadings(period.id).then(() => {
        autoFillPreviousReadings()
      })
      // Sync cost field
      setWaterCost(period.water_total_cost > 0 ? String(period.water_total_cost) : '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period?.id, building?.water_metering_type])

  // Check if step 1 was already completed
  useEffect(() => {
    if (period && period.water_total_cost > 0) {
      if (building?.water_metering_type === 'general' && period.water_reading_current > 0) {
        if (!completedSteps.includes(1)) setCompletedSteps((prev) => [...prev, 1])
      }
      if (building?.water_metering_type === 'individual') {
        if (!completedSteps.includes(1)) setCompletedSteps((prev) => [...prev, 1])
      }
    }
  }, [period, building?.water_metering_type, completedSteps])

  // Check if step 2 was already completed (has expenses)
  useEffect(() => {
    if (expenses.length > 0 && !completedSteps.includes(2)) {
      setCompletedSteps((prev) => [...prev, 2])
    }
  }, [expenses.length, completedSteps])

  // Check if step 3 was already completed (has statements)
  useEffect(() => {
    if (statements.length > 0 && !completedSteps.includes(3)) {
      setCompletedSteps((prev) => [...prev, 3])
    }
  }, [statements.length, completedSteps])

  // Load statements when entering step 3
  useEffect(() => {
    if (step === 3 && period) {
      fetchStatements()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, period?.id])

  // Auto-detect starting step based on existing data
  const [initialStepSet, setInitialStepSet] = useState(false)
  useEffect(() => {
    if (initialStepSet || !period || loading) return

    // If period is published/closed, don't change step (will show read-only message)
    if (period.status !== 'draft') { setInitialStepSet(true); return }

    const hasWater = period.water_total_cost > 0
    const hasExpenses = expenses.length > 0

    if (hasWater && hasExpenses && statements.length > 0) {
      setStep(3)
    } else if (hasWater && hasExpenses) {
      setStep(2)
    } else if (hasWater) {
      setStep(2)
    }
    // else stay at step 1

    setInitialStepSet(true)
  }, [period, expenses.length, statements.length, loading, initialStepSet])

  if (loading || !building) {
    return <div className="p-8"><p className="text-slate-500">Cargando periodo...</p></div>
  }

  // Show report view for published/closed periods
  if (period && (period.status === 'published' || period.status === 'closed')) {
    return <PeriodReport period={period} building={building} onReopen={reopenPeriod} />
  }

  const isIndividual = building.water_metering_type === 'individual'
  const periodYear = period?.year ?? currentYear
  const periodMonth = period?.month ?? currentMonth
  const periodLabel = `${monthNames[periodMonth]} ${periodYear}`

  // General mode calculations
  const prevGen = parseFloat(waterPrevious) || 0
  const currGen = parseFloat(waterCurrent) || 0
  const consumptionGen = currGen > prevGen ? currGen - prevGen : 0

  // Individual mode calculations
  const totalConsumptionInd = unitReadings.reduce((sum, r) => sum + Math.max(0, r.current - r.previous), 0)
  const costVal = parseFloat(waterCost) || 0
  const costPerM3 = totalConsumptionInd > 0 ? costVal / totalConsumptionInd : 0

  function updateUnitReading(unitId: string, field: 'previous' | 'current', value: string) {
    setUnitReadings((rows: UnitReadingRow[]) =>
      rows.map((r: UnitReadingRow) => {
        if (r.unitId !== unitId) return r
        const numVal = parseFloat(value) || 0
        const updated = { ...r, [field]: numVal }
        updated.consumption = Math.max(0, updated.current - updated.previous)
        return updated
      })
    )
  }

  async function handleCreatePeriod() {
    setSaving(true)
    await createPeriod(currentYear, currentMonth)
    setSaving(false)
  }

  async function handleSaveGeneralWater() {
    setFormError('')
    const prevVal = parseFloat(waterPrevious)
    const currVal = parseFloat(waterCurrent)
    const costV = parseFloat(waterCost)

    if (isNaN(currVal) || currVal <= 0) {
      setFormError('Ingresa la lectura actual.')
      return
    }
    if (currVal <= prevVal) {
      setFormError('La lectura actual debe ser mayor que la anterior.')
      return
    }
    if (isNaN(costV) || costV <= 0) {
      setFormError('Ingresa el costo total de agua.')
      return
    }

    setSaving(true)
    await updateWaterReading(prevVal, currVal, costV)
    setCompletedSteps((prev) => prev.includes(1) ? prev : [...prev, 1])
    setStep(2)
    setSaving(false)
  }

  async function handleSaveIndividualWater() {
    setFormError('')
    const costV = parseFloat(waterCost)

    if (isNaN(costV) || costV <= 0) {
      setFormError('Ingresa el costo total de agua del edificio.')
      return
    }

    const hasInvalidReading = unitReadings.some((r) => r.current > 0 && r.current < r.previous)
    if (hasInvalidReading) {
      setFormError('La lectura actual no puede ser menor que la anterior en ningún departamento.')
      return
    }

    if (totalConsumptionInd <= 0) {
      setFormError('Al menos un departamento debe tener consumo mayor a 0.')
      return
    }

    setSaving(true)

    // Save individual readings
    await saveUnitReadings(
      unitReadings.map((r) => ({
        unitId: r.unitId,
        previous: r.previous,
        current: r.current,
      }))
    )

    // Save total cost to period (reading_current = total consumption for reference)
    await updateWaterReading(0, totalConsumptionInd, costV)

    setCompletedSteps((prev) => prev.includes(1) ? prev : [...prev, 1])
    setStep(2)
    setSaving(false)
  }

  // Step 2 handlers
  async function handleAddExpense() {
    setFormError('')
    const amount = parseFloat(newAmount)
    if (!newConcept.trim()) { setFormError('Ingresa el concepto del gasto.'); return }
    if (isNaN(amount) || amount <= 0) { setFormError('Ingresa un monto válido.'); return }

    setSaving(true)
    await addExpense(newConcept.trim(), amount, newCategory)
    setNewConcept('')
    setNewAmount('')
    setNewCategory('fixed')
    setSaving(false)
  }

  function handleGoToStep3() {
    setFormError('')
    if (expenses.length === 0) {
      setFormError('Registra al menos un gasto antes de continuar.')
      return
    }
    setCompletedSteps((prev) => prev.includes(2) ? prev : [...prev, 2])
    setStep(3)
  }

  // Step 3 handlers
  async function handleGenerateStatements() {
    if (!id) return
    await generateStatements(id)
  }

  async function handleRecalculate() {
    if (!id) return
    await generateStatements(id)
  }

  return (
    <div className="p-8">
      <Breadcrumb buildingId={id} buildingName={building.name} currentPage="Periodo mensual" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{building.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Periodo: {periodLabel} &middot; Medidor: {isIndividual ? 'Individual por depto' : 'General'}
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <WizardStepper currentStep={step} completedSteps={completedSteps} />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Step 1 */}
      {step === 1 && (
        <>
          {!period ? (
            <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6 text-center">
              <p className="text-slate-600 mb-4">No hay periodo abierto para {periodLabel}.</p>
              <button
                onClick={handleCreatePeriod}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creando...' : `Iniciar periodo ${periodLabel}`}
              </button>
            </div>
          ) : period.status !== 'draft' ? (
            <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6">
              <p className="text-slate-600">
                Este periodo ya fue {period.status === 'published' ? 'publicado' : 'cerrado'}.
              </p>
            </div>
          ) : !isIndividual ? (
            /* === GENERAL MODE === */
            <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Lectura de agua — Medidor general</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lectura anterior (m³)</label>
                <input
                  type="number" value={waterPrevious} onChange={(e) => setWaterPrevious(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="any"
                />
                {previousReading > 0 && <p className="text-xs text-slate-400 mt-1">Auto-llenado del periodo anterior</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lectura actual (m³)</label>
                <input
                  type="number" value={waterCurrent} onChange={(e) => setWaterCurrent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="any" placeholder="Ingresa la lectura actual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo total de agua (S/)</label>
                <input
                  type="number" value={waterCost} onChange={(e) => setWaterCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01" placeholder="0.00"
                />
              </div>

              {currGen > 0 && prevGen >= 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    Consumo total: <span className="font-semibold">{consumptionGen.toLocaleString('en-US')} m³</span>
                  </p>
                </div>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                onClick={handleSaveGeneralWater} disabled={saving}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Siguiente'}
              </button>
            </div>
          ) : (
            /* === INDIVIDUAL MODE === */
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Lecturas de agua — Por departamento</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-medium text-slate-600">Depto</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-600">Anterior</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-600">Actual</th>
                      <th className="text-right py-2 px-2 font-medium text-slate-600">Consumo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitReadings.map((row) => {
                      const cons = Math.max(0, row.current - row.previous)
                      return (
                        <tr key={row.unitId} className="border-b border-slate-100">
                          <td className="py-1.5 px-2 text-slate-800 font-medium">{row.unitNumber}</td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              value={row.previous || ''}
                              onChange={(e) => updateUnitReading(row.unitId, 'previous', e.target.value)}
                              className="w-24 text-right px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              step="any"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              value={row.current || ''}
                              onChange={(e) => updateUnitReading(row.unitId, 'current', e.target.value)}
                              className="w-24 text-right px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              step="any"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">
                            {cons > 0 ? cons.toLocaleString('en-US') : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300">
                      <td className="py-2 px-2 font-semibold text-slate-800" colSpan={3}>Total consumo</td>
                      <td className="py-2 px-2 text-right font-semibold text-slate-800 tabular-nums">
                        {totalConsumptionInd > 0 ? totalConsumptionInd.toLocaleString('en-US') : '—'} m³
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo total de agua del edificio (S/)</label>
                <input
                  type="number" value={waterCost} onChange={(e) => setWaterCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01" placeholder="0.00"
                />
              </div>

              {totalConsumptionInd > 0 && costVal > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    Consumo total: <span className="font-semibold">{totalConsumptionInd.toLocaleString('en-US')} m³</span>
                    {' '}&middot;{' '}
                    Costo por m³: <span className="font-semibold">S/ {costPerM3.toFixed(2)}</span>
                  </p>
                </div>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                onClick={handleSaveIndividualWater} disabled={saving}
                className="w-full max-w-xs py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Siguiente'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Step 2: Expenses */}
      {step === 2 && (
        <div className="max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Gastos del mes</h2>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
              >
                Importar desde extracto
              </button>
            </div>

            {expensesError && <p className="text-sm text-red-600">{expensesError}</p>}

            {/* Existing expenses */}
            {expenses.length > 0 && (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onUpdate={updateExpense}
                    onDelete={deleteExpense}
                  />
                ))}
              </div>
            )}

            {/* Add new expense */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-600 mb-2">Agregar gasto</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  placeholder="Concepto"
                  className="flex-1 min-w-[140px] px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="Monto"
                  step="0.01"
                  className="w-28 px-3 py-2 border border-slate-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fijo</option>
                  <option value="variable">Variable</option>
                </select>
                <button
                  onClick={handleAddExpense}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-slate-300 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">Total gastos:</span>
                <span className="font-semibold text-slate-800 tabular-nums">{formatMoney(totalExpenses)}</span>
              </div>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => { setFormError(''); setStep(1) }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Anterior
              </button>
              <button
                onClick={handleGoToStep3}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import expenses modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowImportModal(false); clearParsed() }} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Importar gastos desde extracto bancario</h3>

            {parsedExpenses.length === 0 ? (
              <div className="max-w-sm">
                <FileUploader onFileSelect={(file) => parseExpensesFromFile(file)} loading={importLoading} />
                {importError && <p className="text-sm text-red-600 mt-2">{importError}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">{parsedExpenses.filter((e) => e.selected).length} de {parsedExpenses.length} egresos seleccionados</p>

                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200">
                        <th className="py-2 px-2 w-8"></th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Monto</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Concepto</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Categoría</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedExpenses.map((exp, i) => (
                        <tr key={i} className={`border-b border-slate-100 ${!exp.selected ? 'opacity-40' : ''}`}>
                          <td className="py-1.5 px-2">
                            <input type="checkbox" checked={exp.selected}
                              onChange={(e) => updateParsedExpense(i, { selected: e.target.checked })}
                              className="rounded" />
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(exp.amount)}</td>
                          <td className="py-1.5 px-2">
                            <input type="text" value={exp.concept}
                              onChange={(e) => updateParsedExpense(i, { concept: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="py-1.5 px-2">
                            <select value={exp.category}
                              onChange={(e) => updateParsedExpense(i, { category: e.target.value as ExpenseCategory })}
                              className="px-2 py-1 border border-slate-200 rounded text-sm">
                              <option value="fixed">Fijo</option>
                              <option value="variable">Variable</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowImportModal(false); clearParsed() }}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!period) return
                      const ok = await importSelectedExpenses(period.id)
                      if (ok) {
                        setShowImportModal(false)
                        await refetchExpenses()
                      }
                    }}
                    disabled={importLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {importLoading ? 'Importando...' : `Importar seleccionados (${parsedExpenses.filter((e) => e.selected).length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Prorrateo */}
      {step === 3 && (
        <div>
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Revisión de prorrateo</h2>

            {statementsError && <p className="text-sm text-red-600">{statementsError}</p>}

            {statementsLoading ? (
              <p className="text-slate-500">Calculando...</p>
            ) : statements.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-600 mb-4">Los estados de cuenta no han sido generados aún.</p>
                <button
                  onClick={handleGenerateStatements}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                  Calcular prorrateo
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 font-medium text-slate-600">Depto</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">m²</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Agua</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Gastos</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Saldo ant.</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statements.map((st) => (
                        <tr
                          key={st.id}
                          className={`border-b border-slate-100 ${st.previous_balance > 0 ? 'bg-amber-50' : ''}`}
                        >
                          <td className="py-1.5 px-2 font-medium text-slate-800">{st.unit_number}</td>
                          <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">{st.area_sqm}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(st.water_charge)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(st.expenses_charge)}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {st.previous_balance > 0 ? formatMoney(st.previous_balance) : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-semibold tabular-nums">{formatMoney(st.total_due)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300">
                        <td className="py-2 px-2 font-semibold text-slate-800" colSpan={2}>Totales</td>
                        <td className="py-2 px-2 text-right font-semibold tabular-nums">{formatMoney(statementTotals.water)}</td>
                        <td className="py-2 px-2 text-right font-semibold tabular-nums">{formatMoney(statementTotals.expenses)}</td>
                        <td className="py-2 px-2 text-right font-semibold tabular-nums">
                          {statementTotals.previousBalance > 0 ? formatMoney(statementTotals.previousBalance) : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold tabular-nums">{formatMoney(statementTotals.totalDue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Validation */}
                <ValidationCheck
                  label="Agua"
                  calculated={statementTotals.water}
                  expected={period?.water_total_cost ?? 0}
                />
                <ValidationCheck
                  label="Gastos"
                  calculated={statementTotals.expenses}
                  expected={totalExpenses}
                />

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleRecalculate}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Recalcular
                  </button>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Anterior
              </button>
              <button
                onClick={() => {
                  if (statements.length > 0) {
                    setCompletedSteps((prev) => prev.includes(3) ? prev : [...prev, 3])
                    setStep(4)
                  }
                }}
                disabled={statements.length === 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Publish */}
      {step === 4 && (
        <div className="max-w-lg">
          {published ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-green-800 mb-2">Estados de cuenta publicados</h2>
              <p className="text-sm text-green-700 mb-4">Los condóminos ya pueden ver sus estados de cuenta.</p>
              <button
                onClick={() => navigate(`/admin/buildings/${id}`)}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
              >
                Volver al edificio
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <h2 className="text-lg font-semibold text-slate-800">Publicar estados de cuenta</h2>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Edificio</span>
                  <span className="font-medium text-slate-800">{building?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Periodo</span>
                  <span className="font-medium text-slate-800">{periodLabel}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Modalidad agua</span>
                  <span className="font-medium text-slate-800">{isIndividual ? 'Individual' : 'General'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Costo agua</span>
                  <span className="font-medium text-slate-800">{formatMoney(period?.water_total_cost ?? 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Gastos ({expenses.length})</span>
                  <span className="font-medium text-slate-800">{formatMoney(totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Departamentos</span>
                  <span className="font-medium text-slate-800">{statements.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Total a cobrar</span>
                  <span className="font-semibold text-slate-800">{formatMoney(statementTotals.totalDue)}</span>
                </div>
                {statementTotals.previousBalance > 0 && (
                  <div className="flex justify-between py-1 text-amber-700">
                    <span>Con saldo anterior</span>
                    <span className="font-medium">{formatMoney(statementTotals.previousBalance)}</span>
                  </div>
                )}
              </div>

              {/* Checklist */}
              <div className="space-y-1.5">
                <CheckItem ok={(period?.water_total_cost ?? 0) > 0} label="Lectura de agua registrada" />
                <CheckItem ok={expenses.length > 0} label={`Gastos del mes registrados (${expenses.length})`} />
                <CheckItem ok={statements.length > 0} label={`Prorrateo calculado (${statements.length} deptos)`} />
                <CheckItem
                  ok={
                    statements.length > 0 &&
                    Math.abs(statementTotals.water - (period?.water_total_cost ?? 0)) < 0.02 &&
                    Math.abs(statementTotals.expenses - totalExpenses) < 0.02
                  }
                  label="Números cuadran"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={
                    (period?.water_total_cost ?? 0) <= 0 ||
                    expenses.length === 0 ||
                    statements.length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Publicar estados de cuenta
                </button>
              </div>
            </div>
          )}

          {/* Confirm dialog */}
          {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
              <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Confirmar publicación</h3>
                <p className="text-sm text-slate-600 mb-4">
                  ¿Estás segura? Esta acción no se puede deshacer. Los estados de cuenta quedarán visibles para los condóminos.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setShowConfirm(false)
                      setSaving(true)
                      const success = await publishPeriod()
                      setSaving(false)
                      if (success) {
                        setCompletedSteps([1, 2, 3, 4])
                        setPublished(true)
                      }
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Publicando...' : 'Sí, publicar'}
                  </button>
                </div>
              </div>
            </div>
          )}
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

// === Helper Components ===

function ExpenseRow({
  expense,
  onUpdate,
  onDelete,
}: {
  expense: { id: string; concept: string; amount: number; category: ExpenseCategory }
  onUpdate: (id: string, concept: string, amount: number, category: ExpenseCategory) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [concept, setConcept] = useState(expense.concept)
  const [amount, setAmount] = useState(String(expense.amount))
  const [category, setCategory] = useState<ExpenseCategory>(expense.category)
  const [dirty, setDirty] = useState(false)

  async function handleBlur() {
    if (!dirty) return
    const amt = parseFloat(amount) || 0
    if (concept.trim() && amt > 0) {
      await onUpdate(expense.id, concept.trim(), amt, category)
      setDirty(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <input
        type="text"
        value={concept}
        onChange={(e) => { setConcept(e.target.value); setDirty(true) }}
        onBlur={handleBlur}
        className="flex-1 min-w-[140px] px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => { setAmount(e.target.value); setDirty(true) }}
        onBlur={handleBlur}
        step="0.01"
        className="w-28 px-3 py-1.5 border border-slate-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <select
        value={category}
        onChange={(e) => { setCategory(e.target.value as ExpenseCategory); setDirty(true) }}
        onBlur={handleBlur}
        className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="fixed">Fijo</option>
        <option value="variable">Variable</option>
      </select>
      <button
        onClick={() => onDelete(expense.id)}
        className="px-2 py-1.5 text-slate-400 hover:text-red-600 transition-colors"
        title="Eliminar"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>
      {ok ? (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  )
}

function ValidationCheck({
  label,
  calculated,
  expected,
}: {
  label: string
  calculated: number
  expected: number
}) {
  const diff = Math.abs(calculated - expected)
  const ok = diff < 0.02 // rounding tolerance

  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-amber-700'}`}>
      {ok ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.59H2.34L12 3z" />
        </svg>
      )}
      <span>
        {label}: {formatMoney(calculated)} / {formatMoney(expected)}
        {ok ? ' — cuadra' : ` — diferencia: ${formatMoney(diff)}`}
      </span>
    </div>
  )
}
