import { participantById, type Appointment } from '@/lib/data'
import { parseAppointmentDateRange } from '@/lib/agenda-export'
import { filterConfirmed, type AgendaNotification } from '@/lib/meetings'

/** Minutes before start to show "reunión pronto a iniciar" in the bell. */
export const UPCOMING_MEETING_LEAD_MS = 30 * 60 * 1000

const DISMISSED_UPCOMING_KEY = 'conecta360-upcoming-dismissed-ids'

export type BellNotification = AgendaNotification & {
  synthetic?: boolean
  /** Linked meeting for dedupe / dismiss of upcoming reminders. */
  meetingId?: string
}

export function isBellStoredNotification(notification: AgendaNotification): boolean {
  if (notification.kind === 'alert') return false
  if (notification.id === 'pending-summary') return false
  if (
    notification.kind === 'confirmed' ||
    notification.kind === 'event' ||
    notification.kind === 'upcoming' ||
    notification.kind === 'request' ||
    notification.kind === 'rejected' ||
    notification.kind === 'cancelled'
  ) {
    return true
  }
  if (notification.kind) return false
  return (
    notification.message.includes('Confirmaste') ||
    notification.message.includes('confirmada') ||
    notification.message.includes('solicitud') ||
    notification.message.includes('Solicitud') ||
    notification.message.includes('rechaz') ||
    notification.message.includes('cancelada por una de las partes') ||
    notification.message.includes('Anulada') ||
    notification.message.includes('cruce')
  )
}

export function isMeetingStartingSoon(appointment: Appointment, now = new Date()): boolean {
  if (appointment.status !== 'confirmada') return false
  const range = parseAppointmentDateRange(appointment.slotId, appointment.time)
  if (!range) return false

  const nowMs = now.getTime()
  const startMs = range.start.getTime()
  const endMs = range.end.getTime()

  return nowMs >= startMs - UPCOMING_MEETING_LEAD_MS && nowMs <= endMs
}

export function upcomingMeetingReminderMessage(appointment: Appointment): string {
  const name =
    participantById(appointment.participantId)?.name ??
    'tu contraparte'
  return `⏰ Tu reunión con ${name} inicia pronto: ${appointment.day} · ${appointment.time} (${appointment.table}).`
}

export function meetingConfirmedByYouMessage(
  counterpartyName: string,
  appointment: Pick<Appointment, 'day' | 'time' | 'table'>,
): string {
  return `✅ Confirmaste la reunión con ${counterpartyName} para el ${appointment.day} a las ${appointment.time} (${appointment.table}).`
}

export function meetingConfirmedForSenderMessage(
  counterpartyName: string,
  appointment: Pick<Appointment, 'day' | 'time' | 'table'>,
): string {
  return `✅ Tu solicitud fue confirmada. Reunión con ${counterpartyName} el ${appointment.day} a las ${appointment.time} (${appointment.table}).`
}

export function meetingRequestReceivedMessage(
  requesterName: string,
  appointment: Pick<Appointment, 'day' | 'time' | 'table'>,
): string {
  return `📩 Nueva solicitud de agendamiento de ${requesterName} para el ${appointment.day} a las ${appointment.time} (${appointment.table}).`
}

export function meetingRejectedForSenderMessage(
  counterpartyName: string,
  appointment: Pick<Appointment, 'day' | 'time' | 'table'>,
): string {
  return `✕ Tu solicitud de reunión con ${counterpartyName} fue rechazada (${appointment.day} · ${appointment.time}).`
}

export function meetingConfirmedForRecipientMessage(
  counterpartyName: string,
  appointment: Pick<Appointment, 'day' | 'time' | 'table'>,
): string {
  return `✅ Confirmaste la reunión con ${counterpartyName} para el ${appointment.day} a las ${appointment.time} (${appointment.table}).`
}

export function meetingCancelledByPartyMessage(counterpartyName: string): string {
  return `Tu reunión con ${counterpartyName} fue cancelada por una de las partes.`
}

const ACTIVE_MEETING_STATUSES = new Set<Appointment['status']>(['confirmada', 'pendiente'])

export function buildUpcomingReminderNotifications(
  appointments: Appointment[],
  dismissedIds: ReadonlySet<string>,
  now = new Date(),
): BellNotification[] {
  return filterConfirmed(appointments)
    .filter((appt) => isMeetingStartingSoon(appt, now) && !dismissedIds.has(appt.id))
    .map((appt) => ({
      id: `upcoming-${appt.id}`,
      meetingId: appt.id,
      message: upcomingMeetingReminderMessage(appt),
      createdAt: now.toISOString(),
      read: false,
      kind: 'upcoming' as const,
      synthetic: true,
    }))
}

export function detectNewlyConfirmedNotifications(
  previous: Appointment[],
  next: Appointment[],
): AgendaNotification[] {
  const prevById = new Map(previous.map((appt) => [appt.id, appt]))
  const nowIso = new Date().toISOString()

  return next.flatMap((appt) => {
    const before = prevById.get(appt.id)
    if (!before || before.status !== 'pendiente' || appt.status !== 'confirmada') {
      return []
    }

    const name =
      participantById(appt.participantId)?.name ??
      'la organización'

    if (appt.direction === 'sent') {
      return [
        {
          id: `n-confirmed-${appt.id}-${Date.now()}`,
          meetingId: appt.id,
          message: meetingConfirmedForSenderMessage(name, appt),
          createdAt: appt.respondedAt ?? nowIso,
          read: false,
          kind: 'confirmed' as const,
        },
      ]
    }

    if (appt.direction === 'received') {
      return [
        {
          id: `n-confirmed-recv-${appt.id}-${Date.now()}`,
          meetingId: appt.id,
          message: meetingConfirmedForRecipientMessage(name, appt),
          createdAt: appt.respondedAt ?? nowIso,
          read: false,
          kind: 'confirmed' as const,
        },
      ]
    }

    return []
  })
}

export function detectNewlyReceivedRequestNotifications(
  previous: Appointment[],
  next: Appointment[],
): AgendaNotification[] {
  const prevById = new Map(previous.map((appt) => [appt.id, appt]))
  const nowIso = new Date().toISOString()

  return next.flatMap((appt) => {
    if (appt.status !== 'pendiente' || appt.direction !== 'received') return []

    const before = prevById.get(appt.id)
    if (before?.status === 'pendiente' && before.direction === 'received') return []

    const name =
      participantById(appt.participantId)?.name ??
      'Una organización'

    return [
      {
        id: `n-request-${appt.id}-${Date.now()}`,
        meetingId: appt.id,
        message: meetingRequestReceivedMessage(name, appt),
        createdAt: appt.createdAt ?? nowIso,
        read: false,
        kind: 'request' as const,
      },
    ]
  })
}

export function detectNewlyPartyCancelledNotifications(
  previous: Appointment[],
  next: Appointment[],
): AgendaNotification[] {
  const prevById = new Map(previous.map((appt) => [appt.id, appt]))
  const nowIso = new Date().toISOString()

  return next.flatMap((appt) => {
    if (appt.status !== 'cancelada_admin') return []

    const before = prevById.get(appt.id)
    if (!before || !ACTIVE_MEETING_STATUSES.has(before.status)) return []

    const name =
      participantById(appt.participantId)?.name ??
      'tu contraparte'

    return [
      {
        id: `n-cancelled-${appt.id}-${Date.now()}`,
        meetingId: appt.id,
        message: meetingCancelledByPartyMessage(name),
        createdAt: nowIso,
        read: false,
        kind: 'cancelled' as const,
      },
    ]
  })
}

export function detectNewlyRejectedNotifications(
  previous: Appointment[],
  next: Appointment[],
): AgendaNotification[] {
  const prevById = new Map(previous.map((appt) => [appt.id, appt]))
  const nowIso = new Date().toISOString()

  return next.flatMap((appt) => {
    const before = prevById.get(appt.id)
    if (!before || before.status !== 'pendiente' || appt.status !== 'rechazada') return []
    if (appt.direction !== 'sent') return []

    const name =
      participantById(appt.participantId)?.name ??
      'la organización'

    return [
      {
        id: `n-rejected-${appt.id}-${Date.now()}`,
        meetingId: appt.id,
        message: meetingRejectedForSenderMessage(name, appt),
        createdAt: nowIso,
        read: false,
        kind: 'rejected' as const,
      },
    ]
  })
}

export function appendUniqueMeetingNotifications(
  existing: AgendaNotification[],
  incoming: AgendaNotification[],
): AgendaNotification[] {
  if (incoming.length === 0) return existing

  const seen = new Set(
    existing
      .filter(
        (n) =>
          n.meetingId &&
          (n.kind === 'confirmed' ||
            n.kind === 'upcoming' ||
            n.kind === 'request' ||
            n.kind === 'rejected' ||
            n.kind === 'cancelled'),
      )
      .map((n) => `${n.kind}:${n.meetingId}`),
  )

  const fresh = incoming.filter((n) => {
    if (!n.meetingId) return true
    const key = `${n.kind ?? 'event'}:${n.meetingId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return [...fresh, ...existing].slice(0, 30)
}

export function readDismissedUpcomingIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(DISMISSED_UPCOMING_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function persistDismissedUpcomingIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(DISMISSED_UPCOMING_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore quota */
  }
}

export function buildBellNotifications(
  stored: AgendaNotification[],
  appointments: Appointment[],
  dismissedUpcomingIds: ReadonlySet<string>,
  now = new Date(),
): BellNotification[] {
  const persisted = stored.filter(isBellStoredNotification)
  const upcoming = buildUpcomingReminderNotifications(appointments, dismissedUpcomingIds, now)

  return [...upcoming, ...persisted].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function countUnreadBellNotifications(items: BellNotification[]): number {
  return items.filter((item) => !item.read).length
}
