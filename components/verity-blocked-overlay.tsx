'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const FADE_MS = 340
const SUPPORT_EMAIL = 'direccion@amaro.agency'

export function VerityBlockedOverlay({
  active,
  onLogout,
}: {
  active: boolean
  onLogout: () => void
}) {
  const [mounted, setMounted] = useState(active)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setMounted(true)
      const id = window.requestAnimationFrame(() => setVisible(true))
      return () => window.cancelAnimationFrame(id)
    }

    setVisible(false)
    const timeoutId = window.setTimeout(() => setMounted(false), FADE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [active])

  if (!mounted) return null

  return (
    <div
      className={cn(
        'verity-blocked-overlay fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#1a3c34] px-6',
        visible ? 'verity-blocked-overlay-visible' : 'verity-blocked-overlay-hidden',
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verity-blocked-title"
    >
      <div className="mx-auto max-w-lg text-center text-white">
        <p id="verity-blocked-title" className="text-base leading-relaxed sm:text-lg">
          Funciones no disponibles para el inicio de sesión detectado, contactarse al correo{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold underline underline-offset-2 transition-colors hover:text-[#8ac441]"
          >
            {SUPPORT_EMAIL}
          </a>{' '}
          para mayor información
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
