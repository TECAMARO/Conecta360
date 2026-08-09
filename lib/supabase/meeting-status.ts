import type { AppointmentStatus } from '@/lib/data'

/** Initial status for new meeting requests — matches DB check constraint. */
export const MEETING_DB_STATUS_PENDING = 'pendiente' as const

const DB_TO_APP: Record<string, AppointmentStatus> = {
  pending: 'pendiente',
  pendiente: 'pendiente',
  confirmed: 'confirmada',
  confirmada: 'confirmada',
  rejected: 'rechazada',
  rechazada: 'rechazada',
  cancelled: 'cancelada_conflicto',
  cancelada_enviada: 'cancelada_enviada',
  cancelada_conflicto: 'cancelada_conflicto',
  anulada_por_cruce: 'anulada_por_cruce',
  completed: 'completada',
  completada: 'completada',
}

/** DB stores Spanish status values (pendiente, confirmada, …). */
export function dbMeetingStatusToApp(status: string): AppointmentStatus {
  return DB_TO_APP[status] ?? 'pendiente'
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
