import type { Appointment } from '@/lib/data'
import {
  isSlotTablesExhausted,
  getNextAvailableTable,
  isSameMeetingBlock,
  mergeAppointmentsForValidation,
} from '@/lib/physical-tables'
import {
  isOutgoingSendBlocked,
  isRequesterAtOutgoingLimit,
  OUTGOING_LIMIT_RECIPIENT_MESSAGE,
  OUTGOING_LIMIT_SILENT_MESSAGE,
} from '@/lib/meeting-outgoing-limit'

const SENDER_BLOCKING_STATUSES = new Set<Appointment['status']>(['confirmada', 'pendiente'])
const RECEIVER_BLOCKING_STATUSES = new Set<Appointment['status']>(['confirmada'])

export type SlotBlockReason = 'agenda_conflict' | 'tables_exhausted' | null

export type SlotAvailability = {
  available: boolean
  reason: SlotBlockReason
  message?: string
}

/** User agenda + global mesa occupancy for one block. */
export type SlotAvailabilityContext = {
  userAppointments: Appointment[]
  slotOccupancy: Appointment[]
}

export const SLOT_UNAVAILABLE_AGENDA = 'Horario no disponible (Cruce de agenda)'
export const SLOT_UNAVAILABLE_TABLES = 'Agotado (Sin mesas disponibles en este bloque)'

export function isCurrentUserBusyAtSlot(
  userAppointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
): boolean {
  return userAppointments.some(
    (appt) =>
      appt.id !== excludeAppointmentId &&
      isSameMeetingBlock(appt, slotId) &&
      SENDER_BLOCKING_STATUSES.has(appt.status),
  )
}

export function isParticipantConfirmedAtSlot(
  participantId: string,
  slotId: string,
  userAppointments: Appointment[],
  excludeAppointmentId?: string,
): boolean {
  return userAppointments.some(
    (appt) =>
      appt.id !== excludeAppointmentId &&
      appt.participantId === participantId &&
      isSameMeetingBlock(appt, slotId) &&
      RECEIVER_BLOCKING_STATUSES.has(appt.status),
  )
}

/** Participant already confirmed in this block with anyone (global occupancy). */
export function isParticipantConfirmedAtSlotGlobal(
  participantId: string,
  slotId: string,
  slotOccupancy: Appointment[],
  excludeAppointmentId?: string,
): boolean {
  return slotOccupancy.some((appt) => {
    if (appt.id === excludeAppointmentId) return false
    if (appt.status !== 'confirmada') return false
    if (!isSameMeetingBlock(appt, slotId)) return false

    const involved =
      appt.participantId === participantId ||
      appt.requesterId === participantId ||
      appt.recipientId === participantId

    return involved
  })
}

export function getSlotAvailability(
  ctx: SlotAvailabilityContext,
  slotId: string,
  targetParticipantId: string,
  excludeAppointmentId?: string,
): SlotAvailability {
  if (isCurrentUserBusyAtSlot(ctx.userAppointments, slotId, excludeAppointmentId)) {
    return {
      available: false,
      reason: 'agenda_conflict',
      message: SLOT_UNAVAILABLE_AGENDA,
    }
  }

  if (
    isParticipantConfirmedAtSlot(
      targetParticipantId,
      slotId,
      ctx.userAppointments,
      excludeAppointmentId,
    ) ||
    isParticipantConfirmedAtSlotGlobal(
      targetParticipantId,
      slotId,
      ctx.slotOccupancy,
      excludeAppointmentId,
    )
  ) {
    return {
      available: false,
      reason: 'agenda_conflict',
      message: SLOT_UNAVAILABLE_AGENDA,
    }
  }

  const forTables = mergeAppointmentsForValidation(ctx.userAppointments, ctx.slotOccupancy)

  if (isSlotTablesExhausted(forTables, slotId, excludeAppointmentId)) {
    return {
      available: false,
      reason: 'tables_exhausted',
      message: SLOT_UNAVAILABLE_TABLES,
    }
  }

  return { available: true, reason: null }
}

export function canSendMeetingRequest(
  ctx: SlotAvailabilityContext,
  targetParticipantId: string,
  slotId: string,
): { ok: true; table: string } | { ok: false; message: string } {
  if (isOutgoingSendBlocked(ctx.userAppointments)) {
    return { ok: false, message: OUTGOING_LIMIT_SILENT_MESSAGE }
  }

  const availability = getSlotAvailability(ctx, slotId, targetParticipantId)
  if (!availability.available) {
    return { ok: false, message: availability.message ?? SLOT_UNAVAILABLE_AGENDA }
  }

  const forTables = mergeAppointmentsForValidation(ctx.userAppointments, ctx.slotOccupancy)
  const table = getNextAvailableTable(forTables, slotId)
  if (!table) {
    return { ok: false, message: SLOT_UNAVAILABLE_TABLES }
  }

  return { ok: true, table }
}

export function isCurrentUserConfirmedAtSlot(
  userAppointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
): boolean {
  return userAppointments.some(
    (appt) =>
      appt.id !== excludeAppointmentId &&
      isSameMeetingBlock(appt, slotId) &&
      appt.status === 'confirmada',
  )
}

export function canAcceptMeetingRequest(
  userAppointments: Appointment[],
  slotOccupancy: Appointment[],
  requestId: string,
  requesterOutgoingConfirmed?: number,
): { ok: true; table: string } | { ok: false; message: string } {
  const target = userAppointments.find((appt) => appt.id === requestId)
  if (!target || target.status !== 'pendiente') {
    return { ok: false, message: 'Esta solicitud ya no está disponible para aceptar.' }
  }

  if (
    requesterOutgoingConfirmed !== undefined &&
    isRequesterAtOutgoingLimit(requesterOutgoingConfirmed)
  ) {
    return { ok: false, message: OUTGOING_LIMIT_RECIPIENT_MESSAGE }
  }

  if (isCurrentUserConfirmedAtSlot(userAppointments, target.slotId, requestId)) {
    return { ok: false, message: SLOT_UNAVAILABLE_AGENDA }
  }

  if (
    isParticipantConfirmedAtSlot(
      target.participantId,
      target.slotId,
      userAppointments,
      requestId,
    ) ||
    isParticipantConfirmedAtSlotGlobal(
      target.participantId,
      target.slotId,
      slotOccupancy,
      requestId,
    )
  ) {
    return { ok: false, message: SLOT_UNAVAILABLE_AGENDA }
  }

  const forTables = mergeAppointmentsForValidation(userAppointments, slotOccupancy)

  if (isSlotTablesExhausted(forTables, target.slotId, requestId)) {
    return { ok: false, message: SLOT_UNAVAILABLE_TABLES }
  }

  const table = getNextAvailableTable(forTables, target.slotId, requestId)
  if (!table) {
    return { ok: false, message: SLOT_UNAVAILABLE_TABLES }
  }

  return { ok: true, table }
}

export function crossCancellationNotificationMessage(day: string, time: string): string {
  return `Una solicitud para el ${day} a las ${time} fue cancelada automáticamente por cruce de horario al confirmarse otra reunión.`
}
