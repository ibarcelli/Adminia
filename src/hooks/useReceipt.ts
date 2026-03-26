import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ReceiptData {
  receiptNumber: string
  generatedAt: string
  paymentDate: string
  amount: number
  buildingName: string
  buildingAddress: string
  unitNumber: string
  ownerName: string
  periodMonth: number
  periodYear: number
  waterCharge: number
  expensesCharge: number
  previousBalance: number
  totalDue: number
}

export function useReceipt() {
  const [loading, setLoading] = useState(false)

  async function getReceiptData(receiptId: string): Promise<ReceiptData | null> {
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*, payments(amount, payment_date, statements(water_charge, expenses_charge, previous_balance, total_due, unit_id, period_id))')
      .eq('id', receiptId)
      .single()

    if (!receipt) return null

    const payment = Array.isArray(receipt.payments) ? receipt.payments[0] : receipt.payments
    if (!payment) return null

    const stmt = Array.isArray(payment.statements) ? payment.statements[0] : payment.statements
    if (!stmt) return null

    // Get unit info
    const { data: unit } = await supabase
      .from('units')
      .select('unit_number, owner_name, building_id')
      .eq('id', stmt.unit_id)
      .single()

    if (!unit) return null

    // Get building info
    const { data: building } = await supabase
      .from('buildings')
      .select('name, address')
      .eq('id', unit.building_id)
      .single()

    if (!building) return null

    // Get period info
    const { data: period } = await supabase
      .from('periods')
      .select('month, year')
      .eq('id', stmt.period_id)
      .single()

    if (!period) return null

    return {
      receiptNumber: receipt.receipt_number,
      generatedAt: receipt.generated_at,
      paymentDate: payment.payment_date,
      amount: payment.amount,
      buildingName: building.name,
      buildingAddress: building.address,
      unitNumber: unit.unit_number,
      ownerName: unit.owner_name,
      periodMonth: period.month,
      periodYear: period.year,
      waterCharge: stmt.water_charge,
      expensesCharge: stmt.expenses_charge,
      previousBalance: stmt.previous_balance,
      totalDue: stmt.total_due,
    }
  }

  async function getReceiptDataByPayment(statementId: string): Promise<ReceiptData | null> {
    const { data: payment } = await supabase
      .from('payments')
      .select('receipts(id)')
      .eq('statement_id', statementId)
      .limit(1)
      .maybeSingle()

    if (!payment) return null
    const receipts = Array.isArray(payment.receipts) ? payment.receipts : [payment.receipts]
    const receipt = receipts[0]
    if (!receipt?.id) return null

    return getReceiptData(receipt.id)
  }

  async function downloadReceipt(data: ReceiptData) {
    setLoading(true)

    // Dynamic import to avoid loading html2pdf.js until needed
    const html2pdf = (await import('html2pdf.js')).default

    const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const fmt = (n: number) => `S/ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const fmtDate = (d: string) => { const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}` }

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #1e293b;">ADMINIA</h1>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0;">Administración de Inmuebles</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px;">
          <div>
            <p style="color: #64748b; margin: 0;">Recibo N°</p>
            <p style="font-weight: 600; margin: 2px 0 0; font-size: 16px;">${data.receiptNumber}</p>
          </div>
          <div style="text-align: right;">
            <p style="color: #64748b; margin: 0;">Fecha de emisión</p>
            <p style="font-weight: 500; margin: 2px 0 0;">${fmtDate(data.generatedAt)}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <p style="color: #64748b; margin: 0;">Edificio</p>
              <p style="font-weight: 600; margin: 2px 0 0;">${data.buildingName}</p>
              <p style="color: #64748b; margin: 2px 0 0; font-size: 12px;">${data.buildingAddress}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #64748b; margin: 0;">Departamento</p>
              <p style="font-weight: 600; margin: 2px 0 0;">${data.unitNumber}</p>
              <p style="color: #64748b; margin: 2px 0 0; font-size: 12px;">${data.ownerName}</p>
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
            <p style="color: #64748b; margin: 0;">Periodo: <span style="font-weight: 500; color: #1e293b;">${monthNames[data.periodMonth]} ${data.periodYear}</span></p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0;">
              <th style="text-align: left; padding: 8px 0; color: #64748b; font-weight: 500;">Concepto</th>
              <th style="text-align: right; padding: 8px 0; color: #64748b; font-weight: 500;">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0;">Agua</td>
              <td style="text-align: right; padding: 10px 0;">${fmt(data.waterCharge)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0;">Cuota de mantenimiento</td>
              <td style="text-align: right; padding: 10px 0;">${fmt(data.expensesCharge)}</td>
            </tr>
            ${data.previousBalance > 0 ? `
            <tr style="border-bottom: 1px solid #f1f5f9; background: #fffbeb;">
              <td style="padding: 10px 0; color: #92400e;">Saldo anterior</td>
              <td style="text-align: right; padding: 10px 0; color: #92400e;">${fmt(data.previousBalance)}</td>
            </tr>` : ''}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #1e293b;">
              <td style="padding: 12px 0; font-weight: 700; font-size: 15px;">Total pagado</td>
              <td style="text-align: right; padding: 12px 0; font-weight: 700; font-size: 15px;">${fmt(data.totalDue)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
          <p style="margin: 0;">Fecha de pago: ${fmtDate(data.paymentDate)}</p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">Este documento es un comprobante de pago emitido por Adminia</p>
        </div>
      </div>
    `

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `Recibo-${data.receiptNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container.firstElementChild as HTMLElement)
      .save()

    document.body.removeChild(container)
    setLoading(false)
  }

  return { loading, getReceiptData, getReceiptDataByPayment, downloadReceipt }
}
