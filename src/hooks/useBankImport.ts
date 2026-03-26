import { useState, useEffect, useCallback } from 'react'
import { read, utils } from 'xlsx'
import { supabase } from '../lib/supabase'
import type { BankImport, BankTransaction } from '../types/database'

export interface ParsedRow {
  date: string
  amount: number
  reference: string
  description: string
}

function parseExcel(buffer: ArrayBuffer): ParsedRow[] {
  const wb = read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  if (rows.length === 0) throw new Error('El archivo está vacío')

  // Auto-detect columns
  const headers = Object.keys(rows[0]).map((h) => h.toLowerCase())

  const dateCol = headers.find((h) => /fecha|date/i.test(h))
  const amountCol = headers.find((h) => /monto|importe|amount|abono|credito|créd/i.test(h))
  const refCol = headers.find((h) => /refer|nro|número|numero|num/i.test(h))
  const descCol = headers.find((h) => /desc|concepto|detalle|glosa|observ/i.test(h))

  if (!amountCol) throw new Error('No se encontró una columna de monto (monto, importe, amount, abono)')

  const originalHeaders = Object.keys(rows[0])
  const dateKey = dateCol ? originalHeaders.find((h) => h.toLowerCase() === dateCol) : undefined
  const amountKey = originalHeaders.find((h) => h.toLowerCase() === amountCol)!
  const refKey = refCol ? originalHeaders.find((h) => h.toLowerCase() === refCol) : undefined
  const descKey = descCol ? originalHeaders.find((h) => h.toLowerCase() === descCol) : undefined

  return rows
    .map((row) => {
      const rawAmount = row[amountKey]
      const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''))
      if (isNaN(amount) || amount <= 0) return null

      let date = ''
      if (dateKey) {
        const rawDate = row[dateKey]
        if (typeof rawDate === 'number') {
          // Excel serial date
          const d = new Date((rawDate - 25569) * 86400000)
          date = d.toISOString().split('T')[0]
        } else if (typeof rawDate === 'string' && rawDate) {
          // Try to parse common date formats
          const parts = rawDate.match(/(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/)
          if (parts) {
            const [, a, b, c] = parts
            if (a.length === 4) date = `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
            else date = `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
          }
        }
      }
      if (!date) date = new Date().toISOString().split('T')[0]

      return {
        date,
        amount,
        reference: String(refKey ? row[refKey] ?? '' : ''),
        description: String(descKey ? row[descKey] ?? '' : ''),
      }
    })
    .filter((r): r is ParsedRow => r !== null)
}

export function useBankImport(buildingId: string | undefined, periodId: string | undefined) {
  const [bankImport, setBankImport] = useState<BankImport | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [allParsed, setAllParsed] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const parsed = parseExcel(buffer)
      if (parsed.length === 0) throw new Error('No se encontraron movimientos válidos (monto > 0)')
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
      match_status: 'unmatched' as const,
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
    loading, error,
    parseFile, confirmImport, deleteImport, clearPreview,
    refetch: fetchImport,
  }
}
