'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthFieldLabel } from '@/components/auth/auth-field-label'
import { Button } from '@/components/ui/button'
import { PASSWORD_RESET_GENERIC_MESSAGE } from '@/lib/password-reset/constants'
import { cn } from '@/lib/utils'
import { Loader2, Mail } from 'lucide-react'

const inputClass =
  'w-full rounded-lg border border-[#dde8d8] bg-white px-3.5 py-2.5 text-sm text-[#1a3c34] outline-none transition-colors placeholder:text-[#5a6b62]/60 focus:border-[#8ac441] focus:ring-2 focus:ring-[#8ac441]/25'

function ResetRequestForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { error?: string; message?: string }

      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo procesar la solicitud.')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Restablecer contraseña"
      subtitle="Te enviaremos instrucciones si el correo está registrado"
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {PASSWORD_RESET_GENERIC_MESSAGE}
          </p>
          <p className="text-sm text-[#5a6b62]">
            Si el correo es de un <strong>acceso delegado</strong>, el titular recibirá la nueva
            contraseña y también podrá verla en Plataforma → Accesos.
          </p>
          <Link
            href="/login"
            className="inline-flex text-sm font-semibold text-[#1a3c34] underline-offset-4 hover:text-[#8ac441] hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <AuthFieldLabel htmlFor="reset-email" icon={Mail}>
                Correo electrónico
              </AuthFieldLabel>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                placeholder="correo@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className={cn('mt-2 h-11 w-full bg-[#1a3c34] text-white hover:bg-[#234a40]')}
            >
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Enviar instrucciones
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#5a6b62]">
            <Link
              href="/login"
              className="font-semibold text-[#1a3c34] underline-offset-4 hover:text-[#8ac441] hover:underline"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense>
      <ResetRequestForm />
    </Suspense>
  )
}
