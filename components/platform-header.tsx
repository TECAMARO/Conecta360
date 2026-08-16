'use client'

import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { EmailNotificationsEnableButton } from '@/components/email-notifications-enable-button'
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
  showAgendaEmailEnable = false,
  userId = null,
  onNotify,
}: {
  notifications: AgendaNotification[]
  appointments: Appointment[]
  theme: PlatformTheme
  onThemeChange: (theme: PlatformTheme) => void
  themeTransitioning?: boolean
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
  /** Solo Mi Agenda: botón de habilitar correo transaccional. */
  showAgendaEmailEnable?: boolean
  userId?: string | null
  onNotify?: (message: string) => void
}) {
  return (
    <header
      className={cn(
        'platform-no-print sticky top-0 z-30 mb-4 flex w-full items-center justify-end gap-2 sm:gap-3',
        'border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90',
        'print:hidden sm:mb-6',
      )}
    >
      {showAgendaEmailEnable && (
        <EmailNotificationsEnableButton userId={userId} onNotify={onNotify} />
      )}
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
