'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { MASTER_ADMIN_EMAIL } from '@/lib/admin-auth/constants'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, ShieldCheck } from 'lucide-react'

const OTP_MIN_LENGTH = 6
const OTP_MAX_LENGTH = 8

const inputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-center text-2xl font-semibold tracking-[0.35em] text-[#1a3c34] outline-none transition-colors focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

function VerifyAdminForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/admin'
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendOk, setResendOk] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResendOk(null)
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
    setResendOk(null)
    setResending(true)
    try {
      const res = await fetch('/api/auth/admin-otp/send', { method: 'POST' })
      const data = (await res.json()) as { error?: string; sentTo?: string }
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo reenviar el código.')
      }
      setResendOk(`Nuevo código enviado a ${data.sentTo ?? MASTER_ADMIN_EMAIL}`)
      setCode('')
      inputRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código.')
    } finally {
      setResending(false)
    }
  }

  const codeReady = code.length >= OTP_MIN_LENGTH && code.length <= OTP_MAX_LENGTH

  return (
    <AuthShell
      title="Verificación administrativa"
      subtitle={`Ingresa el código enviado a ${MASTER_ADMIN_EMAIL}`}
    >
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#8ac441]/30 bg-[#e8f0e4]/80 px-4 py-3 text-sm text-[#1a3c34]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#1a3c34]" aria-hidden="true" />
        <p>
          Por seguridad, el acceso al panel <strong>/admin</strong> requiere un segundo factor de
          autenticación. El código se envía exclusivamente a{' '}
          <strong>{MASTER_ADMIN_EMAIL}</strong>.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {resendOk && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {resendOk}
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
            pattern="\d{6,8}"
            maxLength={OTP_MAX_LENGTH}
            required
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH))
            }
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-[#5a6b62]">
            Revisa la bandeja de entrada (y spam) de {MASTER_ADMIN_EMAIL}.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading || !codeReady}
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
