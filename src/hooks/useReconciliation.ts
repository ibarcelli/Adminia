import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BankTransaction, MatchStatus } from '../types/database'

export interface TransactionRow extends BankTransaction {
  unit_number: string | null
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

  const stats = {
    total: transactions.length,
    suggested: transactions.filter((t) => t.match_status === 'suggested').length,
    confirmed: transactions.filter((t) => t.match_status === 'confirmed').length,
    unmatched: transactions.filter((t) => t.match_status === 'unmatched').length,
    rejected: transactions.filter((t) => t.match_status === 'rejected').length,
  }

  const fetchAll = useCallback(async () => {
    if (!periodId || !buildingId) return

    setLoading(true)
    setError(null)

    // Get bank imports for this period
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

    // Get transactions with unit info
    const { data: txns } = await supabase
      .from('bank_transactions')
      .select('*, units(unit_number)')
      .in('bank_import_id', importIds)
      .order('date')

    // Get receipts for confirmed transactions
    const confirmedIds = (txns ?? [])
      .filter((t: { match_status: string }) => t.match_status === 'confirmed')
      .map((t: { id: string }) => t.id)

    let receiptMap = new Map<string, string>()
    if (confirmedIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('bank_transaction_id, receipts(receipt_number)')
        .in('bank_transaction_id', confirmedIds)

      for (const p of (payments ?? []) as unknown as { bank_transaction_id: string; receipts: { receipt_number: string }[] }[]) {
        const receipt = Array.isArray(p.receipts) ? p.receipts[0] : p.receipts
        if (receipt) {
          receiptMap.set(p.bank_transaction_id, receipt.receipt_number)
        }
      }
    }

    const rows: TransactionRow[] = ((txns ?? []) as (BankTransaction & { units: { unit_number: string } | null })[]).map((t) => ({
      ...t,
      unit_number: t.units?.unit_number ?? null,
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
      return {
        id: s.id,
        unit_id: s.unit_id,
        unit_number: unit?.unit_number ?? '',
        total_due: s.total_due,
      }
    })

    pending.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
    setPendingStatements(pending)
    setLoading(false)
  }, [periodId, buildingId])

  async function runAutoMatch() {
    if (!periodId) return

    setLoading(true)
    setError(null)

    // Refresh data first
    await fetchAll()

    const unmatchedTxns = transactions.filter((t) => t.match_status === 'unmatched')
    const pending = [...pendingStatements]

    for (const txn of unmatchedTxns) {
      const matches = pending.filter((s) => Math.abs(s.total_due - txn.amount) < 0.01)

      if (matches.length === 1) {
        const { error: updateErr } = await supabase
          .from('bank_transactions')
          .update({ match_status: 'suggested', matched_unit_id: matches[0].unit_id })
          .eq('id', txn.id)

        if (updateErr) { setError(updateErr.message); continue }
      }
      // Multiple matches or no match: leave as unmatched
    }

    await fetchAll()
    setLoading(false)
  }

  async function manualMatch(transactionId: string, unitId: string) {
    setError(null)

    const { error: err } = await supabase
      .from('bank_transactions')
      .update({ match_status: 'suggested' as MatchStatus, matched_unit_id: unitId })
      .eq('id', transactionId)

    if (err) { setError(err.message); return }
    await fetchAll()
  }

  async function rejectMatch(transactionId: string) {
    setError(null)

    const { error: err } = await supabase
      .from('bank_transactions')
      .update({ match_status: 'unmatched' as MatchStatus, matched_unit_id: null })
      .eq('id', transactionId)

    if (err) { setError(err.message); return }
    await fetchAll()
  }

  async function confirmMatch(transactionId: string, adminId: string) {
    setError(null)

    const txn = transactions.find((t) => t.id === transactionId)
    if (!txn || !txn.matched_unit_id || !periodId) return

    // Find the statement for this unit
    const { data: stmt } = await supabase
      .from('statements')
      .select('id')
      .eq('period_id', periodId)
      .eq('unit_id', txn.matched_unit_id)
      .single()

    if (!stmt) { setError('Estado de cuenta no encontrado'); return }

    // Update transaction to confirmed
    const { error: txnErr } = await supabase
      .from('bank_transactions')
      .update({ match_status: 'confirmed' as MatchStatus })
      .eq('id', transactionId)

    if (txnErr) { setError(txnErr.message); return }

    // Create payment
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

    // Update statement to paid
    await supabase
      .from('statements')
      .update({ status: 'paid' })
      .eq('id', stmt.id)

    // Generate receipt number
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })

    const num = (count ?? 0) + 1
    const receiptNumber = `ADM-${year}-${String(num).padStart(3, '0')}`

    await supabase
      .from('receipts')
      .insert({
        payment_id: payment.id,
        receipt_number: receiptNumber,
      })

    await fetchAll()
  }

  async function confirmAllSuggested(adminId: string) {
    const suggested = transactions.filter((t) => t.match_status === 'suggested')
    for (const txn of suggested) {
      await confirmMatch(txn.id, adminId)
    }
  }

  return {
    transactions, pendingStatements, loading, error, stats,
    fetchAll, runAutoMatch, manualMatch, rejectMatch, confirmMatch, confirmAllSuggested,
  }
}
