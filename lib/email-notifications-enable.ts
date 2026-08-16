const STORAGE_PREFIX = 'conecta360:email-notifications-enabled'

export const EMAIL_NOTIFICATIONS_ENABLED_EVENT = 'conecta360-email-notifications-enabled'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

export function isEmailNotificationsEnabled(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markEmailNotificationsEnabled(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(userId), '1')
    window.dispatchEvent(new Event(EMAIL_NOTIFICATIONS_ENABLED_EVENT))
  } catch {
    /* ignore quota */
  }
}
