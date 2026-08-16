const STORAGE_PREFIX = 'conecta360:email-notifications-enabled'

export const EMAIL_NOTIFICATIONS_ENABLED_EVENT = 'conecta360-email-notifications-enabled'

/** Tiempo visible de la insignia «Correo habilitado» antes del fade out. */
export const EMAIL_NOTIFICATIONS_BADGE_VISIBLE_MS = 10_000

/** Duración del degradado suave al ocultar la insignia. */
export const EMAIL_NOTIFICATIONS_BADGE_FADE_MS = 600

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`
}

function enabledAtKey(userId: string): string {
  return `${storageKey(userId)}:at`
}

export function isEmailNotificationsEnabled(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return false
  }
}

function getEmailNotificationsEnabledAt(userId: string): number | null {
  try {
    const raw = localStorage.getItem(enabledAtKey(userId))
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function getRemainingEmailBadgeVisibleMs(userId: string | null | undefined): number {
  if (!userId || !isEmailNotificationsEnabled(userId)) return 0
  const enabledAt = getEmailNotificationsEnabledAt(userId)
  if (!enabledAt) return 0
  return Math.max(0, EMAIL_NOTIFICATIONS_BADGE_VISIBLE_MS - (Date.now() - enabledAt))
}

export function shouldShowEmailNotificationsBadge(userId: string | null | undefined): boolean {
  return getRemainingEmailBadgeVisibleMs(userId) > 0
}

export function markEmailNotificationsEnabled(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(userId), '1')
    localStorage.setItem(enabledAtKey(userId), String(Date.now()))
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
    if (!userId) return
    if (event.key === storageKey(userId) || event.key === enabledAtKey(userId)) listener()
  }

  window.addEventListener(EMAIL_NOTIFICATIONS_ENABLED_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EMAIL_NOTIFICATIONS_ENABLED_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}
