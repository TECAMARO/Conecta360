import { cn } from '@/lib/utils'
import type { PlatformTheme } from '@/lib/platform-preferences'

/** Applies platform light/dark CSS variables on portaled UI (dialogs outside .platform-shell). */
export function platformThemedSurfaceClass(theme: PlatformTheme, className?: string) {
  return cn(
    'platform-themed-surface bg-card text-card-foreground',
    theme === 'dark' && 'dark',
    className,
  )
}
