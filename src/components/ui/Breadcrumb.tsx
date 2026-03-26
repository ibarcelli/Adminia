import { useNavigate } from 'react-router-dom'

interface BreadcrumbProps {
  buildingId?: string
  buildingName?: string
  currentPage?: string
}

export function Breadcrumb({ buildingId, buildingName, currentPage }: BreadcrumbProps) {
  const navigate = useNavigate()

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4">
      <button onClick={() => navigate('/admin')} className="hover:text-blue-600 transition-colors">
        Edificios
      </button>
      {buildingName && (
        <>
          <span>/</span>
          <button
            onClick={() => buildingId && navigate(`/admin/buildings/${buildingId}`)}
            className="hover:text-blue-600 transition-colors"
          >
            {buildingName}
          </button>
        </>
      )}
      {currentPage && (
        <>
          <span>/</span>
          <span className="text-slate-700 font-medium">{currentPage}</span>
        </>
      )}
    </nav>
  )
}
