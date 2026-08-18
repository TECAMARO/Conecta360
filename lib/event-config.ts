/** Semana Orinoquía Sostenible y Competitiva 2026 */

export const EVENT = {
  name: 'Semana Orinoquía Sostenible y Competitiva 2026',
  shortName: 'Orinoquía 2026',
  startDate: '2026-09-21',
  endDate: '2026-09-26',
  dateRangeLabel: '21 al 26 de septiembre de 2026',
} as const

export const MEETING_DURATION_MINUTES = 20

export const SECTORS = [
  'Gobernaciones',
  'Alcaldías',
  'Entidades públicas',
  'Autoridades ambientales',
  'Academia y universidades',
  'Instituciones educativas',
  'Biodiversidad y conservación',
  'Mercados de carbono',
  'Reservas naturales',
  'Energías renovables',
  'Hidrocarburos',
  'Minería',
  'Construcción',
  'Infraestructura',
  'Sector financiero / Banca',
  'Fondos de inversión',
  'Cooperación internacional',
  'Agroindustria',
  'Turismo',
  'Cultura',
  'Deporte',
  'Tecnología e innovación',
  'Consultoría',
  'Sostenibilidad',
  'Comunicaciones y Marketing',
  'Emprendimiento',
  'Movilidad Agro',
  'Innovación Social',
  'Proyectos Sostenibles',
  'Agronegocios',
  'Energías limpias',
] as const

export type Sector = (typeof SECTORS)[number]

type DaySchedule = 'morning-afternoon' | 'afternoon-only' | 'morning-only'

export type EventDay = {
  id: string
  label: string
  shortLabel: string
  weekday: string
  schedule: DaySchedule
}

const EVENT_DAYS: EventDay[] = [
  {
    id: '2026-09-21',
    label: 'Lunes 21 de septiembre, 2026',
    shortLabel: 'Lun 21 sep',
    weekday: 'lunes',
    schedule: 'afternoon-only',
  },
  {
    id: '2026-09-22',
    label: 'Martes 22 de septiembre, 2026',
    shortLabel: 'Mar 22 sep',
    weekday: 'martes',
    schedule: 'morning-afternoon',
  },
  {
    id: '2026-09-23',
    label: 'Miércoles 23 de septiembre, 2026',
    shortLabel: 'Mié 23 sep',
    weekday: 'miércoles',
    schedule: 'morning-afternoon',
  },
  {
    id: '2026-09-24',
    label: 'Jueves 24 de septiembre, 2026',
    shortLabel: 'Jue 24 sep',
    weekday: 'jueves',
    schedule: 'morning-afternoon',
  },
  {
    id: '2026-09-25',
    label: 'Viernes 25 de septiembre, 2026',
    shortLabel: 'Vie 25 sep',
    weekday: 'viernes',
    schedule: 'morning-afternoon',
  },
  {
    id: '2026-09-26',
    label: 'Sábado 26 de septiembre, 2026',
    shortLabel: 'Sáb 26 sep',
    weekday: 'sábado',
    schedule: 'morning-only',
  },
]

const MORNING_SLOTS = [
  '10:00 - 10:20 a.m.',
  '10:20 - 10:40 a.m.',
  '10:40 - 11:00 a.m.',
  '11:00 - 11:20 a.m.',
  '11:20 - 11:40 a.m.',
  '11:40 - 12:00 p.m.',
]

const AFTERNOON_SLOTS = [
  '02:30 - 02:50 p.m.',
  '02:50 - 03:10 p.m.',
  '03:10 - 03:30 p.m.',
  '03:30 - 03:50 p.m.',
  '03:50 - 04:10 p.m.',
  '04:10 - 04:30 p.m.',
]

export type EventTimeSlot = {
  id: string
  dayId: string
  day: string
  dayLabel: string
  time: string
  period: 'mañana' | 'tarde'
  available: boolean
}

function slotsForDay(schedule: DaySchedule): string[] {
  switch (schedule) {
    case 'morning-afternoon':
      return [...MORNING_SLOTS, ...AFTERNOON_SLOTS]
    case 'afternoon-only':
      return AFTERNOON_SLOTS
    case 'morning-only':
      return MORNING_SLOTS
  }
}

function slotPeriod(time: string): 'mañana' | 'tarde' {
  if ((MORNING_SLOTS as readonly string[]).includes(time)) return 'mañana'
  return 'tarde'
}

function buildSlots(): EventTimeSlot[] {
  const slots: EventTimeSlot[] = []
  let counter = 1

  for (const day of EVENT_DAYS) {
    for (const time of slotsForDay(day.schedule)) {
      slots.push({
        id: `orinoquia-${counter++}`,
        dayId: day.id,
        day: day.shortLabel,
        dayLabel: day.label,
        time,
        period: slotPeriod(time),
        available: true,
      })
    }
  }

  return slots
}

export const eventTimeSlots = buildSlots()

export const eventScheduleSummary = [
  {
    days: 'Lunes 21 sep',
    morning: 'Sin jornada matutina',
    afternoon: '02:30 p.m. – 04:30 p.m. · 6 bloques',
  },
  {
    days: 'Martes a Viernes (22 – 25 sep)',
    morning: '10:00 a.m. – 12:00 p.m. · 6 bloques',
    afternoon: '02:30 p.m. – 04:30 p.m. · 6 bloques',
  },
  {
    days: 'Sábado 26 sep',
    morning: '10:00 a.m. – 12:00 p.m. · 6 bloques',
    afternoon: 'Sin jornada vespertina',
  },
] as const

export const eventDays = EVENT_DAYS

export type EventDayScheduleDisplay = {
  morning: string
  afternoon: string
}

export function getEventDayScheduleDisplay(day: EventDay): EventDayScheduleDisplay {
  switch (day.schedule) {
    case 'afternoon-only':
      return {
        morning: 'Sin jornada matutina',
        afternoon: '02:30 p.m. – 04:30 p.m. · 6 bloques',
      }
    case 'morning-only':
      return {
        morning: '10:00 a.m. – 12:00 p.m. · 6 bloques',
        afternoon: 'Sin jornada vespertina',
      }
    case 'morning-afternoon':
      return {
        morning: '10:00 a.m. – 12:00 p.m. · 6 bloques',
        afternoon: '02:30 p.m. – 04:30 p.m. · 6 bloques',
      }
  }
}

export function getEventDayTimeSlots(dayId: string): EventTimeSlot[] {
  return eventTimeSlots.filter((slot) => slot.dayId === dayId)
}
