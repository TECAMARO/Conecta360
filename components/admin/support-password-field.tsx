'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function SupportPasswordField({
  password,
  available,
  label = 'Contraseña',
}: {
  password: string | null
  available: boolean
  label?: string
}) {
  const [visible, setVisible] = useState(false)

  if (!available || !password) {
    return (
      <span className="text-xs italic text-[#8a9a92]" title="No hay copia en bóveda de soporte">
        No disponible
      </span>
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
