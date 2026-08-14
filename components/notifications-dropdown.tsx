'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  buildBellNotifications,
  countUnreadBellNotifications,
  persistDismissedUpcomingIds,
  readDismissedUpcomingIds,
  type BellNotification,
} from '@/lib/agenda-notifications'
import type { AgendaNotification } from '@/lib/meetings'
import type { Appointment } from '@/lib/data'
import { Bell } from 'lucide-react'

export function NotificationsDropdown({
  notifications,
  appointments,
  onMarkAllRead,
  onMarkRead,
}: {
  notifications: AgendaNotification[]
  appointments: Appointment[]
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dismissedUpcomingIds, setDismissedUpcomingIds] = useState<Set<string>>(() =>
    readDismissedUpcomingIds(),
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const tickRef = useRef(0)
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      tickRef.current += 1
      setTick(tickRef.current)
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const items = buildBellNotifications(notifications, appointments, dismissedUpcomingIds)
  const unreadCount = countUnreadBellNotifications(items)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function dismissUpcoming(meetingId: string) {
    setDismissedUpcomingIds((prev) => {
      const next = new Set(prev)
      next.add(meetingId)
      persistDismissedUpcomingIds(next)
      return next
    })
  }

  function handleItemClick(item: BellNotification) {
    if (item.kind === 'upcoming' && item.meetingId) {
      dismissUpcoming(item.meetingId)
      return
    }
    if (!item.synthetic && !item.read) {
      onMarkRead(item.id)
    }
  }

  function handleMarkAllRead() {
    const upcomingIds = items
      .filter((item) => item.kind === 'upcoming' && item.meetingId)
      .map((item) => item.meetingId as string)

    if (upcomingIds.length > 0) {
      setDismissedUpcomingIds((prev) => {
        const next = new Set(prev)
        for (const id of upcomingIds) next.add(id)
        persistDismissedUpcomingIds(next)
        return next
      })
    }

    onMarkAllRead()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-background"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),22rem)]',
            'overflow-hidden rounded-xl border border-border bg-card shadow-lg',
          )}
          role="menu"
          aria-label="Notificaciones recientes"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
            {unreadCount > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unreadCount} sin leer
              </p>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No hay notificaciones recientes.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'w-full px-4 py-3 text-left text-sm leading-relaxed transition-colors hover:bg-muted/60',
                        !item.read
                          ? 'bg-secondary/30 font-medium text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {item.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {unreadCount > 0 && (
            <div className="border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-primary"
                onClick={handleMarkAllRead}
              >
                Marcar todas como leídas
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
