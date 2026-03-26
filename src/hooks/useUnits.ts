import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Unit } from '../types/database'

export interface UnitFormData {
  unit_number: string
  area_sqm: number
  owner_name: string
  owner_email: string
  owner_phone: string | null
}

export function useUnits(buildingId: string | null) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeUnits = units.filter((u) => u.is_active)
  const totalUnits = activeUnits.length
  const totalArea = activeUnits.reduce((s, u) => s + u.area_sqm, 0)

  const fetchUnits = useCallback(async () => {
    if (!buildingId) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('units')
      .select('*')
      .eq('building_id', buildingId)
      .order('unit_number', { ascending: true })

    if (err) setError(err.message)
    else setUnits((data ?? []) as Unit[])

    setLoading(false)
  }, [buildingId])

  useEffect(() => { fetchUnits() }, [fetchUnits])

  async function addUnit(data: UnitFormData): Promise<boolean> {
    if (!buildingId) return false
    setError(null)

    const { error: err } = await supabase
      .from('units')
      .insert({ building_id: buildingId, is_active: true, ...data })

    if (err) { setError(err.message); return false }

    await fetchUnits()
    // Update total_units after fetch so we have the latest count
    const { data: freshUnits } = await supabase.from('units').select('is_active').eq('building_id', buildingId)
    const activeCount = (freshUnits ?? []).filter((u: { is_active: boolean }) => u.is_active).length
    await supabase.from('buildings').update({ total_units: activeCount }).eq('id', buildingId)
    return true
  }

  async function updateUnit(id: string, data: UnitFormData): Promise<boolean> {
    setError(null)

    const { error: err } = await supabase
      .from('units')
      .update(data)
      .eq('id', id)

    if (err) { setError(err.message); return false }

    await fetchUnits()
    return true
  }

  async function toggleActive(id: string, isActive: boolean): Promise<boolean> {
    if (!buildingId) return false
    setError(null)

    const { error: err } = await supabase
      .from('units')
      .update({ is_active: isActive })
      .eq('id', id)

    if (err) { setError(err.message); return false }

    await fetchUnits()
    // Update total_units
    const { data: freshUnits } = await supabase.from('units').select('is_active').eq('building_id', buildingId)
    const activeCount = (freshUnits ?? []).filter((u: { is_active: boolean }) => u.is_active).length
    await supabase.from('buildings').update({ total_units: activeCount }).eq('id', buildingId)
    return true
  }

  return { units, loading, error, totalUnits, totalArea, addUnit, updateUnit, toggleActive, refetch: fetchUnits }
}
