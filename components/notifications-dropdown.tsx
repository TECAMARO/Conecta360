'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  pendingRequestsCount,
  pendingRequestsSummaryMessage,
  type AgendaNotification,
} from '@/lib/meetings'
import type { Appointment } from '@/lib/data'
import { Bell } from 'lucide-react'

type DisplayNotification = AgendaNotification & { synthetic?: boolean }

function buildDisplayNotifications(
  notifications: AgendaNotification[],
  appointments: Appointment[],
): DisplayNotification[] {
  const pending = pendingRequestsCount(appointments)
  const synthetic: DisplayNotification[] =
    pending > 0
      ? [
          {
            id: 'pending-summary',
            message: pendingRequestsSummaryMessage(pending),
            createdAt: new Date().toISOString(),
            read: true,
            synthetic: true,
          },
        ]
      : []

  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ).concat(synthetic)
}

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
  const rootRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length
  const items = buildDisplayNotifications(notifications, appointments)

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
                      onClick={() => {
                        if (!item.synthetic && !item.read) onMarkRead(item.id)
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left text-sm leading-relaxed transition-colors hover:bg-muted/60',
                        !item.synthetic && !item.read
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
                onClick={() => {
                  onMarkAllRead()
                  setOpen(false)
                }}
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
