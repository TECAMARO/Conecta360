'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function SupportPasswordField({
  password,
  available,
  label = 'Contraseña',
  registerAction,
}: {
  password: string | null
  available: boolean
  label?: string
  registerAction?: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)

  if (!available || !password) {
    return (
      <div className="space-y-1">
        <span className="text-xs italic text-[#8a9a92]" title="Sin copia en bóveda aún">
          No disponible
        </span>
        {registerAction}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-[#1a3c34] sm:text-sm">
        {visible ? password : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="rounded-md p-1 text-[#5a6b62] transition-colors hover:bg-[#eef3ea] hover:text-[#1a3c34]"
        aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
