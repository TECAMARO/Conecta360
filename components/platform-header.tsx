'use client'

import { EmailNotificationsEnableButton } from '@/components/email-notifications-enable-button'
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
  userId = null,
  isDelegateSession = false,
  delegateEmail = null,
  onNotify,
}: {
  notifications: AgendaNotification[]
  appointments: Appointment[]
  theme: PlatformTheme
  onThemeChange: (theme: PlatformTheme) => void
  themeTransitioning?: boolean
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
  userId?: string | null
  isDelegateSession?: boolean
  delegateEmail?: string | null
  onNotify?: (message: string, durationMs?: number) => void
}) {
  return (
    <header
      className={cn(
        'platform-no-print sticky top-0 z-30 mb-4 flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3',
        'border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90',
        'print:hidden sm:mb-6',
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {isDelegateSession && delegateEmail ? (
          <EmailNotificationsEnableButton
            userId={userId}
            variant="delegate"
            recipientEmail={delegateEmail}
            highlighted
            onNotify={onNotify}
          />
        ) : (
          <EmailNotificationsEnableButton
            userId={userId}
            variant="owner"
            onNotify={onNotify}
          />
        )}
      </div>
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
