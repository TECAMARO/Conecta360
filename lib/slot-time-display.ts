const SLOT_TIME_PATTERN =
  /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(a\.m\.|p\.m\.)$/i

function inferStartPeriod(startHour: number, endPeriod: 'a.m.' | 'p.m.'): 'a.m.' | 'p.m.' {
  if (endPeriod === 'a.m.') return 'a.m.'
  // Tarde: bloques 02:xx–04:xx; transición matutina 11:xx → 12:00 p.m.
  if (startHour >= 2 && startHour <= 4) return 'p.m.'
  return 'a.m.'
}

/** Parsea el valor canónico almacenado (sin alterar el string de BD). */
export function parseSlotTimeRange(
  slotTime: string,
): { start: string; end: string } | null {
  const match = slotTime.trim().match(SLOT_TIME_PATTERN)
  if (!match) return null

  const startClock = match[1]
  const endClock = match[2]
  const endPeriod = match[3].toLowerCase() as 'a.m.' | 'p.m.'
  const startHour = Number(startClock.split(':')[0])
  const startPeriod = inferStartPeriod(startHour, endPeriod)

  return {
    start: `${startClock} ${startPeriod}`,
    end: `${endClock} ${endPeriod}`,
  }
}

/** Una línea: «10:00 a.m. – 10:20 a.m.» (solo presentación). */
export function formatSlotTimeDisplay(slotTime: string): string {
  const parts = parseSlotTimeRange(slotTime)
  if (!parts) return slotTime
  return `${parts.start} – ${parts.end}`
}

/** Dos líneas para cuadros compactos: inicio con guión, fin abajo. */
export function formatSlotTimeLines(slotTime: string): {
  startLine: string
  endLine: string
} {
  const parts = parseSlotTimeRange(slotTime)
  if (!parts) {
    return { startLine: slotTime, endLine: '' }
  }
  return {
    startLine: `${parts.start} –`,
    endLine: parts.end,
  }
}
