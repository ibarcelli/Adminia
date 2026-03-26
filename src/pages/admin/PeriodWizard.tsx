import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { WizardStepper } from '../../components/ui/WizardStepper'
import { usePeriod } from '../../hooks/usePeriod'
import type { Building } from '../../types/database'

const monthNames = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function PeriodWizard() {
  const { id } = useParams<{ id: string }>()
  const {
    period, previousReading, loading, error,
    currentYear, currentMonth,
    createPeriod, updateWaterReading,
  } = usePeriod(id)

  const [building, setBuilding] = useState<Building | null>(null)
  const [step, setStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  // Water form state
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

  // Sync form with period data
  useEffect(() => {
    if (period) {
      setWaterPrevious(period.water_reading_previous > 0 ? String(period.water_reading_previous) : String(previousReading))
      setWaterCurrent(period.water_reading_current > 0 ? String(period.water_reading_current) : '')
      setWaterCost(period.water_total_cost > 0 ? String(period.water_total_cost) : '')
    } else {
      setWaterPrevious(previousReading > 0 ? String(previousReading) : '')
    }
  }, [period, previousReading])

  // Check if step 1 was already completed (water data saved)
  useEffect(() => {
    if (period && period.water_reading_current > 0 && period.water_total_cost > 0) {
      if (!completedSteps.includes(1)) {
        setCompletedSteps((prev) => [...prev, 1])
      }
    }
  }, [period, completedSteps])

  if (loading) {
    return <div className="p-8"><p className="text-slate-500">Cargando periodo...</p></div>
  }

  const periodYear = period?.year ?? currentYear
  const periodMonth = period?.month ?? currentMonth
  const periodLabel = `${monthNames[periodMonth]} ${periodYear}`

  const prev = parseFloat(waterPrevious) || 0
  const curr = parseFloat(waterCurrent) || 0
  const consumption = curr > prev ? curr - prev : 0

  async function handleCreatePeriod() {
    setSaving(true)
    await createPeriod(currentYear, currentMonth)
    setSaving(false)
  }

  async function handleSaveWater() {
    setFormError('')

    const prevVal = parseFloat(waterPrevious)
    const currVal = parseFloat(waterCurrent)
    const costVal = parseFloat(waterCost)

    if (isNaN(currVal) || currVal <= 0) {
      setFormError('Ingresa la lectura actual.')
      return
    }
    if (currVal <= prevVal) {
      setFormError('La lectura actual debe ser mayor que la anterior.')
      return
    }
    if (isNaN(costVal) || costVal <= 0) {
      setFormError('Ingresa el costo total de agua.')
      return
    }

    setSaving(true)
    await updateWaterReading(prevVal, currVal, costVal)
    setCompletedSteps((prev) => prev.includes(1) ? prev : [...prev, 1])
    setStep(2)
    setSaving(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {building?.name ?? 'Edificio'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Periodo: {periodLabel}</p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <WizardStepper currentStep={step} completedSteps={completedSteps} />
      </div>

      {/* Error from hook */}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Step content */}
      {step === 1 && (
        <div className="max-w-md">
          {!period ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
              <p className="text-slate-600 mb-4">
                No hay periodo abierto para {periodLabel}.
              </p>
              <button
                onClick={handleCreatePeriod}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creando...' : `Iniciar periodo ${periodLabel}`}
              </button>
            </div>
          ) : period.status !== 'draft' ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <p className="text-slate-600">
                Este periodo ya fue {period.status === 'published' ? 'publicado' : 'cerrado'}.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">Lectura de agua</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lectura anterior (m³)
                </label>
                <input
                  type="number"
                  value={waterPrevious}
                  onChange={(e) => setWaterPrevious(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="any"
                />
                {previousReading > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Auto-llenado del periodo anterior</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lectura actual (m³)
                </label>
                <input
                  type="number"
                  value={waterCurrent}
                  onChange={(e) => setWaterCurrent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="any"
                  placeholder="Ingresa la lectura actual"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Costo total de agua (S/)
                </label>
                <input
                  type="number"
                  value={waterCost}
                  onChange={(e) => setWaterCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              {/* Real-time consumption */}
              {curr > 0 && prev >= 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    Consumo total: <span className="font-semibold">{consumption.toLocaleString('en-US')} m³</span>
                  </p>
                </div>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                onClick={handleSaveWater}
                disabled={saving}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Siguiente'}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md bg-white border border-slate-200 rounded-lg p-6">
          <p className="text-slate-500">Paso 2 — Gastos — Próximamente (STORY-008)</p>
          <button
            onClick={() => setStep(1)}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
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
