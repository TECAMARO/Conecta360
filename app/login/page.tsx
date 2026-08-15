'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import { signInWithEmail, initiateMasterAdminOtpFlow, requiresMasterAdminOtp } from '@/lib/supabase/auth-service'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const inputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-sm text-[#1a3c34] outline-none transition-colors placeholder:text-[#5a6b62]/60 focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/plataforma'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmail(email, password)

      if (requiresMasterAdminOtp(email)) {
        await initiateMasterAdminOtpFlow()
        const adminRedirect = redirectTo.startsWith('/admin') ? redirectTo : '/admin'
        router.push(`/login/verify-admin?redirect=${encodeURIComponent(adminRedirect)}`)
        return
      }

      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Iniciar Sesión"
      subtitle="Accede a tu espacio de conexiones estratégicas"
    >
      {redirectTo.startsWith('/plataforma') && (
        <div className="mb-5 rounded-lg border border-[#8ac441]/30 bg-[#e8f0e4]/80 px-4 py-3 text-sm text-[#1a3c34]">
          Inicia sesión para acceder a tu panel privado: agenda, mensajes, perfil y solicitud de
          reuniones.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a3c34]">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="correo@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1a3c34]">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className={cn('mt-2 h-11 w-full bg-[#1a3c34] text-white hover:bg-[#234a40]')}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Iniciar Sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#5a6b62]">
        ¿No tienes cuenta?{' '}
        <Link
          href={`/registro?redirect=${encodeURIComponent(redirectTo)}`}
          className="font-semibold text-[#1a3c34] underline-offset-4 hover:text-[#8ac441] hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
