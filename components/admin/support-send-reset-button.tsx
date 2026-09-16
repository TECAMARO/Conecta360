'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Mail } from 'lucide-react'

export function SupportSendResetButton({
  profileId,
  credentialKind,
  delegateAccessId,
  onSent,
}: {
  profileId: string
  credentialKind: 'owner' | 'delegate'
  delegateAccessId?: string
  onSent: (message: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support/send-password-reset', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          credentialKind,
          delegateAccessId,
        }),
      })
      const data = (await res.json()) as {
        error?: string
        sentTo?: string
        message?: string
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo enviar el correo.')
      }

      if (credentialKind === 'owner') {
        onSent(`Correo de restauración enviado a ${data.sentTo ?? 'titular'}.`)
      } else {
        onSent(data.message ?? 'Contraseña delegada restablecida.')
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al enviar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-1 h-7 gap-1 px-2 text-xs"
      disabled={loading}
      onClick={() => void handleSend()}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <Mail className="size-3" aria-hidden="true" />
      )}
      Enviar correo de restauración
    </Button>
  )
}
