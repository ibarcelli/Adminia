import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Building, BankAccountType, WaterMeteringType } from '../types/database'

export interface BuildingFormData {
  name: string
  address: string
  bank_account_type: BankAccountType
  bank_account_name: string
  payment_deadline_day: number
  water_metering_type: WaterMeteringType
}

export function useBuilding(buildingId: string | null) {
  const [building, setBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(!!buildingId)
  const [error, setError] = useState<string | null>(null)

  const fetchBuilding = useCallback(async () => {
    if (!buildingId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (fetchError) setError(fetchError.message)
    else setBuilding(data as Building)

    setLoading(false)
  }, [buildingId])

  useEffect(() => { fetchBuilding() }, [fetchBuilding])

  async function createBuilding(organizationId: string, data: BuildingFormData): Promise<string | null> {
    setError(null)

    const { data: created, error: err } = await supabase
      .from('buildings')
      .insert({ organization_id: organizationId, total_units: 0, ...data })
      .select()
      .single()

    if (err) { setError(err.message); return null }

    setBuilding(created as Building)
    return (created as Building).id
  }

  async function updateBuilding(id: string, data: BuildingFormData): Promise<boolean> {
    setError(null)

    const { data: updated, error: err } = await supabase
      .from('buildings')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (err) { setError(err.message); return false }

    setBuilding(updated as Building)
    return true
  }

  return { building, loading, error, createBuilding, updateBuilding, refetch: fetchBuilding }
}
