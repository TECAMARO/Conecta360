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

export function subscribeEmailNotificationsEnabled(
  userId: string | null | undefined,
  listener: () => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  function onCustom() {
    listener()
  }

  function onStorage(event: StorageEvent) {
    if (userId && event.key === storageKey(userId)) listener()
  }

  window.addEventListener(EMAIL_NOTIFICATIONS_ENABLED_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EMAIL_NOTIFICATIONS_ENABLED_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
