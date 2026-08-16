'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  EMAIL_NOTIFICATIONS_BADGE_FADE_MS,
  getRemainingEmailBadgeVisibleMs,
  isEmailNotificationsEnabled,
  markEmailNotificationsEnabled,
  shouldShowEmailNotificationsBadge,
  subscribeEmailNotificationsEnabled,
} from '@/lib/email-notifications-enable'
import { cn } from '@/lib/utils'
import { CircleCheck, Loader2, MailCheck } from 'lucide-react'

type BadgePhase = 'hidden' | 'visible' | 'fading'

export function EmailNotificationsEnableButton({
  userId,
  onNotify,
}: {
  userId: string | null
  onNotify?: (message: string, durationMs?: number) => void
}) {
  const [enabled, setEnabled] = useState(() => isEmailNotificationsEnabled(userId))
  const [badgePhase, setBadgePhase] = useState<BadgePhase>(() =>
    shouldShowEmailNotificationsBadge(userId) ? 'visible' : 'hidden',
  )
  const [loading, setLoading] = useState(false)

  const syncEnabled = useCallback(() => {
    setEnabled(isEmailNotificationsEnabled(userId))
  }, [userId])

  const scheduleBadgeHide = useCallback(
    (remainingMs: number) => {
      if (remainingMs <= 0) {
        setBadgePhase('hidden')
        return () => {}
      }

      setBadgePhase('visible')
      const fadeStartMs = Math.max(0, remainingMs - EMAIL_NOTIFICATIONS_BADGE_FADE_MS)

      const fadeTimer = window.setTimeout(() => {
        setBadgePhase('fading')
      }, fadeStartMs)

      const hideTimer = window.setTimeout(() => {
        setBadgePhase('hidden')
      }, remainingMs)

      return () => {
        window.clearTimeout(fadeTimer)
        window.clearTimeout(hideTimer)
      }
    },
    [],
  )

  useEffect(() => {
    syncEnabled()
    return subscribeEmailNotificationsEnabled(userId, syncEnabled)
  }, [userId, syncEnabled])

  useEffect(() => {
    if (!userId || !enabled) {
      setBadgePhase('hidden')
      return
    }

    const remaining = getRemainingEmailBadgeVisibleMs(userId)
    if (remaining <= 0) {
      setBadgePhase('hidden')
      return
    }

    return scheduleBadgeHide(remaining)
  }, [userId, enabled, scheduleBadgeHide])

  async function handleEnable() {
    if (!userId || loading || enabled) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/enable-email-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = (await res.json()) as {
        ok?: boolean
        sent?: boolean
        to?: string
        error?: string
        skippedReason?: string
      }

      if (!res.ok || !data.sent) {
        onNotify?.(
          data.error ??
            'No se pudo enviar el correo de habilitación. Revisa tu perfil e inténtalo de nuevo.',
        )
        return
      }

      markEmailNotificationsEnabled(userId)
      setEnabled(true)
      scheduleBadgeHide(getRemainingEmailBadgeVisibleMs(userId))
      onNotify?.(
        `Correo enviado a ${data.to ?? 'tu bandeja'}. Revisa tu bandeja de entrada; en Gmail, si no lo ves, busca en Spam y marca «No es spam».`,
        10_000,
      )
    } catch {
      onNotify?.('Error de red al habilitar notificaciones por correo.')
    } finally {
      setLoading(false)
    }
  }

  if (!userId) return null

  if (enabled && badgePhase !== 'hidden') {
    return (
      <span
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-2.5 text-xs font-medium text-primary transition-all ease-out sm:px-3 sm:text-sm',
          badgePhase === 'visible' && 'opacity-100 translate-y-0',
          badgePhase === 'fading' &&
            'pointer-events-none opacity-0 -translate-y-0.5 scale-[0.98]',
        )}
        style={{
          transitionDuration: `${EMAIL_NOTIFICATIONS_BADGE_FADE_MS}ms`,
        }}
        title="Notificaciones por correo habilitadas en este dispositivo"
        aria-live="polite"
      >
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Correo habilitado</span>
      </span>
    )
  }

  if (enabled) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      disabled={loading}
      onClick={() => void handleEnable()}
      className={cn(
        'min-h-11 max-w-[11rem] gap-1.5 border-primary/30 bg-secondary/40 px-2.5 text-xs font-medium text-primary hover:bg-secondary sm:max-w-none sm:px-3 sm:text-sm',
      )}
      title="Enviar correo de confirmación a tu bandeja para mejorar la entrega en Gmail"
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <MailCheck className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate sm:whitespace-normal">Habilitar Notificaciones por Correo</span>
    </Button>
  )
}
