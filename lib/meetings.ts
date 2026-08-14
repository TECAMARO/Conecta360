import type { Appointment } from '@/lib/data'
import {
  canAcceptMeetingRequest,
  canSendMeetingRequest,
  crossCancellationNotificationMessage,
  type SlotAvailabilityContext,
} from '@/lib/agenda-protection'
import {
  isSlotTablesExhausted,
  MEETING_MODALITY,
  normalizePhysicalTable,
} from '@/lib/physical-tables'

export type AgendaNotification = {
  id: string
  message: string
  createdAt: string
  read: boolean
  /** Alert banners inside Mi Agenda; bell shows confirmed, upcoming and cross events. */
  kind?: 'alert' | 'event' | 'confirmed' | 'upcoming'
  meetingId?: string
}

export { MEETING_MODALITY }

export function formatSlotLabel(day: string, time: string): string {
  return `${day} · ${time}`
}

/** @deprecated Use getSlotAvailability from agenda-protection. */
export function isSlotBlockedForRequest(
  slotId: string,
  appointments: Appointment[],
): boolean {
  return isSlotTablesExhausted(appointments, slotId)
}

export function buildSentRequest(
  ctx: SlotAvailabilityContext,
  args: Omit<Appointment, 'id' | 'status' | 'direction' | 'createdAt' | 'modality' | 'table'>,
): Appointment | null {
  const validation = canSendMeetingRequest(ctx, args.participantId, args.slotId)
  if (!validation.ok) return null

  return {
    ...args,
    table: validation.table,
    modality: MEETING_MODALITY,
    id: `a-${Date.now()}`,
    status: 'pendiente',
    direction: 'sent',
    createdAt: new Date().toISOString(),
  }
}

export function buildSentRequestWithReason(
  ctx: SlotAvailabilityContext,
  args: Omit<Appointment, 'id' | 'status' | 'direction' | 'createdAt' | 'modality' | 'table'>,
): { appointment: Appointment | null; error?: string } {
  const validation = canSendMeetingRequest(ctx, args.participantId, args.slotId)
  if (!validation.ok) {
    return { appointment: null, error: validation.message }
  }

  return {
    appointment: {
      ...args,
      table: validation.table,
      modality: MEETING_MODALITY,
      id: `a-${Date.now()}`,
      status: 'pendiente',
      direction: 'sent',
      createdAt: new Date().toISOString(),
    },
  }
}

export function acceptMeetingRequest(
  userAppointments: Appointment[],
  slotOccupancy: Appointment[],
  requestId: string,
  requesterOutgoingConfirmed?: number,
): {
  appointments: Appointment[]
  notifications: AgendaNotification[]
  error?: string
} {
  const validation = canAcceptMeetingRequest(
    userAppointments,
    slotOccupancy,
    requestId,
    requesterOutgoingConfirmed,
  )
  if (!validation.ok) {
    return { appointments: userAppointments, notifications: [], error: validation.message }
  }

  const target = userAppointments.find((appt) => appt.id === requestId)
  if (!target) {
    return { appointments: userAppointments, notifications: [], error: 'Solicitud no encontrada.' }
  }

  const slotId = target.slotId
  const table =
    target.table && parsePhysicalTableSafe(target.table)
      ? normalizePhysicalTable(target.table)
      : validation.table

  const notifications: AgendaNotification[] = []
  const now = Date.now()

  const updated = userAppointments.map((appt) => {
    if (appt.id === requestId) {
      return {
        ...appt,
        status: 'confirmada' as const,
        table,
        modality: MEETING_MODALITY,
        respondedAt: new Date().toISOString(),
      }
    }

    if (appt.status === 'pendiente' && appt.slotId === slotId) {
      notifications.push({
        id: `n-${now}-${appt.id}`,
        message: crossCancellationNotificationMessage(appt.day, appt.time),
        createdAt: new Date().toISOString(),
        read: false,
        kind: 'event',
      })
      return {
        ...appt,
        status: 'anulada_por_cruce' as const,
        respondedAt: new Date().toISOString(),
      }
    }

    return appt
  })

  return { appointments: updated, notifications }
}

function parsePhysicalTableSafe(table: string): boolean {
  return /Mesa\s+\d{1,2}/i.test(table)
}

export function rejectMeetingRequest(
  appointments: Appointment[],
  requestId: string,
): Appointment[] {
  return appointments.map((appt) =>
    appt.id === requestId
      ? { ...appt, status: 'rechazada' as const, respondedAt: new Date().toISOString() }
      : appt,
  )
}

export function cancelSentRequest(appointments: Appointment[], requestId: string): Appointment[] {
  return appointments.map((appt) =>
    appt.id === requestId
      ? { ...appt, status: 'cancelada_enviada' as const, respondedAt: new Date().toISOString() }
      : appt,
  )
}

export function filterConfirmed(appointments: Appointment[]): Appointment[] {
  return appointments.filter(
    (a) => a.status === 'confirmada' || a.status === 'completada',
  )
}

export function filterPendingReceived(appointments: Appointment[]): Appointment[] {
  return appointments.filter((a) => a.status === 'pendiente' && a.direction === 'received')
}

export function filterPendingSent(appointments: Appointment[]): Appointment[] {
  return appointments.filter((a) => a.status === 'pendiente' && a.direction === 'sent')
}

export function filterCancelledMeetings(appointments: Appointment[]): Appointment[] {
  return appointments.filter(
    (a) =>
      a.status === 'rechazada' ||
      a.status === 'cancelada_enviada' ||
      a.status === 'cancelada_admin',
  )
}

export function filterConflictHistory(appointments: Appointment[]): Appointment[] {
  return appointments.filter(
    (a) =>
      a.status === 'anulada_por_cruce' ||
      a.status === 'cancelada_conflicto' ||
      a.status === 'anulada_por_limite',
  )
}

export function pendingRequestsCount(appointments: Appointment[]): number {
  return filterPendingReceived(appointments).length + filterPendingSent(appointments).length
}

/** Sidebar badge: reuniones confirmadas + solicitudes pendientes. */
export function agendaSidebarBadgeCount(appointments: Appointment[]): number {
  return filterConfirmed(appointments).length + pendingRequestsCount(appointments)
}

export function pendingRequestsSummaryMessage(count: number): string {
  if (count === 1) {
    return '📩 Tienes 1 solicitud de reunión pendiente de respuesta.'
  }
  return `📩 Tienes ${count} solicitudes de reunión pendientes de respuesta.`
}

/** @deprecated Use agendaSidebarBadgeCount — kept for imports during migration. */
export function agendaActiveCount(appointments: Appointment[]): number {
  return agendaSidebarBadgeCount(appointments)
}
