'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, ShieldCheck } from 'lucide-react'

const inputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-center text-2xl font-semibold tracking-[0.5em] text-[#1a3c34] outline-none transition-colors focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

function VerifyAdminForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/admin'
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/admin-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = (await res.json()) as { error?: string; ok?: boolean }

      if (!res.ok) {
        setError(data.error ?? 'Código inválido.')
        setCode('')
        inputRef.current?.focus()
        return
      }

      router.push(redirectTo.startsWith('/admin') ? redirectTo : '/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de verificación.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResending(true)
    try {
      const res = await fetch('/api/auth/admin-otp/send', { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'No se pudo reenviar el código.')
      }
      setCode('')
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title="Verificación administrativa"
      subtitle="Ingresa el código de 4 dígitos enviado a tu correo"
    >
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#8ac441]/30 bg-[#e8f0e4]/80 px-4 py-3 text-sm text-[#1a3c34]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#1a3c34]" aria-hidden="true" />
        <p>
          Por seguridad, el acceso al panel <strong>/admin</strong> requiere un segundo factor de
          autenticación exclusivo para el Administrador Maestro.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-[#1a3c34]">
            Código OTP
          </label>
          <input
            ref={inputRef}
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            autoComplete="one-time-code"
            placeholder="••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={inputClass}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading || code.length !== 4}
          className={cn('mt-2 h-11 w-full bg-[#1a3c34] text-white hover:bg-[#234a40]')}
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Verificar y acceder
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending}
          className="font-medium text-[#1a3c34] underline-offset-4 hover:text-[#8ac441] hover:underline disabled:opacity-50"
        >
          {resending ? 'Reenviando…' : 'Reenviar código'}
        </button>
        <Link
          href="/login"
          className="text-[#5a6b62] underline-offset-4 hover:text-[#1a3c34] hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthShell>
  )
}

export default function VerifyAdminPage() {
  return (
    <Suspense>
      <VerifyAdminForm />
    </Suspense>
  )
}
