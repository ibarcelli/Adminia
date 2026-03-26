import { useState } from 'react'
import { read, utils } from 'xlsx'
import { supabase } from '../lib/supabase'
import type { ExpenseCategory } from '../types/database'

export interface ParsedExpense {
  date: string
  description: string
  concept: string
  amount: number
  selected: boolean
  category: ExpenseCategory
}

function parseDate(raw: unknown): string | null {
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400000)
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.trim().match(/(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/)
    if (parts) {
      const [, a, b, c] = parts
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().split('T')[0]
  return null
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') return parseFloat(raw.replace(/[^0-9.,-]/g, '').replace(',', '')) || 0
  return 0
}

export function useExpenseImport() {
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function parseExpensesFromFile(file: File) {
    setError(null)
    setLoading(true)

    try {
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: 'array', cellDates: true })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

      const results: ParsedExpense[] = []

      for (const row of rows) {
        if (!Array.isArray(row)) continue

        const colA = row[0] // Fecha
        const colE = row[4] // Monto egreso (negative)
        const colG = row[6] // Descripción
        const colH = row[7] // Concepto

        const expenseAmt = parseAmount(colE)
        if (expenseAmt >= 0) continue // Only negatives are expenses

        const date = parseDate(colA)
        if (!date) continue

        const amount = Math.abs(expenseAmt)
        if (amount <= 0) continue

        results.push({
          date,
          description: colG != null ? String(colG).trim() : '',
          concept: colH != null ? String(colH).trim() : (colG != null ? String(colG).trim() : ''),
          amount,
          selected: true,
          category: 'fixed',
        })
      }

      if (results.length === 0) throw new Error('No se encontraron egresos en el extracto')
      setParsedExpenses(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo')
      setParsedExpenses([])
    }

    setLoading(false)
  }

  function updateExpense(index: number, updates: Partial<ParsedExpense>) {
    setParsedExpenses((prev) => prev.map((e, i) => i === index ? { ...e, ...updates } : e))
  }

  async function importSelectedExpenses(periodId: string) {
    setError(null)
    setLoading(true)

    const selected = parsedExpenses.filter((e) => e.selected && e.concept.trim() && e.amount > 0)
    if (selected.length === 0) {
      setError('No hay gastos seleccionados para importar.')
      setLoading(false)
      return false
    }

    const rows = selected.map((e) => ({
      period_id: periodId,
      concept: e.concept.trim(),
      amount: e.amount,
      category: e.category,
    }))

    const { error: insertError } = await supabase.from('expenses').insert(rows)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return false
    }

    setParsedExpenses([])
    setLoading(false)
    return true
  }

  function clearParsed() {
    setParsedExpenses([])
    setError(null)
  }

  return { parsedExpenses, loading, error, parseExpensesFromFile, updateExpense, importSelectedExpenses, clearParsed }
}
