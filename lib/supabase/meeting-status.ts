import type { AppointmentStatus } from '@/lib/data'

/** Initial status for new meeting requests — matches DB check constraint. */
export const MEETING_DB_STATUS_PENDING = 'pendiente' as const

/** Status values that allow recipient accept/reject (must match RLS USING). */
export const PENDING_MEETING_DB_STATUSES = ['pendiente', 'pending'] as const

/** Shown when a pending request was cancelled server-side before the recipient acted. */
export const MEETING_STALE_REQUEST_MESSAGE =
  'Esta solicitud ya no está disponible o fue cancelada por la otra parte.'

/** Recipient tried to accept after the sender cancelled (dynamic company name). */
export function meetingAcceptCancelledBySenderMessage(companyName: string): string {
  return `La reunión no se concretó debido a la cancelación previa por parte de ${companyName}.`
}

/** Sender tried to cancel after the recipient confirmed (dynamic company name). */
export function meetingCancelAlreadyConfirmedMessage(companyName: string): string {
  return `No se puede cancelar la solicitud porque ${companyName} acaba de aceptar y confirmar la reunión.`
}

/** @deprecated Use meetingCancelAlreadyConfirmedMessage(companyName) */
export const MEETING_CANCEL_ALREADY_CONFIRMED_MESSAGE =
  'No se puede cancelar la solicitud porque la otra empresa acaba de aceptar y confirmar la reunión.'

const DB_TO_APP: Record<string, AppointmentStatus> = {
  pending: 'pendiente',
  pendiente: 'pendiente',
  confirmed: 'confirmada',
  confirmada: 'confirmada',
  rejected: 'rechazada',
  rechazada: 'rechazada',
  cancelled: 'cancelada_conflicto',
  canceled: 'cancelada_enviada',
  cancelada_enviada: 'cancelada_enviada',
  cancelada_conflicto: 'cancelada_conflicto',
  anulada_por_cruce: 'anulada_por_cruce',
  anulada_por_limite: 'anulada_por_limite',
  cancelada_admin: 'cancelada_admin',
  completed: 'completada',
  completada: 'completada',
}

/** DB stores Spanish status values (pendiente, confirmada, …). */
export function dbMeetingStatusToApp(status: string | null | undefined): AppointmentStatus {
  if (!status || typeof status !== 'string') return 'cancelada_conflicto'
  const normalized = status.trim().toLowerCase()
  const mapped = DB_TO_APP[normalized] ?? DB_TO_APP[status]
  if (mapped) return mapped
  // Never map unknown/cancelled DB values to pendiente — that resurrects stale cards.
  if (/cancel/i.test(status)) return 'cancelada_enviada'
  return 'cancelada_conflicto'
}

export function appMeetingStatusToDb(status: AppointmentStatus): string {
  return status
}

export const ACTIVE_MEETING_DB_STATUSES = [
  MEETING_DB_STATUS_PENDING,
  'confirmada',
  'pending',
  'confirmed',
] as const
