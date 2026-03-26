import type { PeriodStatus, StatementStatus, MatchStatus } from '../../types/database'

type BadgeType = 'period' | 'statement' | 'match'

type StatusMap = {
  period: PeriodStatus | 'none'
  statement: StatementStatus
  match: MatchStatus
}

interface StatusBadgeProps<T extends BadgeType> {
  type: T
  status: StatusMap[T]
}

const config: Record<string, { label: string; className: string }> = {
  // Period
  'period:draft': { label: 'Borrador', className: 'bg-yellow-100 text-yellow-800' },
  'period:published': { label: 'Publicado', className: 'bg-blue-100 text-blue-800' },
  'period:closed': { label: 'Cerrado', className: 'bg-green-100 text-green-800' },
  'period:none': { label: 'Sin periodo', className: 'bg-gray-100 text-gray-500' },
  // Statement
  'statement:pending': { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  'statement:paid': { label: 'Pagado', className: 'bg-green-100 text-green-800' },
  'statement:partial': { label: 'Parcial', className: 'bg-orange-100 text-orange-800' },
  'statement:overdue': { label: 'Moroso', className: 'bg-red-100 text-red-800' },
  // Match
  'match:unmatched': { label: 'Sin asignar', className: 'bg-gray-100 text-gray-500' },
  'match:suggested': { label: 'Sugerido', className: 'bg-blue-100 text-blue-800' },
  'match:confirmed': { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
  'match:rejected': { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
}

export function StatusBadge<T extends BadgeType>({ type, status }: StatusBadgeProps<T>) {
  const key = `${type}:${status}`
  const { label, className } = config[key] ?? { label: status, className: 'bg-gray-100 text-gray-500' }

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
