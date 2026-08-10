import type { Appointment } from '@/lib/data'

/** Máximo de solicitudes enviadas por el usuario que pueden quedar confirmadas. */
export const MAX_OUTGOING_CONFIRMED_MEETINGS = 8

/** Bloqueo silencioso al intentar enviar (sin contadores públicos). */
export const OUTGOING_LIMIT_SILENT_MESSAGE =
  'No puedes enviar más solicitudes de reunión en este momento.'

/** Mensaje para quien recibe/intenta aceptar una solicitud fuera de cupo. */
export const OUTGOING_LIMIT_RECIPIENT_MESSAGE =
  'Esta solicitud de reunión ya no está disponible debido a que la empresa solicitante ha alcanzado su límite máximo de agendamientos confirmados para la rueda de negocios.'

const OUTGOING_CONFIRMED_STATUSES = new Set<Appointment['status']>(['confirmada', 'completada'])

/** Citas enviadas por el usuario ya confirmadas (no incluye pendientes ni recibidas). */
export function countMyOutgoingConfirmed(userAppointments: Appointment[]): number {
  return userAppointments.filter(
    (appt) => appt.direction === 'sent' && OUTGOING_CONFIRMED_STATUSES.has(appt.status),
  ).length
}

/** Cuenta confirmadas/completadas donde `userId` es el solicitante (vista global). */
export function countOutgoingConfirmedForUser(
  meetings: Pick<Appointment, 'requesterId' | 'status'>[],
  userId: string,
): number {
  return meetings.filter(
    (appt) =>
      appt.requesterId === userId && OUTGOING_CONFIRMED_STATUSES.has(appt.status),
  ).length
}

export function isOutgoingSendBlocked(userAppointments: Appointment[]): boolean {
  return countMyOutgoingConfirmed(userAppointments) >= MAX_OUTGOING_CONFIRMED_MEETINGS
}

export function isRequesterAtOutgoingLimit(requesterOutgoingConfirmed: number): boolean {
  return requesterOutgoingConfirmed >= MAX_OUTGOING_CONFIRMED_MEETINGS
}

/** IDs de solicitudes pendientes enviadas por el usuario cuando ya alcanzó el cupo. */
export function pendingSentIdsToRebounce(
  userAppointments: Appointment[],
  userId: string,
): string[] {
  if (!isRequesterAtOutgoingLimit(countOutgoingConfirmedForUser(userAppointments, userId))) {
    return []
  }

  return userAppointments
    .filter(
      (appt) =>
        appt.requesterId === userId &&
        appt.status === 'pendiente' &&
        appt.direction === 'sent',
    )
    .map((appt) => appt.id)
}
