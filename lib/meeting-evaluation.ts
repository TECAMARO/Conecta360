import type { Appointment } from '@/lib/data'
import { parseAppointmentDateRange } from '@/lib/agenda-export'

export type MeetingAttendance = 'concretada' | 'planton' | 'cancelada_ultima_hora'

export type AllianceExpectation = 'alta' | 'media' | 'baja' | 'sin_interes'

export type MeetingEvaluation = {
  attendance: MeetingAttendance
  allianceExpectation?: AllianceExpectation
  notes?: string
  evaluatedAt: string
}

export const ATTENDANCE_OPTIONS: {
  value: MeetingAttendance
  label: string
  icon: string
}[] = [
  { value: 'concretada', label: 'Se concretó exitosamente', icon: '✅' },
  { value: 'planton', label: 'No se presentó la contraparte (Plantón)', icon: '⚠️' },
  { value: 'cancelada_ultima_hora', label: 'Cancelada a última hora', icon: '❌' },
]

export const ALLIANCE_OPTIONS: {
  value: AllianceExpectation
  label: string
}[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
  { value: 'sin_interes', label: 'Sin interés' },
]

export const attendanceLabel = (value: MeetingAttendance): string =>
  ATTENDANCE_OPTIONS.find((o) => o.value === value)?.label ?? value

export const allianceLabel = (value: AllianceExpectation): string =>
  ALLIANCE_OPTIONS.find((o) => o.value === value)?.label ?? value

export function hasMeetingEvaluation(appointment: Appointment): boolean {
  return Boolean(appointment.evaluation)
}

export function isMeetingSlotPast(appointment: Appointment, now = new Date()): boolean {
  const range = parseAppointmentDateRange(appointment.slotId, appointment.time)
  if (!range) return false
  return range.end.getTime() < now.getTime()
}

export function needsCheckInHighlight(appointment: Appointment): boolean {
  if (hasMeetingEvaluation(appointment)) return false
  return isMeetingSlotPast(appointment) || appointment.status === 'confirmada'
}

export function evaluationBadgeLabel(appointment: Appointment): string {
  if (!appointment.evaluation) return '✓ Confirmada'
  if (appointment.evaluation.attendance === 'concretada') return '✅ Evaluada'
  return '📝 Completada'
}

export function buildEvaluationSummary(appointment: Appointment): string | null {
  const evaluation = appointment.evaluation
  if (!evaluation) return null

  const parts = [attendanceLabel(evaluation.attendance)]
  if (evaluation.attendance === 'concretada' && evaluation.allianceExpectation) {
    parts.push(`Expectativa: ${allianceLabel(evaluation.allianceExpectation)}`)
  }
  return parts.join(' · ')
}

export type MeetingEvaluationInput = {
  attendance: MeetingAttendance
  allianceExpectation?: AllianceExpectation
  notes?: string
}

export function saveMeetingEvaluation(
  appointments: Appointment[],
  appointmentId: string,
  input: MeetingEvaluationInput,
): Appointment[] {
  const evaluation: MeetingEvaluation = {
    attendance: input.attendance,
    allianceExpectation:
      input.attendance === 'concretada' ? input.allianceExpectation : undefined,
    notes: input.notes?.trim() || undefined,
    evaluatedAt: new Date().toISOString(),
  }

  return appointments.map((appt) =>
    appt.id === appointmentId
      ? { ...appt, status: 'completada' as const, evaluation }
      : appt,
  )
}
