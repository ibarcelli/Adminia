import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface ArrearPeriod {
  periodId: string
  year: number
  month: number
  totalDue: number
  statementId: string
}

export interface ArrearUnit {
  unitId: string
  unitNumber: string
  ownerName: string
  periodsOwed: number
  totalOwed: number
  periods: ArrearPeriod[]
}

export function useArrears(buildingId: string | undefined) {
  const [arrears, setArrears] = useState<ArrearUnit[]>([])
  const [allPeriods, setAllPeriods] = useState<{ id: string; year: number; month: number }[]>([])
  const [filterPeriodId, setFilterPeriodId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalOwed = arrears.reduce((s, a) => s + a.totalOwed, 0)
  const totalDebtors = arrears.length

  const fetchArrears = useCallback(async () => {
    if (!buildingId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    // Get published/closed periods for this building
    const { data: periods } = await supabase
      .from('periods')
      .select('id, year, month')
      .eq('building_id', buildingId)
      .in('status', ['published', 'closed'])
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    setAllPeriods((periods ?? []) as { id: string; year: number; month: number }[])

    const periodIds = (periods ?? []).map((p: { id: string }) => p.id)
    if (periodIds.length === 0) {
      setArrears([])
      setLoading(false)
      return
    }

    // Filter by specific period if selected
    const targetPeriodIds = filterPeriodId ? [filterPeriodId] : periodIds

    // Get unpaid statements
    const { data: stmts, error: stmtError } = await supabase
      .from('statements')
      .select('id, period_id, unit_id, total_due, status, units(unit_number, owner_name), periods(year, month)')
      .in('period_id', targetPeriodIds)
      .neq('status', 'paid')

    if (stmtError) {
      setError(stmtError.message)
      setLoading(false)
      return
    }

    // Group by unit
    const unitMap = new Map<string, ArrearUnit>()

    for (const raw of (stmts ?? []) as unknown as {
      id: string; period_id: string; unit_id: string; total_due: number;
      units: { unit_number: string; owner_name: string }[];
      periods: { year: number; month: number }[];
    }[]) {
      const unit = Array.isArray(raw.units) ? raw.units[0] : raw.units
      const period = Array.isArray(raw.periods) ? raw.periods[0] : raw.periods

      if (!unit || !period) continue

      const existing = unitMap.get(raw.unit_id)
      const periodEntry: ArrearPeriod = {
        periodId: raw.period_id,
        year: period.year,
        month: period.month,
        totalDue: raw.total_due,
        statementId: raw.id,
      }

      if (existing) {
        existing.periodsOwed += 1
        existing.totalOwed += raw.total_due
        existing.periods.push(periodEntry)
      } else {
        unitMap.set(raw.unit_id, {
          unitId: raw.unit_id,
          unitNumber: unit.unit_number,
          ownerName: unit.owner_name,
          periodsOwed: 1,
          totalOwed: raw.total_due,
          periods: [periodEntry],
        })
      }
    }

    // Sort by total owed descending
    const result = Array.from(unitMap.values())
    result.sort((a, b) => b.totalOwed - a.totalOwed)

    // Sort periods within each unit chronologically
    for (const u of result) {
      u.periods.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    }

    setArrears(result)
    setLoading(false)
  }, [buildingId, filterPeriodId])

  useEffect(() => { fetchArrears() }, [fetchArrears])

  return { arrears, allPeriods, filterPeriodId, setFilterPeriodId, loading, error, totalOwed, totalDebtors }
}
