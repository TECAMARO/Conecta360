import type { Appointment } from '@/lib/data'
import { isMeetingSlotPast } from '@/lib/meeting-evaluation'
import {
  MAX_PHYSICAL_TABLES,
  formatPhysicalTable,
  getAppointmentTableNumber,
  getReservedTableNumbers,
  isSameMeetingBlock,
  isTableReservationActive,
} from '@/lib/physical-tables'

export type TableCorrection = {
  meetingId: string
  slotId: string
  day: string
  time: string
  fromTable: number
  toTable: number
}

function blockKey(appt: Pick<Appointment, 'day' | 'time' | 'slotId'>): string {
  return `${appt.day}::${appt.time}::${appt.slotId}`
}

/** Pending duplicates lose their table; confirmadas are never moved. */
export function planPendingTableCorrections(
  appointments: Appointment[],
  now = new Date(),
): TableCorrection[] {
  const active = appointments.filter((appt) => isTableReservationActive(appt, now))
  const byBlock = new Map<string, Appointment[]>()

  for (const appt of active) {
    const key = blockKey(appt)
    const list = byBlock.get(key) ?? []
    list.push(appt)
    byBlock.set(key, list)
  }

  const corrections: TableCorrection[] = []

  for (const group of byBlock.values()) {
    const byTable = new Map<number, Appointment[]>()
    for (const appt of group) {
      const tableNum = getAppointmentTableNumber(appt)
      if (!tableNum) continue
      const list = byTable.get(tableNum) ?? []
      list.push(appt)
      byTable.set(tableNum, list)
    }

    for (const [, tableGroup] of byTable) {
      if (tableGroup.length <= 1) continue

      const sorted = [...tableGroup].sort((a, b) => {
        if (a.status === 'confirmada' && b.status !== 'confirmada') return -1
        if (b.status === 'confirmada' && a.status !== 'confirmada') return 1
        const timeDiff = a.createdAt.localeCompare(b.createdAt)
        if (timeDiff !== 0) return timeDiff
        return a.id.localeCompare(b.id)
      })

      const toReassign = sorted.slice(1).filter((appt) => appt.status === 'pendiente')
      if (toReassign.length === 0) continue

      const reserved = new Set<number>()
      for (const appt of group) {
        const num = getAppointmentTableNumber(appt)
        if (num) reserved.add(num)
      }

      for (const appt of toReassign) {
        const fromTable = getAppointmentTableNumber(appt)
        if (!fromTable) continue

        let toTable: number | null = null
        for (let n = 1; n <= MAX_PHYSICAL_TABLES; n++) {
          if (!reserved.has(n)) {
            toTable = n
            reserved.add(n)
            break
          }
        }
        if (!toTable) continue

        corrections.push({
          meetingId: appt.id,
          slotId: appt.slotId,
          day: appt.day,
          time: appt.time,
          fromTable,
          toTable,
        })
      }
    }
  }

  return corrections
}

export function applyTableCorrectionsLocally(
  appointments: Appointment[],
  corrections: TableCorrection[],
): Appointment[] {
  if (corrections.length === 0) return appointments
  const patch = new Map(corrections.map((c) => [c.meetingId, c.toTable]))
  return appointments.map((appt) => {
    const toTable = patch.get(appt.id)
    if (!toTable) return appt
    return { ...appt, table: formatPhysicalTable(toTable), tableNumber: toTable }
  })
}

/** Occupancy rows that still hold a table (pending/confirmada within the 20-min block). */
export function filterLogisticallyActiveReservations(
  appointments: Appointment[],
  now = new Date(),
): Appointment[] {
  return appointments.filter((appt) => isTableReservationActive(appt, now))
}

export function reservedTablesForBlock(
  appointments: Appointment[],
  slotId: string,
  excludeAppointmentId?: string,
  now = new Date(),
): Set<number> {
  return getReservedTableNumbers(
    filterLogisticallyActiveReservations(appointments, now),
    slotId,
    excludeAppointmentId,
  )
}

export { isSameMeetingBlock, isTableReservationActive }
