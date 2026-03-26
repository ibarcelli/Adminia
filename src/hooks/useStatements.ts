import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Statement, Unit } from '../types/database'

export interface StatementRow extends Statement {
  unit_number: string
  area_sqm: number
}

export function useStatements(periodId: string | undefined) {
  const [statements, setStatements] = useState<StatementRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totals = {
    water: statements.reduce((s, st) => s + st.water_charge, 0),
    expenses: statements.reduce((s, st) => s + st.expenses_charge, 0),
    previousBalance: statements.reduce((s, st) => s + st.previous_balance, 0),
    totalDue: statements.reduce((s, st) => s + st.total_due, 0),
  }

  const fetchStatements = useCallback(async () => {
    if (!periodId) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('statements')
      .select('*, units(unit_number, area_sqm)')
      .eq('period_id', periodId)
      .order('unit_id')

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows: StatementRow[] = ((data ?? []) as (Statement & { units: Pick<Unit, 'unit_number' | 'area_sqm'> })[]).map((row) => ({
      ...row,
      unit_number: row.units.unit_number,
      area_sqm: row.units.area_sqm,
    }))

    rows.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
    setStatements(rows)
    setLoading(false)
  }, [periodId])

  async function generateStatements(buildingId: string) {
    if (!periodId) return

    setLoading(true)
    setError(null)

    // 1. Get building for water_metering_type
    const { data: building } = await supabase
      .from('buildings')
      .select('water_metering_type')
      .eq('id', buildingId)
      .single()

    if (!building) {
      setError('Edificio no encontrado')
      setLoading(false)
      return
    }

    // 2. Get active units
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number, area_sqm')
      .eq('building_id', buildingId)
      .eq('is_active', true)

    if (!units || units.length === 0) {
      setError('No hay departamentos activos')
      setLoading(false)
      return
    }

    const totalSqm = units.reduce((s: number, u: { area_sqm: number }) => s + u.area_sqm, 0)

    // 3. Get period data
    const { data: period } = await supabase
      .from('periods')
      .select('*')
      .eq('id', periodId)
      .single()

    if (!period) {
      setError('Periodo no encontrado')
      setLoading(false)
      return
    }

    const waterTotalCost = period.water_total_cost

    // 4. Get expenses total (excluding water category — water is handled separately)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('period_id', periodId)

    const totalExpensesNonWater = (expenses ?? [])
      .filter((e: { category: string }) => e.category !== 'water')
      .reduce((s: number, e: { amount: number }) => s + e.amount, 0)

    // 5. Individual water readings (if applicable)
    let unitConsumptionMap = new Map<string, number>()
    let totalConsumption = 0

    if (building.water_metering_type === 'individual') {
      const { data: readings } = await supabase
        .from('unit_water_readings')
        .select('unit_id, consumption')
        .eq('period_id', periodId)

      for (const r of (readings ?? []) as { unit_id: string; consumption: number }[]) {
        unitConsumptionMap.set(r.unit_id, r.consumption)
        totalConsumption += r.consumption
      }
    }

    // 6. Get previous period to find pending balances
    const prevMonth = period.month === 1 ? 12 : period.month - 1
    const prevYear = period.month === 1 ? period.year - 1 : period.year

    const { data: prevPeriod } = await supabase
      .from('periods')
      .select('id')
      .eq('building_id', buildingId)
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .maybeSingle()

    let prevBalanceMap = new Map<string, number>()
    if (prevPeriod) {
      const { data: prevStatements } = await supabase
        .from('statements')
        .select('unit_id, total_due, status')
        .eq('period_id', prevPeriod.id)

      for (const ps of (prevStatements ?? []) as { unit_id: string; total_due: number; status: string }[]) {
        if (ps.status !== 'paid') {
          prevBalanceMap.set(ps.unit_id, ps.total_due)
        }
      }
    }

    // 7. Calculate and upsert statements
    const statementsToUpsert = units.map((unit: { id: string; area_sqm: number }) => {
      let waterCharge: number
      if (building.water_metering_type === 'individual' && totalConsumption > 0) {
        const unitConsumption = unitConsumptionMap.get(unit.id) ?? 0
        waterCharge = waterTotalCost * (unitConsumption / totalConsumption)
      } else {
        waterCharge = totalSqm > 0 ? waterTotalCost * (unit.area_sqm / totalSqm) : 0
      }

      const expensesCharge = totalSqm > 0 ? totalExpensesNonWater * (unit.area_sqm / totalSqm) : 0
      const previousBalance = prevBalanceMap.get(unit.id) ?? 0
      const totalDue = waterCharge + expensesCharge + previousBalance

      return {
        period_id: periodId,
        unit_id: unit.id,
        water_charge: Math.round(waterCharge * 100) / 100,
        expenses_charge: Math.round(expensesCharge * 100) / 100,
        previous_balance: Math.round(previousBalance * 100) / 100,
        total_due: Math.round(totalDue * 100) / 100,
        status: 'pending' as const,
      }
    })

    const { error: upsertError } = await supabase
      .from('statements')
      .upsert(statementsToUpsert, { onConflict: 'period_id,unit_id' })

    if (upsertError) {
      setError(upsertError.message)
      setLoading(false)
      return
    }

    await fetchStatements()
  }

  return { statements, loading, error, totals, generateStatements, fetchStatements }
}
