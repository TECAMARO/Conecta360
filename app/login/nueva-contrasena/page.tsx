'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthFieldLabel } from '@/components/auth/auth-field-label'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import { PASSWORD_RESET_MIN_LENGTH } from '@/lib/password-reset/constants'
import { supabase } from '@/src/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Loader2, LockKeyhole } from 'lucide-react'

function NuevaContrasenaForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function bootstrapRecoverySession() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) {
          setError('El enlace de restablecimiento no es válido o expiró.')
          return
        }
        window.history.replaceState({}, document.title, window.location.pathname)
        setReady(true)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setReady(true)
        return
      }

      setError('Abre el enlace de restablecimiento que recibiste por correo.')
    }

    void bootstrapRecoverySession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < PASSWORD_RESET_MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${PASSWORD_RESET_MIN_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        throw new Error(updateError.message)
      }

      void fetch('/api/access/vault/store-owner', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }).catch(() => {})

      await supabase.auth.signOut()
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Ya puedes iniciar sesión">
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Tu contraseña titular fue restablecida correctamente.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#1a3c34] text-sm font-semibold text-white hover:bg-[#234a40]"
        >
          Ir a iniciar sesión
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Elige y confirma tu contraseña titular">
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {!ready ? (
        <div className="flex items-center justify-center py-8 text-sm text-[#5a6b62]">
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          Validando enlace…
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <AuthFieldLabel htmlFor="new-password" icon={LockKeyhole}>
              Nueva contraseña
            </AuthFieldLabel>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              minLength={PASSWORD_RESET_MIN_LENGTH}
              value={password}
              onChange={setPassword}
              defaultVisible
            />
          </div>

          <div>
            <AuthFieldLabel htmlFor="confirm-password" icon={LockKeyhole}>
              Confirmar contraseña
            </AuthFieldLabel>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              minLength={PASSWORD_RESET_MIN_LENGTH}
              value={confirmPassword}
              onChange={setConfirmPassword}
              defaultVisible
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className={cn('mt-2 h-11 w-full bg-[#1a3c34] text-white hover:bg-[#234a40]')}
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export default function NuevaContrasenaPage() {
  return (
    <Suspense>
      <NuevaContrasenaForm />
    </Suspense>
  )
}
