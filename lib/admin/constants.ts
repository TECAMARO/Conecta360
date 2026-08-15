import { eventTimeSlots } from '@/lib/event-config'
import { MAX_PHYSICAL_TABLES } from '@/lib/physical-tables'
import { MAX_OUTGOING_CONFIRMED_MEETINGS } from '@/lib/meeting-outgoing-limit'

/** Capacidad logística: 60 bloques horarios × 6 mesas B2B. */
export const MAX_MEETING_CAPACITY = eventTimeSlots.length * MAX_PHYSICAL_TABLES

/** Límite operativo de organizaciones participantes. */
export const MAX_REGISTERED_ORGANIZATIONS = 45

export const MAX_MEETINGS_PER_ORGANIZATION = MAX_OUTGOING_CONFIRMED_MEETINGS

export const TOTAL_TIME_BLOCKS = eventTimeSlots.length

export const EVENT_DAY_OPTIONS = [
  { id: 'all', label: 'Todos los días' },
  { id: '2026-09-21', label: 'Lunes 21 sep' },
  { id: '2026-09-22', label: 'Martes 22 sep' },
  { id: '2026-09-23', label: 'Miércoles 23 sep' },
  { id: '2026-09-24', label: 'Jueves 24 sep' },
  { id: '2026-09-25', label: 'Viernes 25 sep' },
  { id: '2026-09-26', label: 'Sábado 26 sep' },
] as const

export const TABLE_OPTIONS = [
  { id: 'all', label: 'Todas las mesas' },
  ...Array.from({ length: MAX_PHYSICAL_TABLES }, (_, i) => ({
    id: String(i + 1),
    label: `Mesa ${String(i + 1).padStart(2, '0')}`,
  })),
]
