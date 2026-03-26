import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Period, Unit, UnitWaterReading } from '../types/database'

export interface UnitReadingRow {
  unitId: string
  unitNumber: string
  previous: number
  current: number
  consumption: number
}

export function usePeriod(buildingId: string | undefined, periodId?: string) {
  const [period, setPeriod] = useState<Period | null>(null)
  const [allPeriods, setAllPeriods] = useState<Period[]>([])
  const [previousReading, setPreviousReading] = useState<number>(0)
  const [unitReadings, setUnitReadings] = useState<UnitReadingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const fetchPeriod = useCallback(async () => {
    if (!buildingId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // If specific periodId provided, load that one
    if (periodId) {
      const { data: specificPeriod, error: spError } = await supabase
        .from('periods')
        .select('*')
        .eq('id', periodId)
        .single()

      if (spError) { setError(spError.message); setLoading(false); return }

      setPeriod(specificPeriod as Period)
      await fetchPreviousReading(buildingId, (specificPeriod as Period).year, (specificPeriod as Period).month)
      setLoading(false)
      return
    }

    // Otherwise, find the most recent draft
    const { data: draftPeriod, error: draftError } = await supabase
      .from('periods')
      .select('*')
      .eq('building_id', buildingId)
      .eq('status', 'draft')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (draftError) { setError(draftError.message); setLoading(false); return }

    if (draftPeriod) {
      setPeriod(draftPeriod as Period)
      await fetchPreviousReading(buildingId, draftPeriod.year, draftPeriod.month)
    } else {
      setPeriod(null)
      await fetchPreviousReading(buildingId, currentYear, currentMonth)
    }

    setLoading(false)
  }, [buildingId, periodId, currentYear, currentMonth])

  const fetchAllPeriods = useCallback(async () => {
    if (!buildingId) return

    const { data } = await supabase
      .from('periods')
      .select('*')
      .eq('building_id', buildingId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    setAllPeriods((data ?? []) as Period[])
  }, [buildingId])

  async function fetchPreviousReading(bId: string, year: number, month: number) {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year

    const { data: prevPeriod } = await supabase
      .from('periods')
      .select('water_reading_current')
      .eq('building_id', bId)
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .maybeSingle()

    setPreviousReading(prevPeriod?.water_reading_current ?? 0)
  }

  useEffect(() => {
    fetchPeriod()
    fetchAllPeriods()
  }, [fetchPeriod, fetchAllPeriods])

  async function createPeriod(year: number, month: number) {
    if (!buildingId) return

    setError(null)

    // Check if period already exists for this month (avoid unique constraint error)
    const { data: existing } = await supabase
      .from('periods')
      .select('*')
      .eq('building_id', buildingId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle()

    if (existing) {
      setPeriod(existing as Period)
      return
    }

    const { data, error: insertError } = await supabase
      .from('periods')
      .insert({
        building_id: buildingId,
        year,
        month,
        water_reading_previous: previousReading,
        water_reading_current: 0,
        water_total_cost: 0,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    setPeriod(data as Period)
  }

  async function updateWaterReading(waterPrevious: number, waterCurrent: number, totalCost: number) {
    if (!period) return

    setError(null)

    const { data, error: updateError } = await supabase
      .from('periods')
      .update({
        water_reading_previous: waterPrevious,
        water_reading_current: waterCurrent,
        water_total_cost: totalCost,
      })
      .eq('id', period.id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setPeriod(data as Period)
  }

  // === Individual water readings ===

  async function fetchUnitReadings(periodId: string) {
    if (!buildingId) return

    // Get all active units for this building
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('building_id', buildingId)
      .eq('is_active', true)
      .order('unit_number')

    if (!units) return

    // Get existing readings for this period
    const { data: readings } = await supabase
      .from('unit_water_readings')
      .select('*')
      .eq('period_id', periodId)

    const readingsMap = new Map(
      (readings ?? []).map((r: UnitWaterReading) => [r.unit_id, r])
    )

    const rows: UnitReadingRow[] = (units as Pick<Unit, 'id' | 'unit_number'>[]).map((unit) => {
      const existing = readingsMap.get(unit.id)
      return {
        unitId: unit.id,
        unitNumber: unit.unit_number,
        previous: existing?.reading_previous ?? 0,
        current: existing?.reading_current ?? 0,
        consumption: existing?.consumption ?? 0,
      }
    })

    setUnitReadings(rows)
  }

  async function autoFillPreviousReadings() {
    if (!buildingId || !period) return

    const prevMonth = period.month === 1 ? 12 : period.month - 1
    const prevYear = period.month === 1 ? period.year - 1 : period.year

    // Find the previous period
    const { data: prevPeriod } = await supabase
      .from('periods')
      .select('id')
      .eq('building_id', buildingId)
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .maybeSingle()

    if (!prevPeriod) return

    // Get readings from previous period
    const { data: prevReadings } = await supabase
      .from('unit_water_readings')
      .select('unit_id, reading_current')
      .eq('period_id', prevPeriod.id)

    if (!prevReadings || prevReadings.length === 0) return

    const prevMap = new Map(
      prevReadings.map((r: { unit_id: string; reading_current: number }) => [r.unit_id, r.reading_current])
    )

    setUnitReadings((rows) =>
      rows.map((row) => ({
        ...row,
        previous: prevMap.get(row.unitId) ?? row.previous,
      }))
    )
  }

  async function saveUnitReadings(readings: { unitId: string; previous: number; current: number }[]) {
    if (!period) return

    setError(null)

    // Upsert all readings
    const rows = readings.map((r) => ({
      period_id: period.id,
      unit_id: r.unitId,
      reading_previous: r.previous,
      reading_current: r.current,
      consumption: Math.max(0, r.current - r.previous),
    }))

    const { error: upsertError } = await supabase
      .from('unit_water_readings')
      .upsert(rows, { onConflict: 'period_id,unit_id' })

    if (upsertError) {
      setError(upsertError.message)
      return
    }
  }

  async function reopenPeriod() {
    if (!period) return false

    setError(null)

    const { error: updateError } = await supabase
      .from('periods')
      .update({ status: 'draft', published_at: null })
      .eq('id', period.id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    setPeriod({ ...period, status: 'draft', published_at: null })
    return true
  }

  async function publishPeriod() {
    if (!period) return false

    setError(null)

    const { error: updateError } = await supabase
      .from('periods')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', period.id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    setPeriod({ ...period, status: 'published', published_at: new Date().toISOString() })
    return true
  }

  return {
    period,
    allPeriods,
    previousReading,
    unitReadings,
    setUnitReadings,
    loading,
    error,
    currentYear,
    currentMonth,
    createPeriod,
    updateWaterReading,
    fetchUnitReadings,
    autoFillPreviousReadings,
    saveUnitReadings,
    reopenPeriod,
    publishPeriod,
    fetchAllPeriods,
    refetch: fetchPeriod,
  }
}
