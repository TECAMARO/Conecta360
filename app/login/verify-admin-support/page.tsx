'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { MASTER_ADMIN_EMAIL } from '@/lib/admin-auth/constants'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, ShieldAlert } from 'lucide-react'

const inputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-center text-2xl font-semibold tracking-[0.5em] text-[#1a3c34] outline-none transition-colors focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

function VerifyAdminSupportForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/admin/support'
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const storedDev = sessionStorage.getItem('conecta360_admin_support_otp_dev')
    if (storedDev) {
      setDevCode(storedDev)
      setNotice(`Código enviado a ${MASTER_ADMIN_EMAIL}. Revisa tu bandeja de entrada.`)
      sessionStorage.removeItem('conecta360_admin_support_otp_dev')
      return
    }

    void (async () => {
      try {
        const res = await fetch('/api/auth/admin-support-otp/send', { method: 'POST' })
        const data = (await res.json()) as { error?: string; sentTo?: string; devCode?: string }
        if (!res.ok) {
          setError(data.error ?? 'No se pudo enviar el código Soporte.')
          return
        }
        setNotice(`Código enviado a ${data.sentTo ?? MASTER_ADMIN_EMAIL}. Revisa tu bandeja de entrada.`)
        if (data.devCode) setDevCode(data.devCode)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo enviar el código Soporte.')
      }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/admin-support-otp/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = (await res.json()) as { error?: string; redirect?: string }

      if (!res.ok) {
        setError(data.error ?? 'Código inválido.')
        setCode('')
        inputRef.current?.focus()
        return
      }

      const target = redirectTo.startsWith('/admin/support')
        ? redirectTo
        : data.redirect ?? '/admin/support'
      window.location.assign(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de verificación.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setDevCode(null)
    setResending(true)
    try {
      const res = await fetch('/api/auth/admin-support-otp/send', { method: 'POST' })
      const data = (await res.json()) as { error?: string; sentTo?: string; devCode?: string }
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo reenviar el código.')
      }
      setNotice(`Código enviado a ${data.sentTo ?? MASTER_ADMIN_EMAIL}. Revisa tu bandeja de entrada.`)
      if (data.devCode) {
        setDevCode(data.devCode)
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
      title="Verificación Soporte"
      subtitle={`Segundo código OTP enviado a ${MASTER_ADMIN_EMAIL}`}
    >
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-[#1a3c34]">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <p>
          El apartado <strong>Soporte</strong> contiene información delicada. Ingresa el código de{' '}
          <strong>4 dígitos</strong> para continuar.
        </p>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      )}

      {devCode && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <strong>Modo desarrollo (SMTP no configurado):</strong> tu código es{' '}
          <span className="font-mono text-lg tracking-widest">{devCode}</span>
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="support-otp" className="mb-1.5 block text-sm font-medium text-[#1a3c34]">
            Código OTP Soporte (4 dígitos)
          </label>
          <input
            ref={inputRef}
            id="support-otp"
            type="text"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            autoComplete="one-time-code"
            placeholder="0000"
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
          Verificar acceso Soporte
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending}
          className="font-medium text-[#1a3c34] underline-offset-4 hover:text-[#8ac441] hover:underline disabled:opacity-50"
        >
          {resending ? 'Reenviando…' : 'Reenviar código Soporte'}
        </button>
        <Link
          href="/admin"
          className="text-[#5a6b62] underline-offset-4 hover:text-[#1a3c34] hover:underline"
        >
          Volver al panel admin
        </Link>
      </div>
    </AuthShell>
  )
}

export default function VerifyAdminSupportPage() {
  return (
    <Suspense>
      <VerifyAdminSupportForm />
    </Suspense>
  )
}
