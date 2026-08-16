'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  isEmailNotificationsEnabled,
  markEmailNotificationsEnabled,
  subscribeEmailNotificationsEnabled,
} from '@/lib/email-notifications-enable'
import { cn } from '@/lib/utils'
import { CircleCheck, Loader2, MailCheck } from 'lucide-react'

export function EmailNotificationsEnableButton({
  userId,
  onNotify,
}: {
  userId: string | null
  onNotify?: (message: string, durationMs?: number) => void
}) {
  const [enabled, setEnabled] = useState(() => isEmailNotificationsEnabled(userId))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setEnabled(isEmailNotificationsEnabled(userId))
    return subscribeEmailNotificationsEnabled(userId, () => {
      setEnabled(isEmailNotificationsEnabled(userId))
    })
  }, [userId])

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

  if (enabled) {
    return (
      <span
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 text-xs font-medium text-primary sm:px-3 sm:text-sm"
        title="Notificaciones por correo habilitadas en este dispositivo"
      >
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Correo habilitado</span>
      </span>
    )
  }

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
