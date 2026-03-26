import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense, ExpenseCategory } from '../types/database'

export function useExpenses(periodId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const fetchExpenses = useCallback(async () => {
    if (!periodId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('period_id', periodId)
      .order('created_at')

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setExpenses((data ?? []) as Expense[])
    }

    setLoading(false)
  }, [periodId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  async function addExpense(concept: string, amount: number, category: ExpenseCategory) {
    if (!periodId) return

    setError(null)

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({ period_id: periodId, concept, amount, category })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    setExpenses((prev) => [...prev, data as Expense])
  }

  async function updateExpense(id: string, concept: string, amount: number, category: ExpenseCategory) {
    setError(null)

    const { data, error: updateError } = await supabase
      .from('expenses')
      .update({ concept, amount, category })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return
    }

    setExpenses((prev) => prev.map((e) => (e.id === id ? (data as Expense) : e)))
  }

  async function deleteExpense(id: string) {
    setError(null)

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  return { expenses, loading, error, totalExpenses, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses }
}
