import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BankTransaction, MatchStatus, MatchConfidence } from '../types/database'

export interface TransactionRow extends BankTransaction {
  matched_unit_number: string | null
  receipt_number: string | null
}

export interface PendingStatement {
  id: string
  unit_id: string
  unit_number: string
  total_due: number
}

export function useReconciliation(periodId: string | undefined, buildingId: string | undefined) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [pendingStatements, setPendingStatements] = useState<PendingStatement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const incomeTransactions = transactions.filter((t) => t.transaction_type === 'income')
  const expenseTransactions = transactions.filter((t) => t.transaction_type === 'expense')

  const stats = {
    totalIncome: incomeTransactions.length,
    totalExpense: expenseTransactions.length,
    suggested: incomeTransactions.filter((t) => t.match_status === 'suggested').length,
    confirmed: incomeTransactions.filter((t) => t.match_status === 'confirmed').length,
    unmatched: incomeTransactions.filter((t) => t.match_status === 'unmatched').length,
    rejected: incomeTransactions.filter((t) => t.match_status === 'rejected').length,
  }

  const fetchAll = useCallback(async () => {
    if (!periodId || !buildingId) return

    setLoading(true)
    setError(null)

    const { data: imports } = await supabase
      .from('bank_imports')
      .select('id')
      .eq('period_id', periodId)

    const importIds = (imports ?? []).map((i: { id: string }) => i.id)

    if (importIds.length === 0) {
      setTransactions([])
      setLoading(false)
      return
    }

    // Get transactions with matched unit info
    const { data: txns } = await supabase
      .from('bank_transactions')
      .select('*, units:matched_unit_id(unit_number)')
      .in('bank_import_id', importIds)
      .order('date')

    // Get receipts for confirmed income transactions
    const confirmedIds = (txns ?? [])
      .filter((t: { match_status: string; transaction_type: string }) => t.match_status === 'confirmed' && t.transaction_type === 'income')
      .map((t: { id: string }) => t.id)

    const receiptMap = new Map<string, string>()
    if (confirmedIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('bank_transaction_id, receipts(receipt_number)')
        .in('bank_transaction_id', confirmedIds)

      for (const p of (payments ?? []) as unknown as { bank_transaction_id: string; receipts: { receipt_number: string }[] }[]) {
        const receipt = Array.isArray(p.receipts) ? p.receipts[0] : p.receipts
        if (receipt) receiptMap.set(p.bank_transaction_id, receipt.receipt_number)
      }
    }

    const rows: TransactionRow[] = ((txns ?? []) as unknown as (BankTransaction & { units: { unit_number: string } | null })[]).map((t) => ({
      ...t,
      matched_unit_number: t.units?.unit_number ?? null,
      receipt_number: receiptMap.get(t.id) ?? null,
    }))

    setTransactions(rows)

    // Get pending statements
    const { data: stmts } = await supabase
      .from('statements')
      .select('id, unit_id, total_due, status, units(unit_number)')
      .eq('period_id', periodId)
      .eq('status', 'pending')

    const pending: PendingStatement[] = ((stmts ?? []) as unknown as { id: string; unit_id: string; total_due: number; units: { unit_number: string }[] }[]).map((s) => {
      const unit = Array.isArray(s.units) ? s.units[0] : s.units
      return { id: s.id, unit_id: s.unit_id, unit_number: unit?.unit_number ?? '', total_due: s.total_due }
    })

    pending.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
    setPendingStatements(pending)
    setLoading(false)
  }, [periodId, buildingId])

  async function runAutoMatch() {
    if (!periodId || !buildingId) return

    setLoading(true)
    setError(null)

    // Re-fetch fresh data
    await fetchAll()

    // Get units for this building to map unit_number → unit_id
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('building_id', buildingId)
      .eq('is_active', true)

    const unitNumberToId = new Map<string, string>()
    for (const u of (units ?? []) as { id: string; unit_number: string }[]) {
      unitNumberToId.set(u.unit_number, u.id)
    }

    // Re-query current unmatched income transactions
    const { data: imports } = await supabase.from('bank_imports').select('id').eq('period_id', periodId)
    const importIds = (imports ?? []).map((i: { id: string }) => i.id)
    const { data: currentTxns } = await supabase
      .from('bank_transactions')
      .select('*')
      .in('bank_import_id', importIds)
      .eq('match_status', 'unmatched')
      .eq('transaction_type', 'income')

    // Re-query current pending statements
    const { data: currentStmts } = await supabase
      .from('statements')
      .select('id, unit_id, total_due, units(unit_number)')
      .eq('period_id', periodId)
      .eq('status', 'pending')

    const pendingStmts = ((currentStmts ?? []) as unknown as { id: string; unit_id: string; total_due: number; units: { unit_number: string }[] }[]).map((s) => {
      const unit = Array.isArray(s.units) ? s.units[0] : s.units
      return { id: s.id, unit_id: s.unit_id, unit_number: unit?.unit_number ?? '', total_due: s.total_due }
    })

    for (const txn of (currentTxns ?? []) as BankTransaction[]) {
      let matchedUnitId: string | null = null
      let confidence: MatchConfidence = null

      // Priority 1: unit_number + exact amount match
      if (txn.unit_number) {
        const unitId = unitNumberToId.get(txn.unit_number)
        if (unitId) {
          const stmt = pendingStmts.find((s) => s.unit_id === unitId && Math.abs(s.total_due - txn.amount) < 0.01)
          if (stmt) {
            matchedUnitId = unitId
            confidence = 'high'
          }
        }
      }

      // Priority 2: unit_number only (amount doesn't match)
      if (!matchedUnitId && txn.unit_number) {
        const unitId = unitNumberToId.get(txn.unit_number)
        if (unitId) {
          const hasStmt = pendingStmts.find((s) => s.unit_id === unitId)
          if (hasStmt) {
            matchedUnitId = unitId
            confidence = 'medium_unit'
          }
        }
      }

      // Priority 3: exact amount match (unique)
      if (!matchedUnitId) {
        const amountMatches = pendingStmts.filter((s) => Math.abs(s.total_due - txn.amount) < 0.01)
        if (amountMatches.length === 1) {
          matchedUnitId = amountMatches[0].unit_id
          confidence = 'medium_amount'
        }
        // Priority 4: multiple amount matches → leave unmatched
      }

      // Priority 5: no match at all → leave unmatched

      if (matchedUnitId) {
        await supabase
          .from('bank_transactions')
          .update({
            match_status: 'suggested' as MatchStatus,
            matched_unit_id: matchedUnitId,
            match_confidence: confidence,
          })
          .eq('id', txn.id)
      }
    }

    await fetchAll()
    setLoading(false)
  }

  async function manualMatch(transactionId: string, unitId: string) {
    setError(null)
    const { error: err } = await supabase
      .from('bank_transactions')
      .update({ match_status: 'suggested' as MatchStatus, matched_unit_id: unitId, match_confidence: 'high' })
      .eq('id', transactionId)

    if (err) { setError(err.message); return }
    await fetchAll()
  }

  async function rejectMatch(transactionId: string) {
    setError(null)
    const { error: err } = await supabase
      .from('bank_transactions')
      .update({ match_status: 'unmatched' as MatchStatus, matched_unit_id: null, match_confidence: null })
      .eq('id', transactionId)

    if (err) { setError(err.message); return }
    await fetchAll()
  }

  async function confirmMatch(transactionId: string, adminId: string) {
    setError(null)

    const txn = transactions.find((t) => t.id === transactionId)
    if (!txn || !txn.matched_unit_id || !periodId) return

    const { data: stmt } = await supabase
      .from('statements')
      .select('id')
      .eq('period_id', periodId)
      .eq('unit_id', txn.matched_unit_id)
      .single()

    if (!stmt) { setError('Estado de cuenta no encontrado'); return }

    const { error: txnErr } = await supabase
      .from('bank_transactions')
      .update({ match_status: 'confirmed' as MatchStatus })
      .eq('id', transactionId)

    if (txnErr) { setError(txnErr.message); return }

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        statement_id: stmt.id,
        bank_transaction_id: transactionId,
        amount: txn.amount,
        payment_date: txn.date,
        confirmed_by: adminId,
      })
      .select()
      .single()

    if (payErr) { setError(payErr.message); return }

    await supabase.from('statements').update({ status: 'paid' }).eq('id', stmt.id)

    const year = new Date().getFullYear()
    const { count } = await supabase.from('receipts').select('*', { count: 'exact', head: true })
    const num = (count ?? 0) + 1
    const receiptNumber = `ADM-${year}-${String(num).padStart(3, '0')}`

    await supabase.from('receipts').insert({ payment_id: payment.id, receipt_number: receiptNumber })
    await fetchAll()
  }

  async function confirmAllSuggested(adminId: string) {
    const suggested = transactions.filter((t) => t.match_status === 'suggested' && t.transaction_type === 'income')
    for (const txn of suggested) {
      await confirmMatch(txn.id, adminId)
    }
  }

  return {
    transactions, incomeTransactions, expenseTransactions,
    pendingStatements, loading, error, stats,
    fetchAll, runAutoMatch, manualMatch, rejectMatch, confirmMatch, confirmAllSuggested,
  }
}
