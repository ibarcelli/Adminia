import { useState, useEffect, useCallback } from 'react'
import { read, utils } from 'xlsx'
import { supabase } from '../lib/supabase'
import type { BankImport, BankTransaction, TransactionType } from '../types/database'

export interface ParsedRow {
  date: string
  amount: number
  reference: string
  description: string
  transaction_type: TransactionType
  unit_number: string | null
  concept: string | null
}

function parseDate(raw: unknown): string | null {
  if (typeof raw === 'number') {
    // Excel serial date
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
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split('T')[0]
  }
  return null
}

function parseAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(',', '')
    return parseFloat(cleaned) || 0
  }
  return 0
}

function parseBCPExcel(buffer: ArrayBuffer): ParsedRow[] {
  const wb = read(buffer, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  // Use raw mode to get all rows including sparse data
  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

  if (rows.length === 0) throw new Error('El archivo está vacío')

  const results: ParsedRow[] = []

  for (const row of rows) {
    if (!Array.isArray(row)) continue

    const colA = row[0] // Fecha
    // row[1] = Tipo operación (BCP format, not used currently)
    const colC = row[2] // Referencia
    const colD = row[3] // Monto ingreso
    const colE = row[4] // Monto egreso
    const colF = row[5] // Número de departamento
    const colG = row[6] // Descripción
    const colH = row[7] // Concepto

    // Skip rows without any financial data
    const incomeAmt = parseAmount(colD)
    const expenseAmt = parseAmount(colE)

    if (incomeAmt === 0 && expenseAmt === 0) continue

    // Try to parse date — skip rows where date is just text like "ENERO"
    const date = parseDate(colA)
    if (!date) continue

    const isIncome = incomeAmt > 0
    const amount = isIncome ? incomeAmt : Math.abs(expenseAmt)

    if (amount <= 0) continue

    // Parse unit_number from colF
    let unitNumber: string | null = null
    if (colF !== null && colF !== undefined && String(colF).trim() !== '') {
      unitNumber = String(colF).trim()
    }

    results.push({
      date,
      amount,
      reference: colC != null ? String(colC).trim() : '',
      description: colG != null ? String(colG).trim() : '',
      transaction_type: isIncome ? 'income' : 'expense',
      unit_number: unitNumber,
      concept: colH != null ? String(colH).trim() || null : null,
    })
  }

  return results
}

export function useBankImport(buildingId: string | undefined, periodId: string | undefined) {
  const [bankImport, setBankImport] = useState<BankImport | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [allParsed, setAllParsed] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const incomeCount = allParsed.filter((r) => r.transaction_type === 'income').length
  const expenseCount = allParsed.filter((r) => r.transaction_type === 'expense').length

  const fetchImport = useCallback(async () => {
    if (!buildingId || !periodId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data: imp } = await supabase
      .from('bank_imports')
      .select('*')
      .eq('building_id', buildingId)
      .eq('period_id', periodId)
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (imp) {
      setBankImport(imp as BankImport)
      const { data: txns } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_import_id', imp.id)
        .order('date')

      setTransactions((txns ?? []) as BankTransaction[])
    }

    setLoading(false)
  }, [buildingId, periodId])

  useEffect(() => { fetchImport() }, [fetchImport])

  async function parseFile(file: File) {
    setError(null)
    setLoading(true)

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseBCPExcel(buffer)
      if (parsed.length === 0) throw new Error('No se encontraron movimientos válidos en el extracto')
      setAllParsed(parsed)
      setPreview(parsed.slice(0, 5))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo')
      setPreview(null)
      setAllParsed([])
    }

    setLoading(false)
  }

  async function confirmImport(file: File) {
    if (!buildingId || !periodId || allParsed.length === 0) return

    setLoading(true)
    setError(null)

    const { data: imp, error: impError } = await supabase
      .from('bank_imports')
      .insert({ building_id: buildingId, period_id: periodId, file_name: file.name })
      .select()
      .single()

    if (impError) { setError(impError.message); setLoading(false); return }

    const rows = allParsed.map((r) => ({
      bank_import_id: imp.id,
      date: r.date,
      amount: r.amount,
      reference: r.reference,
      description: r.description,
      transaction_type: r.transaction_type,
      unit_number: r.unit_number,
      concept: r.concept,
      match_status: r.transaction_type === 'expense' ? ('confirmed' as const) : ('unmatched' as const),
    }))

    const { error: txnError } = await supabase.from('bank_transactions').insert(rows)

    if (txnError) { setError(txnError.message); setLoading(false); return }

    setPreview(null)
    setAllParsed([])
    setBankImport(imp as BankImport)
    await fetchImport()
  }

  async function deleteImport(importId: string) {
    setError(null)
    setLoading(true)

    // Delete payments/receipts linked to transactions of this import first
    const { data: txns } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('bank_import_id', importId)

    if (txns && txns.length > 0) {
      const txnIds = txns.map((t: { id: string }) => t.id)
      // Get payments to delete receipts
      const { data: payments } = await supabase
        .from('payments')
        .select('id, statement_id')
        .in('bank_transaction_id', txnIds)

      if (payments && payments.length > 0) {
        const paymentIds = payments.map((p: { id: string }) => p.id)
        const statementIds = payments.map((p: { statement_id: string }) => p.statement_id)
        await supabase.from('receipts').delete().in('payment_id', paymentIds)
        await supabase.from('payments').delete().in('id', paymentIds)
        // Reset statements back to pending
        await supabase.from('statements').update({ status: 'pending' }).in('id', statementIds)
      }
    }

    await supabase.from('bank_transactions').delete().eq('bank_import_id', importId)
    await supabase.from('bank_imports').delete().eq('id', importId)

    setBankImport(null)
    setTransactions([])
    setPreview(null)
    setAllParsed([])
    setLoading(false)
  }

  function clearPreview() {
    setPreview(null)
    setAllParsed([])
  }

  return {
    bankImport, transactions, preview, allParsed,
    incomeCount, expenseCount,
    loading, error,
    parseFile, confirmImport, deleteImport, clearPreview,
    refetch: fetchImport,
  }
}
