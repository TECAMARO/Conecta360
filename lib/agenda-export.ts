import {
  participantById,
  type Appointment,
} from '@/lib/data'
import { EVENT, eventTimeSlots, MEETING_DURATION_MINUTES } from '@/lib/event-config'
import { filterConfirmed } from '@/lib/meetings'

export type AgendaExportRow = {
  id: string
  dateTime: string
  counterpart: string
  location: string
  sector: string
  message?: string
  slotId: string
  day: string
  time: string
  table: string
}

const SLOT_ORDER = new Map(eventTimeSlots.map((slot, index) => [slot.id, index]))

/** Strict export filter: confirmed and evaluated meetings still on the official schedule. */
export function getConfirmedMeetingsForExport(appointments: Appointment[]): Appointment[] {
  return filterConfirmed(appointments)
}

export function sortConfirmedMeetingsChronologically(
  appointments: Appointment[],
): Appointment[] {
  return getConfirmedMeetingsForExport(appointments).sort((a, b) => {
    const orderA = SLOT_ORDER.get(a.slotId) ?? Number.MAX_SAFE_INTEGER
    const orderB = SLOT_ORDER.get(b.slotId) ?? Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
}

export function buildAgendaExportRows(appointments: Appointment[]): AgendaExportRow[] {
  return sortConfirmedMeetingsChronologically(appointments)
    .map((appt) => {
      const participant = participantById(appt.participantId)
      if (!participant) return null

      return {
        id: appt.id,
        dateTime: `${appt.day}, ${appt.time}`,
        counterpart: participant.name,
        location: `📍 ${appt.table}`,
        sector: participant.sector?.trim() || '—',
        message: appt.message,
        slotId: appt.slotId,
        day: appt.day,
        time: appt.time,
        table: appt.table,
      }
    })
    .filter((row): row is AgendaExportRow => row !== null)
}

function to24Hour(hour: number, period: string): number {
  const normalized = period.toLowerCase().replace(/\./g, '')
  if (normalized === 'am' || normalized === 'a m') {
    return hour === 12 ? 0 : hour
  }
  return hour === 12 ? 12 : hour + 12
}

export function parseAppointmentDateRange(
  slotId: string,
  timeRange: string,
): { start: Date; end: Date } | null {
  const slot = eventTimeSlots.find((item) => item.id === slotId)
  if (!slot) return null

  const match = timeRange.match(
    /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)/i,
  )
  if (!match) return null

  const startHour = to24Hour(Number(match[1]), match[5])
  const endHour = to24Hour(Number(match[3]), match[5])
  const [year, month, day] = slot.dayId.split('-').map(Number)

  return {
    start: new Date(year, month - 1, day, startHour, Number(match[2]), 0),
    end: new Date(year, month - 1, day, endHour, Number(match[4]), 0),
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatIcsLocalDate(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function buildIcsEvent(row: AgendaExportRow, stamp: string): string | null {
  const range = parseAppointmentDateRange(row.slotId, row.time)
  if (!range) return null

  const tableLabel = row.table.replace(/^📍\s*/, '')
  const description = [
    'Reunión presencial — Rueda de Negocios Conecta360.',
    `Contraparte: ${row.counterpart}.`,
    `Sector / contacto: ${row.sector}.`,
    row.message ? `Propósito: ${row.message}` : '',
    `Duración: ${MEETING_DURATION_MINUTES} minutos.`,
    'Presentarse 5 minutos antes en la mesa asignada.',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'BEGIN:VEVENT',
    `UID:${row.id}@conecta360.orinoquia2026`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/Bogota:${formatIcsLocalDate(range.start)}`,
    `DTEND;TZID=America/Bogota:${formatIcsLocalDate(range.end)}`,
    `SUMMARY:${escapeIcsText(`Reunión Conecta360: ${row.counterpart}`)}`,
    `LOCATION:${escapeIcsText(`Recinto Orinoquía 2026 - ${tableLabel}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
  ].join('\r\n')
}

export function buildAgendaIcsContent(rows: AgendaExportRow[]): string {
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const events = rows
    .map((row) => buildIcsEvent(row, stamp))
    .filter((event): event is string => event !== null)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Conecta360//Agenda Orinoquia 2026//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Conecta360 - Mi Agenda Orinoquía 2026',
    'BEGIN:VTIMEZONE',
    'TZID:America/Bogota',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0500',
    'TZNAME:COT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadAgendaIcs(rows: AgendaExportRow[]): void {
  const content = buildAgendaIcsContent(rows)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'conecta360-agenda-orinoquia-2026.ics'
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatGoogleCalendarDate(date: Date): string {
  return formatIcsLocalDate(date)
}

export function buildGoogleCalendarUrl(row: AgendaExportRow): string | null {
  const range = parseAppointmentDateRange(row.slotId, row.time)
  if (!range) return null

  const tableLabel = row.table.replace(/^📍\s*/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Reunión Conecta360: ${row.counterpart}`,
    dates: `${formatGoogleCalendarDate(range.start)}/${formatGoogleCalendarDate(range.end)}`,
    location: `Recinto Orinoquía 2026 - ${tableLabel}`,
    details: [
      'Reunión presencial — Rueda de Negocios Conecta360.',
      row.message ? `Propósito: ${row.message}` : '',
      'Presentarse 5 minutos antes en la mesa asignada.',
    ]
      .filter(Boolean)
      .join('\n'),
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildOutlookCalendarUrl(row: AgendaExportRow): string | null {
  const range = parseAppointmentDateRange(row.slotId, row.time)
  if (!range) return null

  const tableLabel = row.table.replace(/^📍\s*/, '')
  const params = new URLSearchParams({
    subject: `Reunión Conecta360: ${row.counterpart}`,
    startdt: range.start.toISOString(),
    enddt: range.end.toISOString(),
    location: `Recinto Orinoquía 2026 - ${tableLabel}`,
    body: [
      'Reunión presencial — Rueda de Negocios Conecta360.',
      row.message ? `Propósito: ${row.message}` : '',
      'Presentarse 5 minutos antes en la mesa asignada.',
    ]
      .filter(Boolean)
      .join('\n'),
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
