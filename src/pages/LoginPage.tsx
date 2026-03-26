import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

type LoginMode = 'admin' | 'condo'

export function LoginPage() {
  const { user, profile, loading } = useAuthContext()
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuthContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Cargando...</p>
      </div>
    )
  }

  // Redirect if already logged in
  if (user && profile) {
    if (profile.role === 'admin') { navigate('/admin', { replace: true }); return null }
    if (profile.role === 'condo') { navigate('/portal', { replace: true }); return null }
  }

  async function handleAdminSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await signIn(email, password)
      // Redirect will happen via auto-redirect when profile loads (onAuthStateChange)
      // But navigate to / as fallback which will smart-redirect based on role
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCondoSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email })
      if (otpError) throw otpError
      setSuccess('Revisa tu correo electrónico. Te enviamos un enlace para acceder.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el enlace')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Adminia</h1>

        {/* Mode tabs */}
        <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => { setMode('admin'); setError(''); setSuccess('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'admin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            Administrador
          </button>
          <button
            onClick={() => { setMode('condo'); setError(''); setSuccess('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'condo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            Condómino
          </button>
        </div>

        {/* Admin form */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@adminia.pe" />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        )}

        {/* Condo form */}
        {mode === 'condo' && (
          <form onSubmit={handleCondoSubmit} className="space-y-4">
            <div>
              <label htmlFor="condo-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input id="condo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com" />
            </div>
            <p className="text-xs text-slate-400">Te enviaremos un enlace de acceso a tu correo. Sin contraseña.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}
            <button type="submit" disabled={submitting}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Enviar enlace de acceso'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
