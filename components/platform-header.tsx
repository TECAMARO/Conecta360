'use client'

import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { PlatformThemeToggle } from '@/components/platform-theme-toggle'
import type { Appointment } from '@/lib/data'
import type { AgendaNotification } from '@/lib/meetings'
import type { PlatformTheme } from '@/lib/platform-preferences'
import { cn } from '@/lib/utils'

export function PlatformHeader({
  notifications,
  appointments,
  theme,
  onThemeChange,
  themeTransitioning = false,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: {
  notifications: AgendaNotification[]
  appointments: Appointment[]
  theme: PlatformTheme
  onThemeChange: (theme: PlatformTheme) => void
  themeTransitioning?: boolean
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
}) {
  return (
    <header
      className={cn(
        'platform-no-print sticky top-0 z-30 mb-4 flex w-full items-center justify-end gap-3',
        'border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90',
        'print:hidden sm:mb-6',
      )}
    >
      <PlatformThemeToggle
        theme={theme}
        onChange={onThemeChange}
        themeTransitioning={themeTransitioning}
      />
      <NotificationsDropdown
        notifications={notifications}
        appointments={appointments}
        onMarkRead={onMarkNotificationRead}
        onMarkAllRead={onMarkAllNotificationsRead}
      />
    </header>
  )
}
