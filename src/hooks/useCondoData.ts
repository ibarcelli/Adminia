import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Unit, Building, Statement, Period } from '../types/database'

export interface StatementWithPeriod extends Statement {
  year: number
  month: number
  receipt_number: string | null
}

export interface BuildingFinances {
  expenses: { concept: string; amount: number }[]
  totalExpenses: number
  totalCollected: number
  totalPending: number
  totalIncome: number
}

export function useCondoData(unitId: string | null | undefined) {
  const [unit, setUnit] = useState<Unit | null>(null)
  const [building, setBuilding] = useState<Building | null>(null)
  const [currentStatement, setCurrentStatement] = useState<StatementWithPeriod | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null)
  const [history, setHistory] = useState<StatementWithPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch unit + building + current statement
  useEffect(() => {
    async function fetch() {
      if (!unitId) { setLoading(false); return }

      setLoading(true)
      setError(null)

      // Get unit
      const { data: u } = await supabase.from('units').select('*').eq('id', unitId).single()
      if (!u) { setError('Departamento no encontrado'); setLoading(false); return }
      setUnit(u as Unit)

      // Get building
      const { data: b } = await supabase.from('buildings').select('*').eq('id', (u as Unit).building_id).single()
      if (b) setBuilding(b as Building)

      // Get most recent published period for this building
      const { data: period } = await supabase
        .from('periods')
        .select('*')
        .eq('building_id', (u as Unit).building_id)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (period) {
        setCurrentPeriod(period as Period)

        // Get statement for this unit in this period
        const { data: stmt } = await supabase
          .from('statements')
          .select('*')
          .eq('period_id', period.id)
          .eq('unit_id', unitId)
          .maybeSingle()

        if (stmt) {
          setCurrentStatement({
            ...(stmt as Statement),
            year: (period as Period).year,
            month: (period as Period).month,
            receipt_number: null,
          })

          // Check for receipt
          if ((stmt as Statement).status === 'paid') {
            const { data: payment } = await supabase
              .from('payments')
              .select('receipts(receipt_number)')
              .eq('statement_id', (stmt as Statement).id)
              .limit(1)
              .maybeSingle()

            if (payment) {
              const receipts = (payment as unknown as { receipts: { receipt_number: string }[] }).receipts
              const receipt = Array.isArray(receipts) ? receipts[0] : receipts
              if (receipt) {
                setCurrentStatement((prev) => prev ? { ...prev, receipt_number: receipt.receipt_number } : null)
              }
            }
          }
        }
      }

      setLoading(false)
    }
    fetch()
  }, [unitId])

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!unitId) return

    const { data: stmts } = await supabase
      .from('statements')
      .select('*, periods(year, month, status)')
      .eq('unit_id', unitId)

    if (!stmts) return

    // Filter to published/closed periods only
    const filtered = (stmts as unknown as (Statement & { periods: { year: number; month: number; status: string }[] })[])
      .filter((s) => {
        const p = Array.isArray(s.periods) ? s.periods[0] : s.periods
        return p && (p.status === 'published' || p.status === 'closed')
      })

    // Get receipts for paid statements
    const paidIds = filtered.filter((s) => s.status === 'paid').map((s) => s.id)
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

    const result: StatementWithPeriod[] = filtered.map((s) => {
      const p = Array.isArray(s.periods) ? s.periods[0] : s.periods
      return {
        ...s,
        year: p.year,
        month: p.month,
        receipt_number: receiptMap.get(s.id) ?? null,
      }
    })

    result.sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month)
    setHistory(result)
  }, [unitId])

  // Fetch building finances
  const fetchBuildingFinances = useCallback(async (periodId: string): Promise<BuildingFinances | null> => {
    // Get expenses
    const { data: expData } = await supabase
      .from('expenses')
      .select('concept, amount')
      .eq('period_id', periodId)
      .order('created_at')

    const expenses = (expData ?? []) as { concept: string; amount: number }[]
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    // Get statement totals (no individual data)
    const { data: stmts } = await supabase
      .from('statements')
      .select('total_due, status')
      .eq('period_id', periodId)

    const allStmts = (stmts ?? []) as { total_due: number; status: string }[]
    const totalCollected = allStmts.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.total_due, 0)
    const totalPending = allStmts.filter((s) => s.status !== 'paid').reduce((sum, s) => sum + s.total_due, 0)
    const totalIncome = totalCollected + totalPending

    return { expenses, totalExpenses, totalCollected, totalPending, totalIncome }
  }, [])

  return {
    unit, building, currentStatement, currentPeriod,
    history, fetchHistory,
    fetchBuildingFinances,
    loading, error,
  }
}
