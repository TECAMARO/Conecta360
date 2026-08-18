'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuthFieldLabel } from '@/components/auth/auth-field-label'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import {
  DELEGATE_EMAIL_AVAILABLE_MESSAGE,
  DELEGATE_EMAIL_UNAVAILABLE_MESSAGE,
} from '@/lib/delegate-access/constants'
import { cn } from '@/lib/utils'
import { CircleCheck, KeyRound, Loader2, Mail, ShieldCheck, Trash2 } from 'lucide-react'

type DelegateRow = {
  id: string
  email: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/25'

const ACCESS_INTRO_CURTAIN_FADE_MS = 480

const ACCESS_INTRO_MESSAGE =
  'Asigna a un delegado para gestionar tu agenda en Conecta360 de forma segura, sin compartir tus claves personales'

type CurtainPhase = 'visible' | 'fading' | 'hidden'

export function AccessView({
  onNotify,
}: {
  onNotify?: (message: string, variant?: 'success' | 'warning') => void
}) {
  const [delegates, setDelegates] = useState<DelegateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'available' | 'unavailable'>(
    'idle',
  )
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [curtainPhase, setCurtainPhase] = useState<CurtainPhase>('visible')

  const activeDelegates = delegates.filter((row) => row.is_active)
  const hasActiveDelegates = activeDelegates.length > 0
  const showIntroCurtain = !hasActiveDelegates && curtainPhase !== 'hidden'

  useEffect(() => {
    if (hasActiveDelegates) {
      setCurtainPhase('hidden')
    }
  }, [hasActiveDelegates])

  function dismissIntroCurtain() {
    setCurtainPhase('fading')
    window.setTimeout(() => {
      setCurtainPhase('hidden')
    }, ACCESS_INTRO_CURTAIN_FADE_MS)
  }

  const loadDelegates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/access/delegates')
      const data = (await res.json()) as { delegates?: DelegateRow[]; error?: string }
      if (!res.ok) {
        onNotify?.(data.error ?? 'No se pudieron cargar los accesos.', 'warning')
        return
      }
      setDelegates(data.delegates ?? [])
    } catch {
      onNotify?.('Error de red al cargar accesos.', 'warning')
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => {
    void loadDelegates()
  }, [loadDelegates])

  async function handleVerifyEmail() {
    const trimmed = email.trim()
    if (!trimmed) {
      setVerifyState('unavailable')
      setVerifyMessage(DELEGATE_EMAIL_UNAVAILABLE_MESSAGE)
      return
    }

    setVerifyState('checking')
    setVerifyMessage(null)
    try {
      const res = await fetch('/api/access/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = (await res.json()) as {
        available?: boolean
        message?: string
        error?: string
      }

      if (!res.ok) {
        setVerifyState('unavailable')
        setVerifyMessage(data.error ?? DELEGATE_EMAIL_UNAVAILABLE_MESSAGE)
        return
      }

      if (data.available) {
        setVerifyState('available')
        setVerifyMessage(data.message ?? DELEGATE_EMAIL_AVAILABLE_MESSAGE)
      } else {
        setVerifyState('unavailable')
        setVerifyMessage(data.message ?? DELEGATE_EMAIL_UNAVAILABLE_MESSAGE)
      }
    } catch {
      setVerifyState('unavailable')
      setVerifyMessage('No se pudo verificar el correo.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (verifyState !== 'available') {
      onNotify?.('Verifica que el correo esté disponible antes de continuar.', 'warning')
      return
    }
    if (password.length < 8) {
      onNotify?.('La contraseña delegada debe tener al menos 8 caracteres.', 'warning')
      return
    }
    if (password !== confirmPassword) {
      onNotify?.('Las contraseñas no coinciden.', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/access/delegates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        onNotify?.(data.error ?? 'No se pudo crear el acceso.', 'warning')
        return
      }

      onNotify?.('Acceso delegado creado correctamente.')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setVerifyState('idle')
      setVerifyMessage(null)
      await loadDelegates()
    } catch {
      onNotify?.('Error de red al crear el acceso.', 'warning')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!window.confirm('¿Revocar este acceso delegado? No podrá iniciar sesión con ese correo.')) {
      return
    }

    setRevokingId(id)
    try {
      const res = await fetch('/api/access/delegates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        onNotify?.(data.error ?? 'No se pudo revocar el acceso.', 'warning')
        return
      }
      onNotify?.('Acceso revocado.')
      await loadDelegates()
    } catch {
      onNotify?.('Error de red al revocar.', 'warning')
    } finally {
      setRevokingId(null)
    }
  }

  function formatDate(value: string | null): string {
    if (!value) return '—'
    try {
      return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    } catch {
      return value
    }
  }

  return (
    <div className="relative">
      {showIntroCurtain && (
        <div
          className={cn(
            'absolute inset-0 z-20 flex min-h-[min(28rem,70vh)] items-center justify-center rounded-2xl border border-border/80 bg-background/95 px-6 py-10 shadow-lg backdrop-blur-sm transition-opacity ease-out sm:px-10',
            curtainPhase === 'fading' ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
          style={{ transitionDuration: `${ACCESS_INTRO_CURTAIN_FADE_MS}ms` }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-intro-curtain-title"
        >
          <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
            <p
              id="access-intro-curtain-title"
              className="text-base font-bold leading-relaxed text-foreground sm:text-lg"
            >
              &ldquo;{ACCESS_INTRO_MESSAGE}&rdquo;
            </p>
            <Button type="button" size="lg" className="min-h-11 px-8" onClick={dismissIntroCurtain}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          'space-y-8 transition-opacity ease-out',
          showIntroCurtain && curtainPhase === 'visible' && 'pointer-events-none select-none opacity-40',
          curtainPhase === 'fading' && 'pointer-events-auto opacity-100',
        )}
        style={
          curtainPhase === 'fading'
            ? { transitionDuration: `${ACCESS_INTRO_CURTAIN_FADE_MS}ms` }
            : undefined
        }
        aria-hidden={showIntroCurtain && curtainPhase === 'visible'}
      >
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <KeyRound className="size-6" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Accesos</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Opcionalmente delega el acceso a tu perfil con un correo y contraseña distintos. El delegado
          maneja y comparte tu agenda y mensajes, sin ocupar un cupo nuevo en la rueda de negocios. Tu
          inicio de sesión habitual no cambia.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          Agregar acceso delegado
        </h2>

        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <div>
            <AuthFieldLabel htmlFor="delegate-email" icon={Mail}>
              Correo electrónico delegado
            </AuthFieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="delegate-email"
                type="email"
                required
                autoComplete="off"
                placeholder="delegado@empresa.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setVerifyState('idle')
                  setVerifyMessage(null)
                }}
                className={cn(inputClass, 'sm:flex-1')}
              />
              <Button
                type="button"
                variant="outline"
                disabled={verifyState === 'checking' || !email.trim()}
                onClick={() => void handleVerifyEmail()}
                className="min-h-11 shrink-0"
              >
                {verifyState === 'checking' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Verificar correo
              </Button>
            </div>
            {verifyMessage && (
              <p
                className={cn(
                  'mt-2 text-sm',
                  verifyState === 'available' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
                )}
              >
                {verifyState === 'available' ? (
                  <span className="inline-flex items-center gap-1">
                    <CircleCheck className="size-4" aria-hidden="true" />
                    {verifyMessage}
                  </span>
                ) : (
                  verifyMessage
                )}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <AuthFieldLabel htmlFor="delegate-password" icon={KeyRound}>
                Contraseña delegada
              </AuthFieldLabel>
              <PasswordInput
                id="delegate-password"
                tone="platform"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={setPassword}
              />
            </div>
            <div>
              <AuthFieldLabel htmlFor="delegate-password-confirm" icon={KeyRound}>
                Confirmar contraseña
              </AuthFieldLabel>
              <PasswordInput
                id="delegate-password-confirm"
                tone="platform"
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || verifyState !== 'available'}
            className="min-h-11"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Crear acceso delegado
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-foreground">Accesos activos</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando…
          </div>
        ) : delegates.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
            No has creado accesos delegados.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {delegates.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{row.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Creado: {formatDate(row.created_at)}
                    {row.last_used_at ? ` · Último uso: ${formatDate(row.last_used_at)}` : ''}
                    {!row.is_active ? ' · Revocado' : ''}
                  </p>
                </div>
                {row.is_active && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingId === row.id}
                    onClick={() => void handleRevoke(row.id)}
                    className="min-h-10 shrink-0 text-red-700 hover:text-red-800 dark:text-red-400"
                  >
                    {revokingId === row.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                    Revocar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  )
}
