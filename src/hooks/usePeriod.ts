import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Period } from '../types/database'

export function usePeriod(buildingId: string | undefined) {
  const [period, setPeriod] = useState<Period | null>(null)
  const [previousReading, setPreviousReading] = useState<number>(0)
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

    // Look for draft period for this building (any month — the most recent draft)
    const { data: draftPeriod, error: draftError } = await supabase
      .from('periods')
      .select('*')
      .eq('building_id', buildingId)
      .eq('status', 'draft')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (draftError) {
      setError(draftError.message)
      setLoading(false)
      return
    }

    if (draftPeriod) {
      setPeriod(draftPeriod as Period)
      // Fetch the period before this draft to get previous reading
      await fetchPreviousReading(buildingId, draftPeriod.year, draftPeriod.month)
    } else {
      setPeriod(null)
      // Fetch previous reading for the current month (in case we create a new period)
      await fetchPreviousReading(buildingId, currentYear, currentMonth)
    }

    setLoading(false)
  }, [buildingId, currentYear, currentMonth])

  async function fetchPreviousReading(bId: string, year: number, month: number) {
    // Get the period just before the given year/month
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
  }, [fetchPeriod])

  async function createPeriod(year: number, month: number) {
    if (!buildingId) return

    setError(null)

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

  return {
    period,
    previousReading,
    loading,
    error,
    currentYear,
    currentMonth,
    createPeriod,
    updateWaterReading,
    refetch: fetchPeriod,
  }
}
