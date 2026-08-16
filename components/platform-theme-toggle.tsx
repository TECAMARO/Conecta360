'use client'

import { cn } from '@/lib/utils'
import type { PlatformTheme } from '@/lib/platform-preferences'
import { Moon, Sun } from 'lucide-react'

export function PlatformThemeToggle({
  theme,
  onChange,
  themeTransitioning = false,
}: {
  theme: PlatformTheme
  onChange: (theme: PlatformTheme) => void
  themeTransitioning?: boolean
}) {
  const isDark = theme === 'dark'

  function toggle() {
    if (themeTransitioning) return
    onChange(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={themeTransitioning}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={isDark}
      aria-busy={themeTransitioning}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
        'border-[#8ac441]/35 bg-card text-foreground shadow-sm',
        'ring-2 ring-[#8ac441]/45 hover:bg-secondary/80',
        themeTransitioning && 'pointer-events-none opacity-70',
      )}
    >
      {isDark ? (
        <Moon className="size-4 shrink-0 text-[#8ac441]" aria-hidden="true" />
      ) : (
        <Sun className="size-4 shrink-0 text-[#8ac441]" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{isDark ? 'Modo Oscuro' : 'Modo Claro'}</span>
      <span className="sm:hidden">{isDark ? 'Oscuro' : 'Claro'}</span>
    </button>
  )
}
