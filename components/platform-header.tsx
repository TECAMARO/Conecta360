'use client'

import { NotificationsDropdown } from '@/components/notifications-dropdown'
import type { Appointment } from '@/lib/data'
import type { AgendaNotification } from '@/lib/meetings'

export function PlatformHeader({
  notifications,
  appointments,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: {
  notifications: AgendaNotification[]
  appointments: Appointment[]
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
}) {
  return (
    <header className="platform-no-print sticky top-0 z-30 mb-4 flex w-full items-center justify-end border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden sm:mb-6">
      <NotificationsDropdown
        notifications={notifications}
        appointments={appointments}
        onMarkRead={onMarkNotificationRead}
        onMarkAllRead={onMarkAllNotificationsRead}
      />
    </header>
  )
}
