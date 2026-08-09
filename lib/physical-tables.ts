import type { Appointment } from '@/lib/data'
import { isMeetingSlotPast } from '@/lib/meeting-evaluation'
import { meetingDayAndTimeFromSlotId, slotIdFromMeetingDayAndTime } from '@/lib/meeting-slots'

export const MAX_PHYSICAL_TABLES = 10
export const MEETING_MODALITY = 'presencial' as const

const ACTIVE_TABLE_STATUSES = new Set<Appointment['status']>(['pendiente', 'confirmada'])

function normalizeSlotTime(time: string): string {
  return time.trim().replace(/\s+/g, ' ')
}

export function getAppointmentTableNumber(
  appt: Pick<Appointment, 'table' | 'tableNumber'>,
): number | null {
  if (
    appt.tableNumber !== undefined &&
    appt.tableNumber !== null &&
    appt.tableNumber >= 1 &&
    appt.tableNumber <= MAX_PHYSICAL_TABLES
  ) {
    return appt.tableNumber
  }
  return parsePhysicalTable(appt.table)
}

/** Table is held while pending/confirmada and the 20-min block has not ended. */
export function isTableReservationActive(appt: Appointment, now = new Date()): boolean {
  if (!ACTIVE_TABLE_STATUSES.has(appt.status)) return false
  return !isMeetingSlotPast(appt, now)
}

/** Same calendar block even if slotId strings differ (legacy day formats). */
export function isSameMeetingBlock(
  appt: Pick<Appointment, 'slotId' | 'day' | 'time'>,
  slotId: string,
): boolean {
  if (appt.slotId === slotId) return true

  const target = meetingDayAndTimeFromSlotId(slotId)
  if (!target) return false

  const apptTime = normalizeSlotTime(appt.time)
  const targetTime = normalizeSlotTime(target.timeSlot)

  if (apptTime === targetTime) {
    if (appt.day === target.day) return true
    if (slotIdFromMeetingDayAndTime(appt.day, appt.time) === slotId) return true
  }

  return false
}

/** Formats table index as "Mesa 01" … "Mesa 10". */
export function formatPhysicalTable(tableNumber: number): string {
  return `Mesa ${String(tableNumber).padStart(2, '0')}`
}

export function parsePhysicalTable(table: string): number | null {
  const match = table.match(/Mesa\s+(\d{1,2})/i)
  if (!match) return null
  const n = Number(match[1])
  if (n < 1 || n > MAX_PHYSICAL_TABLES) return null
  return n
}

/** Tables reserved in a specific time block (pending + confirmed, within logistics window). */
export function getReservedTableNumbers(
  appointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
  now = new Date(),
): Set<number> {
  const reserved = new Set<number>()
  for (const appt of appointments) {
    if (appt.id === excludeAppointmentId) continue
    if (!isTableReservationActive(appt, now)) continue
    if (!isSameMeetingBlock(appt, slotId)) continue
    const num = getAppointmentTableNumber(appt)
    if (num) reserved.add(num)
  }
  return reserved
}

export function isSlotTablesExhausted(
  appointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
): boolean {
  return (
    getReservedTableNumbers(appointments, slotId, excludeAppointmentId).size >=
    MAX_PHYSICAL_TABLES
  )
}

/** First free Mesa 01–10 for the given block, or null if full. */
export function getNextAvailableTable(
  appointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
): string | null {
  const reserved = getReservedTableNumbers(appointments, slotId, excludeAppointmentId)
  for (let n = 1; n <= MAX_PHYSICAL_TABLES; n++) {
    if (!reserved.has(n)) return formatPhysicalTable(n)
  }
  return null
}

export function normalizePhysicalTable(table: string): string {
  const parsed = parsePhysicalTable(table)
  return parsed ? formatPhysicalTable(parsed) : table
}

/** Mesa 01 … Mesa 10 — pool logístico del evento. */
export const PHYSICAL_TABLE_LIST: readonly string[] = Array.from(
  { length: MAX_PHYSICAL_TABLES },
  (_, index) => formatPhysicalTable(index + 1),
)

export function getAvailableTablesForBlock(
  appointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
): string[] {
  const reserved = getReservedTableNumbers(appointments, slotId, excludeAppointmentId)
  return PHYSICAL_TABLE_LIST.filter((_, index) => !reserved.has(index + 1))
}

export function mergeAppointmentsForValidation(
  userAppointments: Appointment[],
  slotOccupancy: Appointment[],
): Appointment[] {
  const byId = new Map<string, Appointment>()
  for (const appt of slotOccupancy) byId.set(appt.id, appt)
  for (const appt of userAppointments) byId.set(appt.id, appt)
  return Array.from(byId.values())
}
