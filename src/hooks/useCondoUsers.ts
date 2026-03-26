import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCondoUsers() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createOrUpdateCondoAccess(
    unitId: string,
    email: string,
    password: string,
    adminEmail: string,
    adminPassword: string,
  ): Promise<boolean> {
    if (!email.trim() || !password.trim()) {
      setError('Email y contraseña son obligatorios.')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Check if user already exists by looking for a profile with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .eq('role', 'condo')
        .maybeSingle()

      if (existingProfile) {
        // User exists — just update password in units table
        // (We can't update Supabase Auth password without service_role key)
        await supabase
          .from('units')
          .update({ portal_password: password })
          .eq('id', unitId)

        // Update profile's unit_id in case it changed
        await supabase
          .from('profiles')
          .update({ unit_id: unitId })
          .eq('id', existingProfile.id)

        setLoading(false)
        return true
      }

      // New user — create via signUp (this will change the current session)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (signUpError) {
        // Handle "User already registered" — means they exist in auth but not in profiles as condo
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          setError('Este email ya está registrado. Usa una contraseña diferente o contacta soporte.')
          setLoading(false)
          return false
        }
        throw signUpError
      }

      const newUserId = signUpData.user?.id

      if (newUserId) {
        // Create condo profile
        await supabase
          .from('profiles')
          .upsert({
            id: newUserId,
            email: email.trim(),
            role: 'condo',
            unit_id: unitId,
          }, { onConflict: 'id' })
      }

      // Save password to unit
      await supabase
        .from('units')
        .update({ portal_password: password })
        .eq('id', unitId)

      // Re-authenticate admin (signUp changed the session)
      await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      })

      setLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear acceso')
      // Try to re-authenticate admin in case session was lost
      try {
        await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        })
      } catch {
        // If re-auth fails, user will need to login again
      }
      setLoading(false)
      return false
    }
  }

  return { loading, error, createOrUpdateCondoAccess, setError }
}
