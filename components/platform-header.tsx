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
    <header className="platform-no-print sticky top-0 z-30 mb-4 flex w-full items-center justify-end border-b border-[#dde8d8] bg-gradient-to-l from-[#eef3ea]/60 to-background py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 print:hidden sm:mb-6">
      <NotificationsDropdown
        notifications={notifications}
        appointments={appointments}
        onMarkRead={onMarkNotificationRead}
        onMarkAllRead={onMarkAllNotificationsRead}
      />
    </header>
  )
}
