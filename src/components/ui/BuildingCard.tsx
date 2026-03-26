import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { Building, PeriodStatus } from '../../types/database'

interface BuildingCardProps {
  building: Building
  periodStatus: PeriodStatus | null
}

export function BuildingCard({ building, periodStatus }: BuildingCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/admin/buildings/${building.id}`)}
      className="w-full text-left bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-800">{building.name}</h3>
        <StatusBadge type="period" status={periodStatus ?? 'none'} />
      </div>
      <p className="text-sm text-slate-500 mt-1">{building.address}</p>
      <p className="text-sm text-slate-600 mt-3">
        {building.total_units} departamentos
      </p>
    </button>
  )
}
