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
import { Ban, Bell, CalendarClock, CircleCheck, CircleX, Mail } from 'lucide-react'

function notificationVisual(kind: BellNotification['kind']) {
  switch (kind) {
    case 'request':
      return {
        icon: Mail,
        accent: 'border-l-sky-500 bg-sky-50/90',
        iconClass: 'text-sky-600 bg-sky-100',
        label: 'Solicitud',
      }
    case 'confirmed':
      return {
        icon: CircleCheck,
        accent: 'border-l-emerald-500 bg-emerald-50/90',
        iconClass: 'text-emerald-700 bg-emerald-100',
        label: 'Confirmada',
      }
    case 'rejected':
      return {
        icon: CircleX,
        accent: 'border-l-red-400 bg-red-50/90',
        iconClass: 'text-red-700 bg-red-100',
        label: 'Rechazada',
      }
    case 'cancelled':
      return {
        icon: Ban,
        accent: 'border-l-[#c0392b] bg-red-100/95 ring-1 ring-red-200/80',
        iconClass: 'text-white bg-[#c0392b] shadow-sm',
        label: 'Reunión cancelada',
      }
    case 'upcoming':
      return {
        icon: CalendarClock,
        accent: 'border-l-amber-500 bg-amber-50/90',
        iconClass: 'text-amber-800 bg-amber-100',
        label: 'Próxima',
      }
    default:
      return {
        icon: Bell,
        accent: 'border-l-[#8ac441] bg-[#eef3ea]/90',
        iconClass: 'text-[#1a3c34] bg-[#dde8d8]',
        label: 'Actividad',
      }
  }
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
        className={cn(
          'relative flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2.5 transition-all',
          unreadCount > 0
            ? 'bg-[#eef3ea] text-[#1a3c34] shadow-sm ring-2 ring-[#8ac441]/40 hover:bg-[#e4edd9]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : 'Notificaciones'
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell
          className={cn('size-5', unreadCount > 0 && 'animate-[pulse_2.5s_ease-in-out_infinite]')}
          aria-hidden="true"
        />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),24rem)]',
            'overflow-hidden rounded-2xl border border-[#dde8d8] bg-card shadow-xl',
          )}
          role="menu"
          aria-label="Notificaciones recientes"
        >
          <div className="border-b border-[#dde8d8] bg-gradient-to-r from-[#eef3ea] to-white px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#1a3c34] text-[#8ac441]">
                <Bell className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1a3c34]">Notificaciones</p>
                {unreadCount > 0 ? (
                  <p className="text-xs text-[#5a6b62]">{unreadCount} sin leer</p>
                ) : (
                  <p className="text-xs text-[#5a6b62]">Mi Agenda · tiempo real</p>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto bg-[#fafcfa]">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hay notificaciones recientes.
              </p>
            ) : (
              <ul className="space-y-2 p-2">
                {items.map((item) => {
                  const visual = notificationVisual(item.kind)
                  const Icon = visual.icon
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          'w-full rounded-xl border-l-4 px-3 py-3 text-left transition-colors hover:brightness-[0.98]',
                          visual.accent,
                          !item.read && 'shadow-sm ring-1 ring-black/5',
                          item.kind === 'cancelled' && !item.read && 'ring-2 ring-red-300/60',
                        )}
                      >
                        <div className="flex gap-3">
                          <span
                            className={cn(
                              'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                              visual.iconClass,
                            )}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#5a6b62]">
                              {visual.label}
                            </p>
                            <p
                              className={cn(
                                'mt-1 text-sm leading-relaxed',
                                !item.read
                                  ? 'font-medium text-[#1a3c34]'
                                  : 'text-[#5a6b62]',
                              )}
                            >
                              {item.message}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {unreadCount > 0 && (
            <div className="border-t border-[#dde8d8] bg-white p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center font-semibold text-[#1a3c34] hover:bg-[#eef3ea]"
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
