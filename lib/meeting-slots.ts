import { eventTimeSlots } from '@/lib/event-config'

export function getEventSlotById(slotId: string) {
  return eventTimeSlots.find((slot) => slot.id === slotId)
}

export function slotIdFromMeetingDayAndTime(day: string, timeSlot: string): string {
  const byIso = eventTimeSlots.find((slot) => slot.dayId === day && slot.time === timeSlot)
  if (byIso) return byIso.id
  const byLabel = eventTimeSlots.find((slot) => slot.day === day && slot.time === timeSlot)
  return byLabel?.id ?? `${day}|${timeSlot}`
}

export function resolveEventDayId(
  slotId: string,
  dayHint: string | undefined,
  timeSlot: string,
): string | null {
  const slot = getEventSlotById(slotId)
  if (slot) return slot.dayId

  if (dayHint && /^\d{4}-\d{2}-\d{2}$/.test(dayHint)) return dayHint

  if (dayHint) {
    const byLabel = eventTimeSlots.find((item) => item.day === dayHint && item.time === timeSlot)
    if (byLabel) return byLabel.dayId
  }

  if (slotId.includes('|')) {
    const [dayPart] = slotId.split('|')
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) return dayPart
    const byFallback = eventTimeSlots.find((item) => item.day === dayPart && item.time === timeSlot)
    if (byFallback) return byFallback.dayId
  }

  return null
}

export function meetingDayAndTimeFromSlotId(
  slotId: string,
): { day: string; timeSlot: string } | null {
  const slot = getEventSlotById(slotId)
  if (!slot) return null
  return { day: slot.dayId, timeSlot: slot.time }
}
