import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { WizardStepper } from '../../components/ui/WizardStepper'
import { usePeriod } from '../../hooks/usePeriod'
import type { UnitReadingRow } from '../../hooks/usePeriod'
import type { Building } from '../../types/database'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PeriodWizard() {
  const { id } = useParams<{ id: string }>()
  const {
    period, previousReading, unitReadings, setUnitReadings,
    loading, error,
    currentYear, currentMonth,
    createPeriod, updateWaterReading,
    fetchUnitReadings, autoFillPreviousReadings, saveUnitReadings,
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

  if (loading || !building) {
    return <div className="p-8"><p className="text-slate-500">Cargando periodo...</p></div>
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

  return (
    <div className="p-8">
      {/* Header */}
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

      {step === 2 && (
        <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6">
          <p className="text-slate-500">Paso 2 — Gastos — Próximamente (STORY-008)</p>
          <button onClick={() => setStep(1)} className="mt-4 text-sm text-blue-600 hover:underline">
            Volver al paso anterior
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6">
          <p className="text-slate-500">Paso 3 — Revisión — Próximamente (STORY-009)</p>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6">
          <p className="text-slate-500">Paso 4 — Publicar — Próximamente (STORY-010)</p>
        </div>
      )}
    </div>
  )
}
