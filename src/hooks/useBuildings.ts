import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Building, PeriodStatus } from '../types/database'

export interface BuildingWithPeriod extends Building {
  currentPeriodStatus: PeriodStatus | null
}

export function useBuildings(organizationId: string | null) {
  const [buildings, setBuildings] = useState<BuildingWithPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    async function fetchBuildings() {
      setLoading(true)
      setError(null)

      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')

      if (buildingsError) {
        setError(buildingsError.message)
        setLoading(false)
        return
      }

      const buildingsWithPeriod: BuildingWithPeriod[] = await Promise.all(
        (buildingsData ?? []).map(async (building) => {
          const { data: periodData } = await supabase
            .from('periods')
            .select('status')
            .eq('building_id', building.id)
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
            .single()

          return {
            ...building,
            currentPeriodStatus: (periodData?.status as PeriodStatus) ?? null,
          }
        })
      )

      setBuildings(buildingsWithPeriod)
      setLoading(false)
    }

    fetchBuildings()
  }, [organizationId])

  return { buildings, loading, error }
}
