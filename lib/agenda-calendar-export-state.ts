const STORAGE_PREFIX = 'conecta360_calendar_exported_'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

export function readCalendarExportedMeetingIds(userId: string | null | undefined): Set<string> {
  if (!userId || typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
  } catch {
    return new Set()
  }
}

export function markMeetingsCalendarExported(
  userId: string | null | undefined,
  meetingIds: string[],
): void {
  if (!userId || typeof window === 'undefined' || meetingIds.length === 0) return
  const current = readCalendarExportedMeetingIds(userId)
  for (const id of meetingIds) current.add(id)
  localStorage.setItem(storageKey(userId), JSON.stringify([...current]))
}

export function filterMeetingIdsNotCalendarExported(
  userId: string | null | undefined,
  meetingIds: string[],
): string[] {
  const exported = readCalendarExportedMeetingIds(userId)
  return meetingIds.filter((id) => !exported.has(id))
}
