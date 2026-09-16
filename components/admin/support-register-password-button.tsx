'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { KeyRound, Loader2 } from 'lucide-react'

export function SupportRegisterPasswordButton({
  profileId,
  credentialKind,
  delegateAccessId,
  onSaved,
}: {
  profileId: string
  credentialKind: 'owner' | 'delegate'
  delegateAccessId?: string
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    const password = window.prompt(
      credentialKind === 'owner'
        ? 'Contraseña titular conocida (mín. 8 caracteres):'
        : 'Contraseña delegada conocida (mín. 8 caracteres):',
    )
    if (!password?.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/support/register-credential', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          credentialKind,
          delegateAccessId,
          password,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo registrar la contraseña.')
      }
      onSaved()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al registrar.')
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
      onClick={() => void handleRegister()}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <KeyRound className="size-3" aria-hidden="true" />
      )}
      Registrar contraseña
    </Button>
  )
}
