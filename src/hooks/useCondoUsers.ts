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
        // User exists — update password in units and unit_id in profile
        const { error: unitErr } = await supabase
          .from('units')
          .update({ portal_password: password })
          .eq('id', unitId)

        if (unitErr) throw new Error(`Error guardando contraseña: ${unitErr.message}`)

        const { error: profErr } = await supabase
          .from('profiles')
          .update({ unit_id: unitId })
          .eq('id', existingProfile.id)

        if (profErr) throw new Error(`Error actualizando profile: ${profErr.message}`)

        setLoading(false)
        return true
      }

      // Step 1: Create user via signUp
      // This may change/invalidate the current admin session
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          // Store unit_id in user metadata as backup
          data: { unit_id: unitId, role: 'condo' },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already') || signUpError.message.includes('already')) {
          throw new Error('Este email ya está registrado en el sistema de autenticación.')
        }
        throw signUpError
      }

      // signUp may return user=null if "fake" signup (email exists but Supabase hides it)
      // Or user with identities=[] which means the email is taken
      const newUser = signUpData.user
      if (!newUser || (newUser.identities && newUser.identities.length === 0)) {
        throw new Error('Este email ya está registrado. Contacta soporte para resetear el acceso.')
      }

      const newUserId = newUser.id

      // Step 2: IMMEDIATELY re-authenticate as admin
      // This is critical: we need admin RLS permissions to create the profile
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      })

      if (reAuthError) {
        throw new Error(`Error re-autenticando admin: ${reAuthError.message}. El usuario fue creado pero el profile no. Vuelve a loguearte como admin.`)
      }

      // Step 3: Create condo profile (now running as admin with full RLS permissions)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: newUserId,
          email: email.trim(),
          role: 'condo',
          unit_id: unitId,
        }, { onConflict: 'id' })

      if (profileError) {
        throw new Error(`Error creando profile: ${profileError.message}`)
      }

      // Step 4: Save password to unit
      const { error: pwError } = await supabase
        .from('units')
        .update({ portal_password: password })
        .eq('id', unitId)

      if (pwError) {
        throw new Error(`Error guardando contraseña: ${pwError.message}`)
      }

      setLoading(false)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear acceso'
      setError(message)

      // Ensure admin is re-authenticated even on error
      try {
        await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        })
      } catch {
        setError(message + ' — Además, no se pudo re-autenticar. Vuelve a loguearte.')
      }

      setLoading(false)
      return false
    }
  }

  return { loading, error, createOrUpdateCondoAccess, setError }
}
