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

export function meetingDayAndTimeFromSlotId(
  slotId: string,
): { day: string; timeSlot: string } | null {
  const slot = getEventSlotById(slotId)
  if (!slot) return null
  return { day: slot.dayId, timeSlot: slot.time }
}
